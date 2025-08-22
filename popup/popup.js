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
    
    // Initialize the popup
    this.init();
  }

  /**
   * Initialize the popup and set up event listeners
   */
  init() {
    this.setupEventListeners();
    this.loadRequests();
    this.updateStatus('Ready');
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

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'NEW_M3U8_REQUEST') {
        this.handleNewRequest(message.data);
      }
    });

    // Listen for popup focus to refresh data
    window.addEventListener('focus', () => {
      this.loadRequests();
    });
  }

  /**
   * Load all captured m3u8 requests from storage
   */
  async loadRequests() {
    try {
      this.setLoading(true);
      this.updateStatus('Loading requests...');

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
    this.loadRequests();
  }

  /**
   * Handle new m3u8 request notifications
   * @param {Object} requestData - The new request data
   */
  handleNewRequest(requestData) {
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

    // Set up yt-dlp button
    const ytdlpBtn = requestItem.querySelector('.ytdlp-btn');
    ytdlpBtn.addEventListener('click', () => {
      this.copyYtDlpCommand(request.url, request.pageTitle);
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
   * @param {string} url - The full URL to truncate
   * @param {number} maxLength - Maximum length before truncation
   * @returns {string} Truncated URL with ellipsis
   */
  truncateUrl(url, maxLength = 80) {
    if (url.length <= maxLength) {
      return url;
    }
    
    // Try to keep the domain and filename visible
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename.length > 20) {
        // If filename is long, show domain + truncated filename
        const truncatedFilename = filename.substring(0, 20) + '...';
        return `${domain}${pathname.substring(0, pathname.lastIndexOf('/') + 1)}${truncatedFilename}`;
      } else {
        // Show domain + beginning of path + ellipsis
        const pathStart = pathname.substring(0, Math.max(0, maxLength - domain.length - 10));
        return `${domain}${pathStart}...`;
      }
    } catch (error) {
      // Fallback: simple truncation
      return url.substring(0, maxLength - 3) + '...';
    }
  }

  /**
   * Generate yt-dlp command for downloading the stream
   * @param {string} url - The m3u8 URL
   * @param {string} title - The page title for filename
   * @returns {string} Complete yt-dlp command
   */
  generateYtDlpCommand(url, title) {
    // Clean the title for use as filename
    const cleanTitle = title
      .replace(/[<>:"/\\|?*]/g, '_') // Remove invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length
    
    // Generate the yt-dlp command
    const command = `yt-dlp "${url}" -o "${cleanTitle}.%(ext)s"`;
    
    return command;
  }

  /**
   * Copy yt-dlp command to clipboard
   * @param {string} url - The m3u8 URL
   * @param {string} title - The page title
   */
  async copyYtDlpCommand(url, title) {
    try {
      const command = this.generateYtDlpCommand(url, title);
      await navigator.clipboard.writeText(command);
      this.showToast('yt-dlp command copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const command = this.generateYtDlpCommand(url, title);
      const textArea = document.createElement('textarea');
      textArea.value = command;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showToast('yt-dlp command copied to clipboard!', 'success');
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
