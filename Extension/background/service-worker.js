/**
 * StreamHelper Background Service Worker
 * 
 * This service worker runs in the background and intercepts all network requests
 * to capture m3u8 streaming URLs. It maintains a list of captured requests
 * and provides them to the popup interface.
 * 
 * NEW: Now includes WebSocket communication with StreamHelper desktop app
 */

// Storage key for captured m3u8 requests
const STORAGE_KEY = 'captured_m3u8_requests';

// Storage key for current active tab
const ACTIVE_TAB_KEY = 'active_tab_id';

// Storage key for request ID mapping (for better size matching)
const REQUEST_ID_MAP_KEY = 'm3u8_request_id_map';

// WebSocket connection to StreamHelper desktop app
const WEBSOCKET_CONFIG = {
  url: 'ws://localhost:8080',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10
};

let websocket = null;
let reconnectAttempts = 0;
let isConnected = false;

// Maximum number of requests to store (to prevent memory issues)
const MAX_REQUESTS = 1000;

/**
 * Initialize the service worker and set up event listeners
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('StreamHelper extension installed');
  // Initialize storage with empty array
  chrome.storage.local.set({ [STORAGE_KEY]: [] });
  
  // Don't auto-connect - let user manually connect
  console.log('WebSocket auto-connection disabled. User must manually connect.');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'CONNECT_WEBSOCKET':
      console.log('🔄 Manual WebSocket connection requested');
      initializeWebSocket();
      sendResponse({ success: true, message: 'Connection initiated' });
      break;
      
    case 'DISCONNECT_WEBSOCKET':
      console.log('🔌 Manual WebSocket disconnection requested');
      disconnectWebSocket();
      sendResponse({ success: true, message: 'Disconnection initiated' });
      break;
      
    case 'GET_WEBSOCKET_STATUS':
      sendResponse({ 
        connected: isConnected, 
        websocket: websocket ? websocket.readyState : null 
      });
      break;
      
    default:
      // Handle other message types if needed
      break;
  }
  
  return true; // Keep message channel open for async response
});

/**
 * Handle incoming WebSocket messages from StreamHelper desktop app
 * @param {Object} message - The received message
 */
function handleWebSocketMessage(message) {
  console.log('📥 WebSocket message received:', message.type);
  
  switch (message.type) {
    case 'STREAM_ENQUEUED':
      console.log('✅ Stream enqueued for download:', message.data);
      // Could show notification to user
      break;
      
    case 'DOWNLOAD_PROGRESS':
      console.log('📊 Download progress update:', message.data);
      // Could update UI with download progress
      break;
      
    case 'DOWNLOAD_COMPLETED':
      console.log('🎉 Download completed:', message.data);
      // Could show success notification
      break;
      
    case 'DOWNLOAD_FAILED':
      console.log('❌ Download failed:', message.data);
      // Could show error notification
      break;
      
    case 'ERROR':
      console.error('❌ Error from StreamHelper app:', message.data);
      break;
      
    default:
      console.log('⚠️ Unknown WebSocket message type:', message.type);
  }
}

/**
 * Send message to StreamHelper desktop app via WebSocket
 * @param {Object} message - The message to send
 * @returns {boolean} Whether message was sent successfully
 */
function sendWebSocketMessage(message) {
  if (websocket && isConnected && websocket.readyState === WebSocket.OPEN) {
    try {
      websocket.send(JSON.stringify(message));
      console.log('📤 WebSocket message sent:', message.type);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  } else {
    console.log('⚠️ WebSocket not connected, message not sent:', message.type);
    return false;
  }
}

/**
 * Initialize WebSocket connection to StreamHelper desktop app
 */
function initializeWebSocket() {
  try {
    websocket = new WebSocket(WEBSOCKET_CONFIG.url);
    
    websocket.onopen = () => {
      console.log('✅ WebSocket connected to StreamHelper desktop app');
      isConnected = true;
      reconnectAttempts = 0;
      
      // Notify popup about connection status
      notifyPopupAboutConnection(true);
      
      // Send connection established message
      sendWebSocketMessage({
        type: 'CONNECTION_ESTABLISHED',
        data: { 
          message: 'Chrome extension connected',
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
      });
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onclose = (event) => {
      console.log('❌ WebSocket disconnected from StreamHelper desktop app:', event.code, event.reason);
      isConnected = false;
      
      // Don't auto-reconnect - let user manually reconnect
      console.log('🔄 Auto-reconnection disabled. User must manually reconnect.');
      
      // Notify popup about disconnection
      notifyPopupAboutConnection(false);
    };
    
    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      isConnected = false;
    };
    
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
  }
}

/**
 * Manually disconnect WebSocket connection
 */
function disconnectWebSocket() {
  if (websocket) {
    console.log('🔌 Manually disconnecting WebSocket...');
    websocket.close(1000, 'Manual disconnect');
    websocket = null;
    isConnected = false;
    reconnectAttempts = 0;
    
    // Notify popup about disconnection
    notifyPopupAboutConnection(false);
  }
}

// Add a delay before initial connection attempt
setTimeout(() => {
  console.log('🔄 Delayed WebSocket connection attempt...');
  initializeWebSocket();
}, 2000); // Wait 2 seconds for desktop app to be ready

/**
 * Notify popup about connection status change
 * @param {boolean} connected - Whether connected to StreamHelper
 */
function notifyPopupAboutConnection(connected) {
  const messageType = connected ? 'WEBSOCKET_CONNECTED' : 'WEBSOCKET_DISCONNECTED';
  chrome.runtime.sendMessage({
    type: messageType,
    data: { connected }
  }).catch(() => {
    // Ignore errors when no listeners are available
  });
}

/**
 * Track active tab changes
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // Store the new active tab ID
    await chrome.storage.local.set({ [ACTIVE_TAB_KEY]: activeInfo.tabId });
    
    // Notify popup about tab change
    notifyPopupAboutTabChange(activeInfo.tabId);
    
    console.log('Active tab changed to:', activeInfo.tabId);
  } catch (error) {
    console.error('Error tracking active tab:', error);
  }
});

/**
 * Track tab updates (for when tabs are refreshed or navigated)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    try {
      // Update active tab ID when current tab is updated
      await chrome.storage.local.set({ [ACTIVE_TAB_KEY]: tabId });
      
      // Notify popup about tab change
      notifyPopupAboutTabChange(tabId);
      
      console.log('Active tab updated:', tabId);
    } catch (error) {
      console.error('Error updating active tab:', error);
    }
  }
});

/**
 * Intercept all web requests to capture m3u8 URLs
 * This is the core functionality that monitors network traffic
 * We capture both the request and headers in one place to avoid racing conditions
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Check if the request URL contains m3u8
    if (details.url && details.url.includes('.m3u8')) {
      captureM3U8RequestWithHeaders(details);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// /**
//  * Fallback listener for requests that might not have headers
//  * This ensures we don't miss any m3u8 requests
//  */
// chrome.webRequest.onBeforeRequest.addListener(
//   (details) => {
//     // Check if the request URL contains m3u8
//     if (details.url && details.url.includes('.m3u8')) {
//       // Only capture if we haven't already captured it with headers
//       // This prevents duplicate captures
//       captureM3U8RequestFallback(details);
//     }
//   },
//   { urls: ["<all_urls>"] },
//   ["requestBody"]
// );

/**
 * Intercept response headers to capture content length
 */
chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    // Check if the request URL contains m3u8
    if (details.url && details.url.includes('.m3u8')) {
      updateM3U8RequestSize(details);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

/**
 * Capture m3u8 request details and store them
 * @param {Object} details - Request details from Chrome webRequest API
 */
async function captureM3U8RequestWithHeaders(details) {
  try {
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Get current tab for context
    const tab = await chrome.tabs.get(details.tabId);
    
    // Create request object with relevant information
    const requestData = {
      id: generateUniqueId(),
      url: details.url,
      timestamp: timestamp,
      method: details.method,
      type: details.type,
      tabId: details.tabId,
      frameId: details.frameId,
      requestId: details.requestId,
      pageTitle: tab.title,
      pageUrl: tab.url,
      // Headers are captured immediately, no racing condition
      requestHeaders: details.requestHeaders ? details.requestHeaders
        .filter(header => {
          // Include important headers for download consistency
          const importantHeaders = [
            'accept', 'accept-encoding', 'accept-language', 'cache-control',
            'connection', 'dnt', 'pragma', 'referer', 'sec-ch-ua',
            'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-fetch-dest',
            'sec-fetch-mode', 'sec-fetch-site', 'upgrade-insecure-requests',
            'user-agent', 'x-requested-with', 'origin', 'authorization',
            'cookie', 'x-csrf-token', 'x-xsrf-token'
          ];
          
          return importantHeaders.includes(header.name.toLowerCase());
        })
        .map(header => ({
          name: header.name.toLowerCase(),
          value: header.value
        })) : [],
      userAgent: await getUserAgent(details.tabId),
      cookies: await getCookiesForDomain(details.url),
      sessionStorage: await getSessionData(details.tabId)
    };
    
    // Store the captured request
    await storeM3U8Request(requestData);
    
    // Store request ID mapping for better size matching
    await storeRequestIdMapping(details.requestId, requestData.id, requestData.url);
    
    // Notify any listening popups about the new request
    notifyPopupAboutNewRequest(requestData);
    
    // Log successful header capture
    console.log('✅ Captured m3u8 request with headers:', {
      url: details.url,
      headerCount: requestData.requestHeaders.length,
      headers: requestData.requestHeaders.map(h => h.name)
    });
    
  } catch (error) {
    console.error('Error capturing m3u8 request with headers:', error);
  }
}

// /**
//  * Fallback function for capturing m3u8 requests without headers
//  * This prevents duplicate captures and ensures we don't miss any requests
//  * @param {Object} details - Request details from Chrome webRequest API
//  */
// async function captureM3U8RequestFallback(details) {
//   try {
//     // Check if we already captured this request with headers
//     const result = await chrome.storage.local.get([STORAGE_KEY]);
//     const requests = result[STORAGE_KEY] || [];
    
//     // Check if this URL was already captured recently (within 5 seconds)
//     const existingRequest = requests.find(req => 
//       req.url === details.url && 
//       (Date.now() - new Date(req.timestamp).getTime()) < 5000
//     );
    
//     if (existingRequest) {
//       // Request already captured with headers, skip
//       console.log('⏭️ Skipping duplicate request capture (already captured with headers):', details.url);
//       return;
//     }
    
//     // If no existing request, capture it without headers
//     console.log('⚠️ Capturing m3u8 request without headers (fallback):', details.url);
    
//     const timestamp = new Date().toISOString();
//     const tab = await chrome.tabs.get(details.tabId);
    
//     const requestData = {
//       id: generateUniqueId(),
//       url: details.url,
//       timestamp: timestamp,
//       method: details.method,
//       type: details.type,
//       tabId: details.tabId,
//       frameId: details.frameId,
//       requestId: details.requestId,
//       pageTitle: tab.title,
//       pageUrl: tab.url,
//       requestHeaders: [], // No headers available
//       userAgent: await getUserAgent(details.tabId),
//       cookies: await getCookiesForDomain(details.url),
//       sessionStorage: await getSessionData(details.tabId)
//     };
    
//     await storeM3U8Request(requestData);
//     await storeRequestIdMapping(details.requestId, requestData.id, details.url);
//     notifyPopupAboutNewRequest(requestData);
    
//   } catch (error) {
//     console.error('Error in fallback m3u8 request capture:', error);
//   }
// }

/**
 * Store m3u8 request in Chrome storage
 * @param {Object} requestData - The request data to store
 */
async function storeM3U8Request(requestData) {
  try {
    // Get existing requests
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    let requests = result[STORAGE_KEY] || [];
    
    // Add new request to the beginning (most recent first)
    requests.unshift(requestData);
    
    // Limit the number of stored requests
    if (requests.length > MAX_REQUESTS) {
      requests = requests.slice(0, MAX_REQUESTS);
    }
    
    // Store updated requests
    await chrome.storage.local.set({ [STORAGE_KEY]: requests });
    
  } catch (error) {
    console.error('Error storing m3u8 request:', error);
  }
}

/**
 * Generate a unique ID for each request
 * @returns {string} Unique identifier
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Helper function to get user agent from the page
 * @param {number} tabId - The tab ID to get user agent from
 * @returns {Promise<string>} The user agent string
 */
async function getUserAgent(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => navigator.userAgent
    });
    return result;
  } catch (error) {
    // Fallback to a realistic user agent if we can't get it from the page
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }
}

/**
 * Helper function to get cookies for the domain
 * @param {string} url - The URL to get cookies for
 * @returns {Promise<string>} Semicolon-separated cookie string
 */
async function getCookiesForDomain(url) {
  try {
    const urlObj = new URL(url);
    const cookies = await chrome.cookies.getAll({ domain: urlObj.hostname });
    return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  } catch (error) {
    return '';
  }
}

/**
 * Helper function to get session data from the page
 * @param {number} tabId - The tab ID to get session data from
 * @returns {Promise<Object>} Session storage data
 */
async function getSessionData(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const sessionData = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            sessionData[key] = sessionStorage.getItem(key);
          }
        }
        return sessionData;
      }
    });
    return result;
  } catch (error) {
    return {};
  }
}

/**
 * Store request ID mapping for better size matching
 * @param {string} chromeRequestId - Chrome's internal request ID
 * @param {string} ourRequestId - Our generated request ID
 * @param {string} url - The request URL
 */
async function storeRequestIdMapping(chromeRequestId, ourRequestId, url) {
  try {
    const result = await chrome.storage.local.get([REQUEST_ID_MAP_KEY]);
    let requestMap = result[REQUEST_ID_MAP_KEY] || {};
    
    // Store the mapping with timestamp
    requestMap[chromeRequestId] = {
      ourRequestId: ourRequestId,
      url: url,
      timestamp: Date.now()
    };
    
    // Clean up old mappings (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 600000;
    Object.keys(requestMap).forEach(key => {
      if (requestMap[key].timestamp < tenMinutesAgo) {
        delete requestMap[key];
      }
    });
    
    await chrome.storage.local.set({ [REQUEST_ID_MAP_KEY]: requestMap });
  } catch (error) {
    console.error('Error storing request ID mapping:', error);
  }
}

/**
 * Notify popup about new captured request
 * @param {Object} requestData - The newly captured request data
 */
function notifyPopupAboutNewRequest(requestData) {
  // Broadcast message to all extension views (popup, content scripts)
  chrome.runtime.sendMessage({
    type: 'NEW_M3U8_REQUEST',
    data: requestData
  }).catch(() => {
    // Ignore errors when no listeners are available
  });
}

/**
 * Notify popup about tab change
 * @param {number} tabId - The new active tab ID
 */
function notifyPopupAboutTabChange(tabId) {
  // Broadcast message to all extension views about tab change
  chrome.runtime.sendMessage({
    type: 'TAB_CHANGED',
    data: { tabId: tabId }
  }).catch(() => {
    // Ignore errors when no listeners are available
  });
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_M3U8_REQUESTS':
      // Return all captured requests
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        sendResponse({ requests: result[STORAGE_KEY] || [] });
      });
      return true; // Indicates async response
      
    case 'GET_M3U8_REQUESTS_BY_TAB':
      // Return requests filtered by tab ID
      getRequestsByTabId(message.tabId, sendResponse);
      return true; // Indicates async response
      
    case 'CLEAR_M3U8_REQUESTS':
      // Clear all stored requests
      chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'DELETE_M3U8_REQUEST':
      // Delete specific request by ID
      deleteM3U8Request(message.requestId, sendResponse);
      return true;
      
    case 'DOWNLOAD_TO_STREAMHELPER':
      // Forward download request to StreamHelper desktop app
      downloadToStreamHelper(message.data, sendResponse);
      return true;
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

/**
 * Update m3u8 request with size information from response headers
 * @param {Object} details - Response details from Chrome webRequest API
 */
async function updateM3U8RequestSize(details) {
  try {
    // Extract content length from response headers
    let contentLength = 0;
    if (details.responseHeaders) {
      const contentLengthHeader = details.responseHeaders.find(
        header => header.name.toLowerCase() === 'content-length'
      );
      if (contentLengthHeader && contentLengthHeader.value) {
        contentLength = parseInt(contentLengthHeader.value, 10);
      }
    }
    
    // Get existing requests
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    let requests = result[STORAGE_KEY] || [];
    
    // Try multiple matching strategies with fallbacks
    let requestIndex = -1;
    
    // Strategy 0: Use Chrome's request ID mapping (most reliable)
    try {
      const mapResult = await chrome.storage.local.get([REQUEST_ID_MAP_KEY]);
      const requestMap = mapResult[REQUEST_ID_MAP_KEY] || {};
      
      if (requestMap[details.requestId]) {
        const mapping = requestMap[details.requestId];
        requestIndex = requests.findIndex(req => req.id === mapping.ourRequestId);
        
        if (requestIndex !== -1) {
          // console.log(`✅ Size update: Found request via ID mapping for: ${details.url}`);
        }
      }
    } catch (e) {
      // ID mapping failed, continue to other strategies
    }
    
    // Strategy 1: Exact URL match with extended time window (30 seconds)
    if (requestIndex === -1) {
      requestIndex = requests.findIndex(req => 
        req.url === details.url && 
        (Date.now() - new Date(req.timestamp).getTime()) < 30000
      );
    }
    
    // Strategy 2: If not found, try URL without query parameters
    if (requestIndex === -1) {
      try {
        const urlObj = new URL(details.url);
        const urlWithoutParams = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
        
        requestIndex = requests.findIndex(req => {
          try {
            const reqUrlObj = new URL(req.url);
            const reqUrlWithoutParams = `${reqUrlObj.protocol}//${reqUrlObj.host}${reqUrlObj.pathname}`;
            return reqUrlWithoutParams === urlWithoutParams && 
                   (Date.now() - new Date(req.timestamp).getTime()) < 60000; // 1 minute window
          } catch (e) {
            return false;
          }
        });
      } catch (e) {
        // URL parsing failed, continue to next strategy
      }
    }
    
    // Strategy 3: If still not found, try fuzzy matching by hostname and path
    if (requestIndex === -1) {
      try {
        const urlObj = new URL(details.url);
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;
        
        requestIndex = requests.findIndex(req => {
          try {
            const reqUrlObj = new URL(req.url);
            return reqUrlObj.hostname === hostname && 
                   reqUrlObj.pathname === pathname &&
                   (Date.now() - new Date(req.timestamp).getTime()) < 120000; // 2 minute window
          } catch (e) {
            return false;
          }
        });
      } catch (e) {
        // URL parsing failed, continue to next strategy
      }
    }
    
    // Strategy 4: Last resort - find any request with same hostname in last 5 minutes
    if (requestIndex === -1) {
      try {
        const urlObj = new URL(details.url);
        const hostname = urlObj.hostname;
        
        requestIndex = requests.findIndex(req => {
          try {
            const reqUrlObj = new URL(req.url);
            return reqUrlObj.hostname === hostname && 
                   (Date.now() - new Date(req.timestamp).getTime()) < 300000; // 5 minute window
          } catch (e) {
            return false;
          }
        });
      } catch (e) {
        // URL parsing failed
      }
    }
    
    if (requestIndex !== -1) {
      requests[requestIndex].size = contentLength;
      requests[requestIndex].sizeFormatted = formatFileSize(contentLength);
      
      // Store updated requests
      await chrome.storage.local.set({ [STORAGE_KEY]: requests });
      
      // Notify popup about size update
      chrome.runtime.sendMessage({
        type: 'M3U8_REQUEST_SIZE_UPDATE',
        data: {
          id: requests[requestIndex].id,
          size: contentLength,
          sizeFormatted: formatFileSize(contentLength)
        }
      }).catch(() => {
        // Ignore errors when no listeners are available
      });
    }
    
  } catch (error) {
    console.error('Error updating m3u8 request size:', error);
  }
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean up request ID mappings for a deleted request
 * @param {string} requestId - The ID of the deleted request
 */
async function cleanupRequestIdMappings(requestId) {
  try {
    const result = await chrome.storage.local.get([REQUEST_ID_MAP_KEY]);
    let requestMap = result[REQUEST_ID_MAP_KEY] || {};
    
    // Remove mappings that reference the deleted request
    Object.keys(requestMap).forEach(key => {
      if (requestMap[key].ourRequestId === requestId) {
        delete requestMap[key];
      }
    });
    
    await chrome.storage.local.set({ [REQUEST_ID_MAP_KEY]: requestMap });
  } catch (error) {
    console.error('Error cleaning up request ID mappings:', error);
  }
}

/**
 * Get m3u8 requests filtered by tab ID
 * @param {number} tabId - The tab ID to filter by
 * @param {Function} sendResponse - Callback to send response
 */
async function getRequestsByTabId(tabId, sendResponse) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    let requests = result[STORAGE_KEY] || [];
    
    // Filter requests by tab ID
    const filteredRequests = requests.filter(req => req.tabId === tabId);
    
    sendResponse({ requests: filteredRequests });
  } catch (error) {
    console.error('Error getting requests by tab ID:', error);
    sendResponse({ requests: [], error: error.message });
  }
}

/**
 * Download stream to StreamHelper desktop app
 * @param {Object} streamData - Stream data to send to StreamHelper
 * @param {Function} sendResponse - Callback to send response
 */
async function downloadToStreamHelper(streamData, sendResponse) {
  try {
    if (!isConnected || !websocket) {
      sendResponse({ success: false, error: 'Not connected to StreamHelper desktop app' });
      return;
    }

    // Log what we're sending to StreamHelper
    console.log('📤 Sending to StreamHelper:', {
      url: streamData.url,
      pageTitle: streamData.pageTitle,
      headerCount: streamData.requestHeaders ? streamData.requestHeaders.length : 0,
      hasHeaders: !!streamData.requestHeaders && streamData.requestHeaders.length > 0
    });
    
    // Send stream capture message to StreamHelper
    const success = sendWebSocketMessage({
      type: 'STREAM_CAPTURED',
      data: streamData
    });

    if (success) {
      sendResponse({ success: true, message: 'Stream sent to StreamHelper' });
    } else {
      sendResponse({ success: false, error: 'Failed to send to StreamHelper' });
    }
  } catch (error) {
    console.error('Error downloading to StreamHelper:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Delete a specific m3u8 request by ID
 * @param {string} requestId - ID of the request to delete
 * @param {Function} sendResponse - Callback to send response
 */
async function deleteM3U8Request(requestId, sendResponse) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    let requests = result[STORAGE_KEY] || [];
    
    // Filter out the request with matching ID
    requests = requests.filter(req => req.id !== requestId);
    
    // Store updated requests
    await chrome.storage.local.set({ [STORAGE_KEY]: requests });
    
    // Clean up request ID mappings for this request
    await cleanupRequestIdMappings(requestId);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error deleting m3u8 request:', error);
    sendResponse({ success: false, error: error.message });
  }
}
