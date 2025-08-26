import { ipcMain, dialog, shell } from 'electron';
import { configManager } from '../config/manager';
import { downloadManager } from '../download/manager';
import { webSocketManager } from '../communication/websocket';
import { getHomeDirectory, expandPath } from '@/shared/utils';
import { join } from 'path';

export function setupIpcHandlers(): void {
  // Configuration handlers
  setupConfigHandlers();
  
  // Download handlers
  setupDownloadHandlers();
  
  // WebSocket handlers
  setupWebSocketHandlers();
  
  // System handlers
  setupSystemHandlers();
  
  console.log('IPC handlers setup completed');
}

function setupConfigHandlers(): void {
  // Get application configuration
  ipcMain.handle('config:get-app-config', () => {
    return configManager.getAppConfig();
  });

  // Set application configuration
  ipcMain.handle('config:set-app-config', (event, config: any) => {
    try {
      configManager.setAppConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get yt-dlp configuration
  ipcMain.handle('config:get-ytdlp-config', () => {
    return configManager.getYtDlpConfig();
  });

  // Set yt-dlp binary path
  ipcMain.handle('config:set-ytdlp-path', async (event, path: string) => {
    try {
      configManager.setYtDlpBinaryPath(path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get UI configuration
  ipcMain.handle('config:get-ui-config', () => {
    return configManager.getUIConfig();
  });

  // Set UI configuration
  ipcMain.handle('config:set-ui-config', (event, config: any) => {
    try {
      if (config.theme) configManager.setTheme(config.theme);
      if (config.windowBounds) configManager.setWindowBounds(config.windowBounds);
      if (config.sidebarCollapsed !== undefined) configManager.setSidebarCollapsed(config.sidebarCollapsed);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get communication configuration
  ipcMain.handle('config:get-communication-config', () => {
    return configManager.getCommunicationConfig();
  });

  // Validate download directory
  ipcMain.handle('config:validate-download-directory', async (event, directory: string) => {
    try {
      return configManager.validateDownloadDirectory(directory);
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Reset configuration to defaults
  ipcMain.handle('config:reset-to-defaults', () => {
    try {
      configManager.resetToDefaults();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Export configuration
  ipcMain.handle('config:export', () => {
    try {
      return { success: true, data: configManager.exportConfig() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Import configuration
  ipcMain.handle('config:import', (event, configJson: string) => {
    try {
      const success = configManager.importConfig(configJson);
      return { success };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

function setupDownloadHandlers(): void {
  // Get download queue status
  ipcMain.handle('download:get-queue-status', () => {
    return downloadManager.getQueueStatus();
  });

  // Get active downloads
  ipcMain.handle('download:get-active', () => {
    return downloadManager.getActiveDownloads();
  });

  // Get completed downloads
  ipcMain.handle('download:get-completed', () => {
    return downloadManager.getCompletedDownloads();
  });

  // Get failed downloads
  ipcMain.handle('download:get-failed', () => {
    return downloadManager.getFailedDownloads();
  });

  // Start download
  ipcMain.handle('download:start', async (event, jobId: string) => {
    try {
      await downloadManager.startDownload(jobId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Pause download
  ipcMain.handle('download:pause', async (event, jobId: string) => {
    try {
      await downloadManager.pauseDownload(jobId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Resume download
  ipcMain.handle('download:resume', async (event, jobId: string) => {
    try {
      await downloadManager.resumeDownload(jobId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Cancel download
  ipcMain.handle('download:cancel', async (event, jobId: string) => {
    try {
      await downloadManager.cancelDownload(jobId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Clear completed downloads
  ipcMain.handle('download:clear-completed', async () => {
    try {
      await downloadManager.clearCompleted();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Add download request
  ipcMain.handle('download:add-request', async (event, request: any) => {
    try {
      const jobId = await downloadManager.addDownloadRequest(request);
      return { success: true, jobId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Check if downloading
  ipcMain.handle('download:is-downloading', () => {
    return downloadManager.isDownloading();
  });
}

function setupWebSocketHandlers(): void {
  // Get WebSocket connection status
  ipcMain.handle('websocket:get-status', () => {
    return {
      isRunning: webSocketManager.isExtensionConnected(),
      connectionCount: webSocketManager.getConnectionCount(),
      extensionConnected: webSocketManager.isExtensionConnected(),
    };
  });

  // Get connection count
  ipcMain.handle('websocket:get-connection-count', () => {
    return webSocketManager.getConnectionCount();
  });

  // Check if extension is connected
  ipcMain.handle('websocket:is-extension-connected', () => {
    return webSocketManager.isExtensionConnected();
  });

  // Send message to extension
  ipcMain.handle('websocket:send-to-extension', (event, message: any) => {
    try {
      webSocketManager.broadcastToExtensions(message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}

function setupSystemHandlers(): void {
  // Open file dialog for download directory
  ipcMain.handle('system:select-download-directory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Download Directory',
        defaultPath: configManager.getDownloadDirectory(),
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
      } else {
        return { success: false, error: 'No directory selected' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Open file dialog for yt-dlp binary
  ipcMain.handle('system:select-ytdlp-binary', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: 'Select yt-dlp Binary',
        filters: [
          { name: 'Executable Files', extensions: ['exe', 'bin', ''] },
          { name: 'All Files', extensions: ['*'] },
        ],
        defaultPath: configManager.getYtDlpConfig().binaryPath,
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
      } else {
        return { success: false, error: 'No file selected' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Open download directory in file manager
  ipcMain.handle('system:open-download-directory', async () => {
    try {
      const downloadDir = configManager.getDownloadDirectory();
      await shell.openPath(downloadDir);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Open configuration file location
  ipcMain.handle('system:open-config-location', async () => {
    try {
      const configPath = configManager.getConfigFilePath();
      const configDir = join(configPath, '..');
      await shell.openPath(configDir);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get system information
  ipcMain.handle('system:get-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      homeDir: getHomeDirectory(),
      downloadDir: configManager.getDownloadDirectory(),
      configPath: configManager.getConfigFilePath(),
    };
  });

  // Show error dialog
  ipcMain.handle('system:show-error', async (event, title: string, message: string) => {
    try {
      await dialog.showErrorBox(title, message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Show message dialog
  ipcMain.handle('system:show-message', async (event, options: any) => {
    try {
      const result = await dialog.showMessageBox({
        type: options.type || 'info',
        title: options.title || 'Message',
        message: options.message || '',
        detail: options.detail || '',
        buttons: options.buttons || ['OK'],
        defaultId: options.defaultId || 0,
        cancelId: options.cancelId || 0,
      });
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
