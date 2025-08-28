/**
 * StreamHelper Content Script
 * 
 * This script runs in the context of web pages and provides additional
 * information about the page where m3u8 requests are captured.
 * It also listens for new requests to update the popup in real-time.
 */

/**
 * Initialize the content script
 */
(function() {
  'use strict';
  
  console.log('StreamHelper content script loaded');
  
  // Listen for messages from the background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_M3U8_REQUEST') {
      // Update the popup if it's open
      updatePopupIfOpen(message.data);
    }
  });
  
  // Send page information to background script for context
  sendPageInfo();
  
})();

/**
 * Send current page information to the background script
 * This helps provide context for captured m3u8 requests
 */
function sendPageInfo() {
  try {
    const pageInfo = {
      type: 'PAGE_INFO',
      data: {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      }
    };
    
    chrome.runtime.sendMessage(pageInfo).catch(() => {
      // Ignore errors when background script is not available
    });
    
  } catch (error) {
    console.error('Error sending page info:', error);
  }
}

/**
 * Update popup if it's currently open
 * @param {Object} requestData - The newly captured request data
 */
function updatePopupIfOpen(requestData) {
  // This function can be used to update the popup in real-time
  // when new m3u8 requests are captured
  // For now, the popup will refresh its data when focused
  
  // Dispatch a custom event that the popup can listen to
  window.dispatchEvent(new CustomEvent('streamhelper-new-request', {
    detail: requestData
  }));
}

/**
 * Listen for page visibility changes to update context
 */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page became visible, update page info
    sendPageInfo();
  }
});

/**
 * Listen for page load events to update context
 */
window.addEventListener('load', () => {
  sendPageInfo();
});

/**
 * Listen for navigation events (for SPA support)
 */
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    // URL changed, update page info
    setTimeout(sendPageInfo, 100); // Small delay to ensure page is loaded
  }
});

// Start observing DOM changes for SPA navigation
observer.observe(document.body, {
  childList: true,
  subtree: true
});
