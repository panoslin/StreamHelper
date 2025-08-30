import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { configManager } from '../config/manager';
import { downloadManager } from '../download/manager';
import { webSocketManager } from '../communication/websocket';
import { logger } from '../utils/logger';

export class IPCHandlers {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.setupHandlers();
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupHandlers(): void {
    // Configuration handlers
    ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => {
      return configManager.getConfig();
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_CONFIG, (event, updates: any) => {
      configManager.updateConfig(updates);
      return { success: true };
    });

    // Download handlers
    ipcMain.handle(IPC_CHANNELS.GET_DOWNLOADS, () => {
      return downloadManager.getDownloads();
    });

    ipcMain.handle(IPC_CHANNELS.PAUSE_DOWNLOAD, (event, downloadId: string) => {
      const success = downloadManager.pauseDownload(downloadId);
      if (success) {
        this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_PROGRESS, {
          id: downloadId,
          status: 'paused'
        });
      }
      return { success };
    });

    ipcMain.handle(IPC_CHANNELS.RETRY_DOWNLOAD, (event, downloadId: string) => {
      const success = downloadManager.retryDownload(downloadId);
      if (success) {
        // Send updated download status to renderer
        const download = downloadManager.getDownload(downloadId);
        if (download) {
          this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_PROGRESS, {
            id: downloadId,
            status: 'pending',
            progress: 0,
            retryCount: download.retryCount
          });
        }
      }
      return { success };
    });

    ipcMain.handle(IPC_CHANNELS.REMOVE_FAILED_DOWNLOAD, (event, downloadId: string) => {
      const success = downloadManager.removeFailedDownload(downloadId);
      if (success) {
        // Send download removed notification to renderer
        this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_PROGRESS, {
          id: downloadId,
          status: 'removed',
          type: 'removed'
        });
      }
      return { success };
    });

    ipcMain.handle(IPC_CHANNELS.RESUME_DOWNLOAD, (event, downloadId: string) => {
      const success = downloadManager.resumeDownload(downloadId);
      if (success) {
        this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_PROGRESS, {
          id: downloadId,
          status: 'downloading'
        });
      }
      return { success };
    });

    ipcMain.handle(IPC_CHANNELS.CANCEL_DOWNLOAD, (event, downloadId: string) => {
      const success = downloadManager.cancelDownload(downloadId);
      if (success) {
        this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_FAILED, {
          id: downloadId,
          error: 'Download cancelled by user'
        });
      }
      return { success };
    });

    // Stream handlers
    ipcMain.on(IPC_CHANNELS.NEW_STREAM, (event, streamData: any) => {
      this.sendToRenderer(IPC_CHANNELS.STREAM_UPDATE, streamData);
    });

    // WebSocket status
    ipcMain.handle('get-websocket-status', () => {
      return {
        isRunning: webSocketManager.isRunning(),
        connectedClients: webSocketManager.getConnectedClientsCount(),
        port: configManager.get('webSocketPort')
      };
    });

    // Clear completed downloads
    ipcMain.handle('clear-completed-downloads', () => {
      downloadManager.clearCompleted();
      return { success: true };
    });

    // Open downloads folder
    ipcMain.handle('open-downloads-folder', () => {
      try {
        const downloadDir = configManager.get('defaultDownloadDir');
        const { shell } = require('electron');
        
        // Expand the ~ to the actual home directory
        const expandedPath = downloadDir.replace(/^~/, require('os').homedir());
        
        // Open the folder in the system's default file manager
        shell.openPath(expandedPath);
        
        return { success: true, path: expandedPath };
      } catch (error) {
        logger.error('Failed to open downloads folder', { error });
        return { success: false, error: (error as Error).message };
      }
    });

    // Highlight file in Finder
    ipcMain.handle(IPC_CHANNELS.HIGHLIGHT_FILE_IN_FINDER, (event, filePath: string) => {
      try {
        const { shell } = require('electron');
        
        // Expand the ~ to the actual home directory if present
        const expandedPath = filePath.replace(/^~/, require('os').homedir());
        
        // On macOS, use the 'showItemInFolder' method to highlight the specific file
        if (process.platform === 'darwin') {
          shell.showItemInFolder(expandedPath);
        } else {
          // On other platforms, just open the folder
          shell.openPath(require('path').dirname(expandedPath));
        }
        
        return { success: true, path: expandedPath };
      } catch (error) {
        logger.error('Failed to highlight file in Finder', { error, filePath });
        return { success: false, error: (error as Error).message };
      }
    });

    // Remove individual download
    ipcMain.handle(IPC_CHANNELS.REMOVE_DOWNLOAD, (event, downloadId: string) => {
      try {
        const success = downloadManager.removeDownload(downloadId);
        if (success) {
          this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_PROGRESS, {
            id: downloadId,
            status: 'removed',
            type: 'removed'
          });
        }
        return { success };
      } catch (error) {
        logger.error('Failed to remove download', { error, downloadId });
        return { success: false, error: (error as Error).message };
      }
    });

    // Select directory for downloads
    ipcMain.handle(IPC_CHANNELS.SELECT_DIRECTORY, async () => {
      try {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Select Download Directory'
        });

        if (!result.canceled && result.filePaths.length > 0) {
          return { success: true, path: result.filePaths[0] };
        } else {
          return { success: false, error: 'No directory selected' };
        }
      } catch (error) {
        logger.error('Failed to select directory', { error });
        return { success: false, error: (error as Error).message };
      }
    });

    logger.info('IPC handlers setup completed');
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    } else {
      console.warn('Cannot send to renderer: main window is null or destroyed');
    }
  }

  // Method to send download progress updates
  sendDownloadProgress(progress: any): void {
    this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_PROGRESS, progress);
  }

  // Method to send download completion
  sendDownloadCompleted(downloadId: string, outputPath?: string): void {
    this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_COMPLETED, {
      id: downloadId,
      outputPath
    });
  }

  // Method to send download failure
  sendDownloadFailed(downloadId: string, error: string): void {
    this.sendToRenderer(IPC_CHANNELS.DOWNLOAD_FAILED, {
      id: downloadId,
      error
    });
  }

  // Method to send new stream notification
  sendNewStream(stream: any): void {
    this.sendToRenderer(IPC_CHANNELS.STREAM_UPDATE, stream);
  }

  // Setup WebSocket status change listener
  setupWebSocketStatusListener(): void {
    webSocketManager.on('statusChanged', (status: any) => {
      this.sendToRenderer(IPC_CHANNELS.WEBSOCKET_STATUS_UPDATED, status);
    });
  }
}

export const ipcHandlers = new IPCHandlers();
