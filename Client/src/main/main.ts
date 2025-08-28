import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { logger } from './utils/logger';
import { configManager } from './config/manager';
import { webSocketManager } from './communication/websocket';
import { downloadManager } from './download/manager';
import { ipcHandlers } from './ipc/handlers';
import { getEnvironmentInfo, getBinaryInfo } from './utils/environment';

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
    const binaryInfo = getBinaryInfo();
    logger.info('Binary information', binaryInfo);

    if (!binaryInfo.exists) {
      logger.warn('yt-dlp binary not found. Please ensure it is installed.');
    }

    // Setup app event handlers
    this.setupAppEvents();
    
    // Start WebSocket server
    webSocketManager.start();
    
    // Create main window when app is ready
    app.whenReady().then(() => {
      this.createMainWindow();
      // Setup IPC handlers after window is created
      if (this.mainWindow) {
        ipcHandlers.setMainWindow(this.mainWindow);
      }
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
}

// Start the application
new StreamHelperApp();
