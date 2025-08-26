import { app, BrowserWindow, Menu, nativeImage, ipcMain, shell } from 'electron';
import { join } from 'path';
import { isDevelopment } from './utils/environment';
import { setupIpcHandlers } from './ipc/handlers';
import { setupWebSocketServer } from './communication/websocket';
import { setupDownloadManager } from './download/manager';
import { setupConfigManager } from './config/manager';

import { APP_NAME, APP_VERSION } from '../shared/constants';

// Global references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;


// App event handlers
app.whenReady().then(async () => {
  console.log(`${APP_NAME} v${APP_VERSION} starting...`);
  
  try {
    // Initialize core systems
    await setupConfigManager();
    await setupDownloadManager();
    await setupWebSocketServer();
    
    // Create main window
    createMainWindow();
    
    // Setup IPC handlers
    setupIpcHandlers();
    
    
    
    // Setup app menu
    createApplicationMenu();
    
    console.log(`${APP_NAME} started successfully`);
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create the window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  // Cleanup before quitting

});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createMainWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    icon: join(__dirname, '../assets/icon.png'),
  });

  // Load the app
  if (isDevelopment()) {
    // In development, load from built files (since we're building for production)
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Focus the window
    if (mainWindow) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && !isDevelopment()) {
      event.preventDefault();
    }
  });
}

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';
  
  const template: Electron.MenuItemConstructorOptions[] = [
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Download',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-download');
          }
        },
        { type: 'separator' },
        {
          label: 'Open Download Folder',
          click: () => {
            mainWindow?.webContents.send('menu:open-download-folder');
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
          click: () => {
            mainWindow?.webContents.send('menu:preferences');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    // Download menu
    {
      label: 'Download',
      submenu: [
        {
          label: 'Start All',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow?.webContents.send('menu:start-all-downloads');
          }
        },
        {
          label: 'Pause All',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow?.webContents.send('menu:pause-all-downloads');
          }
        },
        {
          label: 'Clear Completed',
          click: () => {
            mainWindow?.webContents.send('menu:clear-completed');
          }
        }
      ]
    },
    
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'About StreamHelper Client',
          click: () => {
            mainWindow?.webContents.send('menu:about');
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/streamhelper/client');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/streamhelper/client/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Export for use in other modules
export { mainWindow };
