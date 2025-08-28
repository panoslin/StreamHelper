import { contextBridge, ipcRenderer } from 'electron';

// Define IPC channels directly to avoid import issues
const IPC_CHANNELS = {
  NEW_STREAM: 'new-stream',
  STREAM_UPDATE: 'stream-update',
  DOWNLOAD_PROGRESS: 'download-progress',
  DOWNLOAD_COMPLETED: 'download-completed',
  DOWNLOAD_FAILED: 'download-failed',
  GET_CONFIG: 'get-config',
  UPDATE_CONFIG: 'update-config',
  GET_DOWNLOADS: 'get-downloads',
  PAUSE_DOWNLOAD: 'pause-download',
  RESUME_DOWNLOAD: 'resume-download',
  CANCEL_DOWNLOAD: 'cancel-download'
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  updateConfig: (updates: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONFIG, updates),
  
  // Downloads
  getDownloads: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DOWNLOADS),
  pauseDownload: (downloadId: string) => ipcRenderer.invoke(IPC_CHANNELS.PAUSE_DOWNLOAD, downloadId),
  resumeDownload: (downloadId: string) => ipcRenderer.invoke(IPC_CHANNELS.RESUME_DOWNLOAD, downloadId),
  cancelDownload: (downloadId: string) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_DOWNLOAD, downloadId),
  
  // Streams
  onStreamUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.STREAM_UPDATE, (event, data) => callback(data));
  },
  
  // Download progress
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, (event, progress) => callback(progress));
  },
  
  onDownloadCompleted: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_COMPLETED, (event, data) => callback(data));
  },
  
  onDownloadFailed: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_FAILED, (event, data) => callback(data));
  },
  
  // WebSocket status
  getWebSocketStatus: () => ipcRenderer.invoke('get-websocket-status'),
  
  // Utility functions
  clearCompletedDownloads: () => ipcRenderer.invoke('clear-completed-downloads'),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<any>;
      updateConfig: (updates: any) => Promise<any>;
      getDownloads: () => Promise<any[]>;
      pauseDownload: (downloadId: string) => Promise<any>;
      resumeDownload: (downloadId: string) => Promise<any>;
      cancelDownload: (downloadId: string) => Promise<any>;
      clearCompletedDownloads: () => Promise<any>;
      getWebSocketStatus: () => Promise<any>;
      onStreamUpdate: (callback: (data: any) => void) => void;
      onDownloadProgress: (callback: (progress: any) => void) => void;
      onDownloadCompleted: (callback: (data: any) => void) => void;
      onDownloadFailed: (callback: (data: any) => void) => void;
      openDownloadsFolder: () => Promise<any>;
      removeAllListeners: (channel: string) => void;
    };
  }
}
