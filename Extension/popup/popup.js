/**
 * StreamHelper Popup JavaScript
 * 
 * This file handles all the popup functionality including:
 * - Loading and displaying captured m3u8 requests
 * - Search and filtering
 * - Copy URL functionality
 * - Delete requests
 * - Real-time updates
 */

class StreamHelperPopup {
  constructor() {
    this.requests = [];
    this.filteredRequests = [];
    this.isLoading = false;
    this.viewMode = 'currentTab'; // 'currentTab' or 'allRequests'
    
    // Initialize the popup
    this.init();
  }

  /**
   * Initialize the popup and set up event listeners
   */
  async init() {
    this.setupEventListeners();
    await this.loadCurrentTabRequests();
    await this.getConnectionStatus();
    this.updateStatus('Ready');
    this.updateViewModeToggle();
  }

  /**
   * Set up all event listeners for user interactions
   */
  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshRequests();
    });

    // Clear all button
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearAllRequests();
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Clear search button
    document.getElementById('clearSearchBtn').addEventListener('click', () => {
      this.clearSearch();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportRequests();
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // View mode toggle button
    document.getElementById('viewModeToggle').addEventListener('click', () => {
      this.toggleViewMode();
    });

    // Connect button
    document.getElementById('connectBtn').addEventListener('click', () => {
      this.toggleConnection();
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('message: ', message);
      if (message.type === 'NEW_M3U8_REQUEST') {
        this.handleNewRequest(message.data);
      } else if (message.type === 'M3U8_REQUEST_SIZE_UPDATE') {
        this.handleSizeUpdate(message.data);
      } else if (message.type === 'TAB_CHANGED') {
        this.handleTabChange(message.data.tabId);
      } else if (message.type === 'WEBSOCKET_CONNECTED') {
        this.updateConnectionStatus(true);
      } else if (message.type === 'WEBSOCKET_DISCONNECTED') {
        this.updateConnectionStatus(false);
      } else if (message.type === 'STREAM_ENQUEUED_NOTIFICATION') {
        this.showToast('Stream queued for download in StreamHelper!', 'success');
      } else if (message.type === 'DOWNLOAD_PROGRESS_NOTIFICATION') {
        this.showToast('Download in progress...', 'info');
      } else if (message.type === 'DOWNLOAD_COMPLETED_NOTIFICATION') {
        this.showToast('Download completed in StreamHelper!', 'success');
      } else if (message.type === 'DOWNLOAD_FAILED_NOTIFICATION') {
        this.showToast('Download failed in StreamHelper', 'error');
      } else if (message.type === 'WEBSOCKET_ERROR_NOTIFICATION') {
        this.showToast('Error communicating with StreamHelper', 'error');
      }
    });

    // Listen for popup focus to refresh data
    window.addEventListener('focus', () => {
      this.loadCurrentTabRequests();
    });
  }

  /**
   * Get the current active tab ID
   * @returns {Promise<number>} The current active tab ID
   */
  async getCurrentTabId() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab.id;
    } catch (error) {
      console.error('Error getting current tab ID:', error);
      return null;
    }
  }

  /**
   * Load m3u8 requests for the current active tab
   */
  async loadCurrentTabRequests() {
    try {
      this.setLoading(true);
      this.updateStatus('Loading current tab requests...');

      const currentTabId = await this.getCurrentTabId();
      if (!currentTabId) {
        this.updateStatus('Error: Cannot determine current tab');
        this.showToast('Error: Cannot determine current tab', 'error');
        return;
      }

      const response = await this.sendMessageToBackground({
        type: 'GET_M3U8_REQUESTS_BY_TAB',
        tabId: currentTabId
      });

      if (response && response.requests) {
        this.requests = response.requests;
        this.filteredRequests = [...this.requests];
        this.renderRequests();
        this.updateRequestCount();
        this.updateStatus('Ready');
      }
    } catch (error) {
      console.error('Error loading current tab requests:', error);
      this.updateStatus('Error loading requests');
      this.showToast('Error loading requests', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load all captured m3u8 requests from storage
   */
  async loadRequests() {
    try {
      this.setLoading(true);
      this.updateStatus('Loading all requests...');

      const response = await this.sendMessageToBackground({
        type: 'GET_M3U8_REQUESTS'
      });

      if (response && response.requests) {
        this.requests = response.requests;
        this.filteredRequests = [...this.requests];
        this.renderRequests();
        this.updateRequestCount();
        this.updateStatus('Ready');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      this.updateStatus('Error loading requests');
      this.showToast('Error loading requests', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Refresh the requests list
   */
  refreshRequests() {
    this.loadCurrentTabRequests();
  }

  /**
   * Handle tab change events
   * @param {number} tabId - The new active tab ID
   */
  async handleTabChange(tabId) {
    try {
      // Check if the new tab is the current tab
      const currentTabId = await this.getCurrentTabId();
      if (currentTabId === tabId) {
        // Reload requests for the new tab
        await this.loadCurrentTabRequests();
        this.showToast('Switched to new tab', 'info');
      }
    } catch (error) {
      console.error('Error handling tab change:', error);
    }
  }

  /**
   * Toggle between current tab and all requests view
   */
  async toggleViewMode() {
    if (this.viewMode === 'currentTab') {
      // Switch to all requests view
      this.viewMode = 'allRequests';
      await this.loadRequests();
      this.updateViewModeToggle();
      this.showToast('Showing all requests', 'info');
    } else {
      // Switch to current tab view
      this.viewMode = 'currentTab';
      await this.loadCurrentTabRequests();
      this.updateViewModeToggle();
      this.showToast('Showing current tab requests', 'info');
    }
  }

  /**
   * Update the view mode toggle button appearance
   */
  updateViewModeToggle() {
    const toggleBtn = document.getElementById('viewModeToggle');
    const toggleText = document.getElementById('viewModeText');
    
    if (this.viewMode === 'currentTab') {
      toggleBtn.classList.remove('active');
      toggleText.textContent = 'Current Tab';
    } else {
      toggleBtn.classList.add('active');
      toggleText.textContent = 'All Requests';
    }
  }

  /**
   * Handle new m3u8 request notifications
   * @param {Object} requestData - The new request data
   */
  async handleNewRequest(requestData) {
    // Check if we should show this request based on current view mode
    if (this.viewMode === 'currentTab') {
      const currentTabId = await this.getCurrentTabId();
      if (requestData.tabId !== currentTabId) {
        // Don't show requests from other tabs when in current tab mode
        return;
      }
    }
    
    // Add new request to the beginning of the list
    this.requests.unshift(requestData);
    this.filteredRequests.unshift(requestData);
    
    // Re-render with the new request
    this.renderRequests();
    this.updateRequestCount();
    
    // Show notification
    this.showToast('New m3u8 request captured!', 'success');
  }

  /**
   * Handle m3u8 request size updates
   * @param {Object} sizeData - The size update data
   */
  handleSizeUpdate(sizeData) {
    // Find and update the existing request
    const requestIndex = this.requests.findIndex(req => req.id === sizeData.id);
    if (requestIndex !== -1) {
      this.requests[requestIndex].size = sizeData.size;
      this.requests[requestIndex].sizeFormatted = sizeData.sizeFormatted;
      
      // Update filtered requests if they exist
      const filteredIndex = this.filteredRequests.findIndex(req => req.id === sizeData.id);
      if (filteredIndex !== -1) {
        this.filteredRequests[filteredIndex].size = sizeData.size;
        this.filteredRequests[filteredIndex].sizeFormatted = sizeData.sizeFormatted;
      }
      
      // Update the display for this specific request
      this.updateRequestSizeDisplay(sizeData.id, sizeData.sizeFormatted);
      
      // Update total size display
      this.updateTotalSize();
    }
  }

  /**
   * Render the requests list in the UI
   */
  renderRequests() {
    const container = document.getElementById('requestsContainer');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');

    // Hide loading state
    loadingState.classList.remove('visible');

    if (this.filteredRequests.length === 0) {
      // Show empty state
      container.innerHTML = '';
      emptyState.classList.add('visible');
      return;
    }

    // Hide empty state
    emptyState.classList.remove('visible');

    // Clear container
    container.innerHTML = '';

    // Render each request
    this.filteredRequests.forEach((request, index) => {
      const requestElement = this.createRequestElement(request, index === 0);
      container.appendChild(requestElement);
    });
  }

  /**
   * Create a DOM element for a single request
   * @param {Object} request - The request data
   * @param {boolean} isNew - Whether this is a new request
   * @returns {HTMLElement} The created request element
   */
  createRequestElement(request, isNew = false) {
    const template = document.getElementById('requestTemplate');
    const clone = template.content.cloneNode(true);
    const requestItem = clone.querySelector('.request-item');

    // Set request ID
    requestItem.dataset.id = request.id;

    // Add new class for animation if it's a new request
    if (isNew) {
      requestItem.classList.add('new');
    }

    // Set request method
    const methodElement = requestItem.querySelector('.request-method');
    methodElement.textContent = request.method || 'GET';

    // Set request time
    const timeElement = requestItem.querySelector('.request-time');
    timeElement.textContent = this.formatTime(request.timestamp);

    // Set request size
    const sizeElement = requestItem.querySelector('.request-size');
    if (request.sizeFormatted) {
      sizeElement.textContent = request.sizeFormatted;
      sizeElement.title = `File size: ${request.sizeFormatted}`;
    } else {
      sizeElement.textContent = 'Loading...';
      sizeElement.title = 'Size information loading from response headers';
    }

    // Set request URL (truncated for display)
    const urlElement = requestItem.querySelector('.request-url');
    const truncatedUrl = this.truncateUrl(request.url);
    urlElement.textContent = truncatedUrl;
    urlElement.title = request.url; // Show full URL on hover

    // Set up show full URL button
    const showFullUrlBtn = requestItem.querySelector('.show-full-url-btn');
    showFullUrlBtn.addEventListener('click', () => {
      this.showFullUrl(request.url);
    });

    // Set page context
    const pageTitleElement = requestItem.querySelector('.page-title');
    pageTitleElement.textContent = request.pageTitle || 'Unknown Page';
    pageTitleElement.title = request.pageTitle || 'Unknown Page';

    const pageUrlElement = requestItem.querySelector('.page-url');
    pageUrlElement.textContent = request.pageUrl || 'Unknown URL';
    pageUrlElement.title = request.pageUrl || 'Unknown URL';

    // Set up copy button
    const copyBtn = requestItem.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
      this.copyUrl(request.url);
    });

    // Set up yt-dlp button with request context
    const ytdlpBtn = requestItem.querySelector('.ytdlp-btn');
    ytdlpBtn.addEventListener('click', () => {
      this.copyYtDlpCommand(request.url, request.pageTitle, request);
    });

    // Set up StreamHelper button
    const streamhelperBtn = requestItem.querySelector('.streamhelper-btn');
    streamhelperBtn.addEventListener('click', () => {
      this.downloadToStreamHelper(request);
    });

    // Set up delete button
    const deleteBtn = requestItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
      this.deleteRequest(request.id);
    });

    return requestItem;
  }

  /**
   * Handle search input and filter requests
   * @param {string} searchTerm - The search term to filter by
   */
  handleSearch(searchTerm) {
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchTerm.trim() === '') {
      this.filteredRequests = [...this.requests];
      clearSearchBtn.classList.remove('visible');
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredRequests = this.requests.filter(request => 
        request.url.toLowerCase().includes(term) ||
        (request.pageTitle && request.pageTitle.toLowerCase().includes(term)) ||
        (request.pageUrl && request.pageUrl.toLowerCase().includes(term))
      );
      clearSearchBtn.classList.add('visible');
    }

    this.renderRequests();
    this.updateRequestCount();
  }

  /**
   * Clear the search input and show all requests
   */
  clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    this.handleSearch('');
  }

  /**
   * Copy a URL to the clipboard
   * @param {string} url - The URL to copy
   */
  async copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('URL copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showToast('URL copied to clipboard!', 'success');
    }
  }

  /**
   * Delete a specific request
   * @param {string} requestId - The ID of the request to delete
   */
  async deleteRequest(requestId) {
    try {
      const response = await this.sendMessageToBackground({
        type: 'DELETE_M3U8_REQUEST',
        requestId: requestId
      });

      if (response && response.success) {
        // Remove from local arrays
        this.requests = this.requests.filter(req => req.id !== requestId);
        this.filteredRequests = this.filteredRequests.filter(req => req.id !== requestId);
        
        // Re-render and update count
        this.renderRequests();
        this.updateRequestCount();
        
        this.showToast('Request deleted', 'success');
      } else {
        throw new Error('Failed to delete request');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      this.showToast('Error deleting request', 'error');
    }
  }

  /**
   * Clear all captured requests
   */
  async clearAllRequests() {
    if (this.requests.length === 0) {
      return;
    }

    if (!confirm('Are you sure you want to clear all captured requests?')) {
      return;
    }

    try {
      const response = await this.sendMessageToBackground({
        type: 'CLEAR_M3U8_REQUESTS'
      });

      if (response && response.success) {
        this.requests = [];
        this.filteredRequests = [];
        this.renderRequests();
        this.updateRequestCount();
        this.showToast('All requests cleared', 'success');
      } else {
        throw new Error('Failed to clear requests');
      }
    } catch (error) {
      console.error('Error clearing requests:', error);
      this.showToast('Error clearing requests', 'error');
    }
  }

  /**
   * Export captured requests to JSON
   */
  exportRequests() {
    if (this.requests.length === 0) {
      this.showToast('No requests to export', 'warning');
      return;
    }

    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalRequests: this.requests.length,
        totalSize: this.calculateTotalSize(),
        requests: this.requests
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streamhelper-requests-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Requests exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting requests:', error);
      this.showToast('Error exporting requests', 'error');
    }
  }

  /**
   * Open settings (placeholder for future implementation)
   */
  openSettings() {
    this.showToast('Settings coming soon!', 'info');
  }

  /**
   * Send message to background script
   * @param {Object} message - The message to send
   * @returns {Promise} Promise that resolves with the response
   */
  sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Update the request count display
   */
  updateRequestCount() {
    const countElement = document.getElementById('requestCount');
    const count = this.filteredRequests.length;
    const total = this.requests.length;
    
    if (count === total) {
      countElement.textContent = `${count} request${count !== 1 ? 's' : ''}`;
    } else {
      countElement.textContent = `${count} of ${total} request${total !== 1 ? 's' : ''}`;
    }
    
    // Also update total size
    this.updateTotalSize();
  }

  /**
   * Update the total size display
   */
  updateTotalSize() {
    const totalSizeElement = document.getElementById('totalSize');
    const totalSize = this.calculateTotalSize();
    totalSizeElement.textContent = totalSize;
  }

  /**
   * Calculate total size of all requests
   * @returns {string} Formatted total size
   */
  calculateTotalSize() {
    const totalBytes = this.requests.reduce((total, request) => {
      return total + (request.size || 0);
    }, 0);
    
    return this.formatFileSize(totalBytes);
  }

  /**
   * Format file size in human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Update the status display
   * @param {string} status - The status message to display
   */
  updateStatus(status) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = status;
  }

  /**
   * Update the size display for a specific request
   * @param {string} requestId - The ID of the request to update
   * @param {string} sizeFormatted - The formatted size string
   */
  updateRequestSizeDisplay(requestId, sizeFormatted) {
    const requestElement = document.querySelector(`[data-id="${requestId}"]`);
    if (requestElement) {
      const sizeElement = requestElement.querySelector('.request-size');
      if (sizeElement) {
        sizeElement.textContent = sizeFormatted || 'Unknown';
        sizeElement.title = `File size: ${sizeFormatted || 'Unknown'}`;
      }
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading - Whether to show loading state
   */
  setLoading(loading) {
    this.isLoading = loading;
    const loadingState = document.getElementById('loadingState');
    
    if (loading) {
      loadingState.classList.add('visible');
    } else {
      loadingState.classList.remove('visible');
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - The type of toast (success, error, warning, info)
   */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set message and type
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('visible');
    
    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }

  /**
   * Format timestamp for display
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted time string
   */
  formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Truncate URL for better display in popup
   * Shows hostname + path without parameters for cleaner display
   * @param {string} url - The full URL to truncate
   * @returns {string} Truncated URL without parameters
   */
  truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      
      // Return hostname + path without query parameters or hash
      return `${hostname}${pathname}`;
    } catch (error) {
      // Fallback: try to remove parameters manually
      const questionMarkIndex = url.indexOf('?');
      const hashIndex = url.indexOf('#');
      
      let endIndex = url.length;
      if (questionMarkIndex !== -1) {
        endIndex = Math.min(endIndex, questionMarkIndex);
      }
      if (hashIndex !== -1) {
        endIndex = Math.min(endIndex, hashIndex);
      }
      
      return url.substring(0, endIndex);
    }
  }

  /**
   * Generate enhanced yt-dlp command for downloading the stream
   * @param {string} url - The m3u8 URL
   * @param {string} title - The page title for filename
   * @param {Object} request - The full request object with browser context
   * @returns {string} Complete yt-dlp command with reliability options
   */
  generateYtDlpCommand(url, title, request) {
    // Clean the title for use as filename
    const cleanTitle = title
      .replace(/[<>:"/\\|?*]/g, '_') // Remove invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length
    
    let command = `yt-dlp "${url}" -o "${cleanTitle}.%(ext)s"`;
    
    // Add essential reliability options
    command += ` --no-check-certificate`; // Skip SSL verification (fixes SSL error)
    command += ` --ignore-errors`; // Continue on errors
    command += ` --retries 3`; // Retry failed downloads
    
    // Add referer header if we have the page URL
    if (request.pageUrl && request.pageUrl !== 'Unknown') {
      try {
        const pageUrl = new URL(request.pageUrl);
        const referer = `${pageUrl.protocol}//${pageUrl.host}${pageUrl.pathname}`;
        command += ` --add-header "Referer:${referer}"`;
      } catch (error) {
        // If URL parsing fails, use the page URL as-is
        command += ` --add-header "Referer:${request.pageUrl}"`;
      }
    }
    
    // Add user agent header to mimic browser
    if (request.userAgent && request.userAgent !== 'Unknown') {
      command += ` --add-header "User-Agent:${request.userAgent}"`;
    } else {
      // Fallback to realistic user agent
      command += ` --add-header "User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"`;
    }
    
    // Add origin header for CORS compliance
    if (request.pageUrl && request.pageUrl !== 'Unknown') {
      try {
        const pageUrl = new URL(request.pageUrl);
        const origin = `${pageUrl.protocol}//${pageUrl.host}`;
        command += ` --add-header "Origin:${origin}"`;
      } catch (error) {
        // If URL parsing fails, skip origin header
      }
    }
    
    // Add format selection for better reliability
    command += ` --format "best[ext=mp4]/best"`;
    
    // Add progress and output options
    command += ` --progress`; // Show progress bar
    
    // Add additional reliability options for maximum compatibility
    command += ` --no-part`; // Don't create .part files
    command += ` --force-overwrites`; // Overwrite existing files
    
    return command;
  }

  /**
   * Copy yt-dlp command to clipboard
   * @param {string} url - The m3u8 URL
   * @param {string} title - The page title
   * @param {Object} request - The full request object with browser context
   */
  async copyYtDlpCommand(url, title, request) {
    try {
      const command = this.generateYtDlpCommand(url, title, request);
      await navigator.clipboard.writeText(command);
      this.showToast('Enhanced yt-dlp command copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const command = this.generateYtDlpCommand(url, title, request);
      const textArea = document.createElement('textarea');
      textArea.value = command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showToast('Enhanced yt-dlp command copied to clipboard!', 'success');
    }
  }

  /**
   * Download stream to StreamHelper desktop app
   * @param {Object} request - The request object to download
   */
  async downloadToStreamHelper(request) {
    try {
      // Send message to background script to forward to StreamHelper
      const response = await this.sendMessageToBackground({
        type: 'DOWNLOAD_TO_STREAMHELPER',
        data: {
          url: request.url,
          pageTitle: request.pageTitle,
          timestamp: Date.now(),
          tabId: request.tabId,
          pageUrl: request.pageUrl
        }
      });

      if (response && response.success) {
        this.showToast('Stream sent to StreamHelper for download!', 'success');
      } else {
        throw new Error('Failed to send to StreamHelper');
      }
    } catch (error) {
      console.error('Error sending to StreamHelper:', error);
      this.showToast('Error sending to StreamHelper. Is the desktop app running?', 'error');
    }
  }

  /**
   * Update connection status display
   * @param {boolean} connected - Whether connected to StreamHelper
   */
  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connectionIndicator');
    const text = document.getElementById('connectionText');
    const connectBtn = document.getElementById('connectBtn');
    
    if (connected) {
      indicator.classList.add('connected');
      text.classList.add('connected');
      text.textContent = 'Connected';
      connectBtn.classList.add('connected');
      connectBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        <span>Disconnect</span>
      `;
      connectBtn.title = 'Disconnect from StreamHelper Desktop App';
    } else {
      indicator.classList.remove('connected');
      text.classList.remove('connected');
      text.textContent = 'Disconnected';
      connectBtn.classList.remove('connected');
      connectBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Connect</span>
      `;
      connectBtn.title = 'Connect to StreamHelper Desktop App';
    }
  }

  /**
   * Toggle WebSocket connection to StreamHelper desktop app
   */
  async toggleConnection() {
    const connectBtn = document.getElementById('connectBtn');
    const isCurrentlyConnected = connectBtn.classList.contains('connected');
    
    try {
      if (isCurrentlyConnected) {
        // Disconnect
        await chrome.runtime.sendMessage({ type: 'DISCONNECT_WEBSOCKET' });
        this.showToast('Disconnected from StreamHelper', 'info');
      } else {
        // Connect
        await chrome.runtime.sendMessage({ type: 'CONNECT_WEBSOCKET' });
        this.showToast('Connecting to StreamHelper...', 'info');
      }
    } catch (error) {
      console.error('Error toggling connection:', error);
      this.showToast('Connection error: ' + error.message, 'error');
    }
  }

  /**
   * Get current WebSocket connection status
   */
  async getConnectionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_WEBSOCKET_STATUS' });
      this.updateConnectionStatus(response.connected);
    } catch (error) {
      console.error('Error getting connection status:', error);
    }
  }

  /**
   * Show full URL in a modal or alert
   * @param {string} url - The full URL to display
   */
  showFullUrl(url) {
    // Create a simple modal to show the full URL
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 80%;
      overflow: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    modalContent.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #333;">Full URL</h3>
      <div style="
        background: #f5f5f5;
        padding: 15px;
        border-radius: 6px;
        font-family: monospace;
      word-break: break-all;
        margin-bottom: 15px;
        font-size: 12px;
        line-height: 1.4;
      ">${url}</div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="copyFullUrl" style="
          background: #2196f3;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Copy URL</button>
        <button id="closeModal" style="
          background: #757575;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Close</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Handle copy button
    modalContent.querySelector('#copyFullUrl').addEventListener('click', () => {
      this.copyUrl(url);
    });

    // Handle close button and click outside
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    modalContent.querySelector('#closeModal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new StreamHelperPopup();
});
