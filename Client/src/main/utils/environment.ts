import { platform as osPlatform } from 'os';
import { join } from 'path';
import { app } from 'electron';

export function getEnvironmentInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    appVersion: app.getVersion(),
    appName: app.getName()
  };
}

export function getBinaryInfo() {
  // Use the same corrected path resolution logic as ConfigManager
  const platform = process.platform;
  const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  
  // In bundled apps, app.getAppPath() points to the app directory inside Resources
  // The binaries are located at app/dist/bin/{platform}/{binaryName}
  const appPath = app.getAppPath();
  const binaryPath = join(appPath, 'dist', 'bin', platform, binaryName);
  
  const currentPlatform = osPlatform();
  
  return {
    path: binaryPath,
    platform: currentPlatform,
    exists: require('fs').existsSync(binaryPath),
    executable: currentPlatform !== 'win32' // Unix-like systems need executable permissions
  };
}

export function getAppPaths() {
  const userDataPath = app.getPath('userData');
  const downloadsPath = app.getPath('downloads');
  
  return {
    userData: userDataPath,
    downloads: downloadsPath,
    logs: join(userDataPath, 'logs'),
    config: join(userDataPath, 'config.json'),
    temp: join(userDataPath, 'temp')
  };
}
