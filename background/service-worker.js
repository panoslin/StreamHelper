/**
 * StreamHelper Background Service Worker
 * 
 * This service worker runs in the background and intercepts all network requests
 * to capture m3u8 streaming URLs. It maintains a list of captured requests
 * and provides them to the popup interface.
 */

// Storage key for captured m3u8 requests
const STORAGE_KEY = 'captured_m3u8_requests';

// Maximum number of requests to store (to prevent memory issues)
const MAX_REQUESTS = 1000;

/**
 * Initialize the service worker and set up event listeners
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('StreamHelper extension installed');
  // Initialize storage with empty array
  chrome.storage.local.set({ [STORAGE_KEY]: [] });
});

/**
 * Intercept all web requests to capture m3u8 URLs
 * This is the core functionality that monitors network traffic
 */
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Check if the request URL contains m3u8
    if (details.url && details.url.includes('.m3u8')) {
      captureM3U8Request(details);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

/**
 * Capture m3u8 request details and store them
 * @param {Object} details - Request details from Chrome webRequest API
 */
async function captureM3U8Request(details) {
  try {
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Create request object with relevant information
    const requestData = {
      id: generateUniqueId(),
      url: details.url,
      timestamp: timestamp,
      method: details.method,
      type: details.type,
      tabId: details.tabId,
      frameId: details.frameId,
      requestId: details.requestId
    };
    
    // Get tab information for context
    try {
      const tab = await chrome.tabs.get(details.tabId);
      requestData.pageTitle = tab.title;
      requestData.pageUrl = tab.url;
    } catch (error) {
      // Tab might not exist anymore, continue without tab info
      requestData.pageTitle = 'Unknown';
      requestData.pageUrl = 'Unknown';
    }
    
    // Store the captured request
    await storeM3U8Request(requestData);
    
    // Notify any listening popups about the new request
    notifyPopupAboutNewRequest(requestData);
    
  } catch (error) {
    console.error('Error capturing m3u8 request:', error);
  }
}

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
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

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
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error deleting m3u8 request:', error);
    sendResponse({ success: false, error: error.message });
  }
}
