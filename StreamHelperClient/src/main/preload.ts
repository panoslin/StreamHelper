import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration API
  config: {
    getAppConfig: () => ipcRenderer.invoke('config:get-app-config'),
    setAppConfig: (config: any) => ipcRenderer.invoke('config:set-app-config', config),
    getYtDlpConfig: () => ipcRenderer.invoke('config:get-ytdlp-config'),
    setYtDlpPath: (path: string) => ipcRenderer.invoke('config:set-ytdlp-path', path),
    getUIConfig: () => ipcRenderer.invoke('config:get-ui-config'),
    setUIConfig: (config: any) => ipcRenderer.invoke('config:set-ui-config', config),
    getCommunicationConfig: () => ipcRenderer.invoke('config:get-communication-config'),
    validateDownloadDirectory: (directory: string) => ipcRenderer.invoke('config:validate-download-directory', directory),
    resetToDefaults: () => ipcRenderer.invoke('config:reset-to-defaults'),
    export: () => ipcRenderer.invoke('config:export'),
    import: (configJson: string) => ipcRenderer.invoke('config:import', configJson),
  },

  // Download API
  download: {
    getQueueStatus: () => ipcRenderer.invoke('download:get-queue-status'),
    getActive: () => ipcRenderer.invoke('download:get-active'),
    getCompleted: () => ipcRenderer.invoke('download:get-completed'),
    getFailed: () => ipcRenderer.invoke('download:get-failed'),
    start: (jobId: string) => ipcRenderer.invoke('download:start', jobId),
    pause: (jobId: string) => ipcRenderer.invoke('download:pause', jobId),
    resume: (jobId: string) => ipcRenderer.invoke('download:resume', jobId),
    cancel: (jobId: string) => ipcRenderer.invoke('download:cancel', jobId),
    clearCompleted: () => ipcRenderer.invoke('download:clear-completed'),
    addRequest: (request: any) => ipcRenderer.invoke('download:add-request', request),
    isDownloading: () => ipcRenderer.invoke('download:is-downloading'),
  },

  // WebSocket API
  websocket: {
    getStatus: () => ipcRenderer.invoke('websocket:get-status'),
    getConnectionCount: () => ipcRenderer.invoke('websocket:get-connection-count'),
    isExtensionConnected: () => ipcRenderer.invoke('websocket:is-extension-connected'),
    sendToExtension: (message: any) => ipcRenderer.invoke('websocket:send-to-extension', message),
  },

  // System API
  system: {
    selectDownloadDirectory: () => ipcRenderer.invoke('system:select-download-directory'),
    selectYtDlpBinary: () => ipcRenderer.invoke('system:select-ytdlp-binary'),
    openDownloadDirectory: () => ipcRenderer.invoke('system:open-download-directory'),
    openConfigLocation: () => ipcRenderer.invoke('system:open-config-location'),
    getInfo: () => ipcRenderer.invoke('system:get-info'),
    showError: (title: string, message: string) => ipcRenderer.invoke('system:show-error', title, message),
    showMessage: (options: any) => ipcRenderer.invoke('system:show-message', options),
  },

  // Event listeners
  on: (channel: string, callback: Function) => {
    // Whitelist channels
    const validChannels = [
      'menu:new-download',
      'menu:open-download-folder',
      'menu:preferences',
      'menu:start-all-downloads',
      'menu:pause-all-downloads',
      'menu:clear-completed',
      'menu:about',
      'tray:start-all-downloads',
      'tray:pause-all-downloads',
      'tray:clear-completed',
      'tray:open-settings',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Expose types for TypeScript
declare global {
  interface Window {
    electronAPI: {
      config: {
        getAppConfig: () => Promise<any>;
        setAppConfig: (config: any) => Promise<any>;
        getYtDlpConfig: () => Promise<any>;
        setYtDlpPath: (path: string) => Promise<any>;
        getUIConfig: () => Promise<any>;
        setUIConfig: (config: any) => Promise<any>;
        getCommunicationConfig: () => Promise<any>;
        validateDownloadDirectory: (directory: string) => Promise<any>;
        resetToDefaults: () => Promise<any>;
        export: () => Promise<any>;
        import: (configJson: string) => Promise<any>;
      };
      download: {
        getQueueStatus: () => Promise<any>;
        getActive: () => Promise<any>;
        getCompleted: () => Promise<any>;
        getFailed: () => Promise<any>;
        start: (jobId: string) => Promise<any>;
        pause: (jobId: string) => Promise<any>;
        resume: (jobId: string) => Promise<any>;
        cancel: (jobId: string) => Promise<any>;
        clearCompleted: () => Promise<any>;
        addRequest: (request: any) => Promise<any>;
        isDownloading: () => Promise<boolean>;
      };
      websocket: {
        getStatus: () => Promise<any>;
        getConnectionCount: () => Promise<number>;
        isExtensionConnected: () => Promise<boolean>;
        sendToExtension: (message: any) => Promise<any>;
      };
      system: {
        selectDownloadDirectory: () => Promise<any>;
        selectYtDlpBinary: () => Promise<any>;
        openDownloadDirectory: () => Promise<any>;
        openConfigLocation: () => Promise<any>;
        getInfo: () => Promise<any>;
        showError: (title: string, message: string) => Promise<any>;
        showMessage: (options: any) => Promise<any>;
      };
      on: (channel: string, callback: Function) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
