import { app, BrowserWindow, ipcMain, shell, nativeTheme } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from './utils/logger';
import { configManager } from './config/manager';
import { webSocketManager } from './communication/websocket';
import { downloadManager } from './download/manager';
import { ipcHandlers } from './ipc/handlers';
import { getEnvironmentInfo } from './utils/environment';

class StreamHelperApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev: boolean;

  constructor() {
    this.isDev = process.env['NODE_ENV'] === 'development';
    this.initialize();
  }

  private initialize(): void {
    logger.info('StreamHelper Client starting...', getEnvironmentInfo());
    
    // Check binary availability
    const config = configManager.getConfig();
    logger.info('Binary paths configured', {
      ytdlpPath: config.ytdlpPath,
      ffmpegPath: config.ffmpegPath
    });

    if (!config.ytdlpPath || !existsSync(config.ytdlpPath)) {
      logger.warn('yt-dlp binary not found. Please ensure it is installed.');
    }

    if (!config.ffmpegPath || !existsSync(config.ffmpegPath)) {
      logger.warn('FFmpeg binary not found. yt-dlp will use system FFmpeg if available.');
      
      // Show notification on macOS when FFmpeg is not found
      if (process.platform === 'darwin') {
        this.showFfmpegInstallNotification();
      }
    } else {
      logger.info('FFmpeg binary found and ready', { path: config.ffmpegPath });
    }

    // Setup app event handlers
    this.setupAppEvents();
    
    // Start WebSocket server
    webSocketManager.start();
    
    // Setup WebSocket status listener after manager is started
    ipcHandlers.setupWebSocketStatusListener();
    
    // Create main window when app is ready
    app.whenReady().then(() => {
      this.createMainWindow();
    });
  }

  private setupAppEvents(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });

    // Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });
  }

  private createMainWindow(): void {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      },
      icon: join(__dirname, '..', '..', 'renderer', 'assets', 'icon.svg'),
      title: 'StreamHelper Client',
      show: false
    });

    this.mainWindow = mainWindow;

    // Apply theme based on config
    const config = configManager.getConfig();
    if (config.theme === 'dark' || (config.theme === 'auto' && nativeTheme.shouldUseDarkColors)) {
      nativeTheme.themeSource = 'dark';
    } else {
      nativeTheme.themeSource = 'light';
    }

    // Load the built renderer files
    // __dirname is dist/main/main/, so we need to go up two levels to reach dist/
    const rendererPath = join(__dirname, '..', '..', 'renderer', 'index.html');
    logger.info('Loading renderer from:', rendererPath);
    
    mainWindow.loadFile(rendererPath);
    
    // Open DevTools in development mode
    if (this.isDev) {
      mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      logger.info('Main window ready');
      // Setup IPC handlers after window is created
      if (this.mainWindow) {
        ipcHandlers.setMainWindow(this.mainWindow);
      }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private cleanup(): void {
    logger.info('Cleaning up application...');
    
    // Stop WebSocket server
    webSocketManager.stop();
    
    // Cancel all active downloads
    const downloads = downloadManager.getDownloads();
    downloads.forEach(download => {
      if (download.status === 'downloading') {
        downloadManager.cancelDownload(download.id);
      }
    });
    
    logger.info('Cleanup completed');
  }

  /**
   * Show notification to user about installing FFmpeg on macOS
   */
  private showFfmpegInstallNotification(): void {
    try {
      const { Notification } = require('electron');
      
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'FFmpeg Not Found',
          body: 'FFmpeg is required for enhanced video processing. Install it using: brew install ffmpeg',
          icon: undefined, // Use default icon
          silent: false
        });
        
        notification.show();
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);
        
        logger.info('FFmpeg installation notification shown to user');
      }
    } catch (error) {
      logger.debug('Could not show FFmpeg installation notification', { error: (error as Error).message });
    }
  }
}

// Start the application
new StreamHelperApp();
