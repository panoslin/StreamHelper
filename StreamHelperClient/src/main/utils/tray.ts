import { Tray, nativeImage, Menu, app, BrowserWindow } from 'electron';
import { join } from 'path';
import { isDevelopment } from './environment';
import { APP_NAME } from '@/shared/constants';

let tray: Tray | null = null;

export function createTray(): Tray {
  // Create tray icon
  const iconPath = isDevelopment() 
    ? join(__dirname, '../../assets/icon.png')
    : join(__dirname, '../assets/icon.png');
  
  const icon = nativeImage.createFromPath(iconPath);
  
  // Resize icon for tray (16x16 is standard)
  icon.resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  
  // Create tray menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: APP_NAME,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const mainWindow = windows[0];
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Hide Window',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].hide();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Downloads',
      submenu: [
        {
          label: 'Start All',
          click: () => {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
              windows[0].webContents.send('tray:start-all-downloads');
            }
          },
        },
        {
          label: 'Pause All',
          click: () => {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
              windows[0].webContents.send('tray:pause-all-downloads');
            }
          },
        },
        {
          label: 'Clear Completed',
          click: () => {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
              windows[0].webContents.send('tray:clear-completed');
            }
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send('tray:open-settings');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Handle tray click (show/hide window)
  tray.on('click', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  
  // Handle double click
  tray.on('double-click', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export function updateTrayTooltip(tooltip: string): void {
  if (tray) {
    tray.setToolTip(tooltip);
  }
}

export function updateTrayIcon(iconPath: string): void {
  if (tray) {
    const icon = nativeImage.createFromPath(iconPath);
    icon.resize({ width: 16, height: 16 });
    tray.setImage(icon);
  }
}
