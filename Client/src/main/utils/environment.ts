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
  return {
    ytdlp: getYtDlpBinaryInfo(),
    ffmpeg: getFfmpegBinaryInfo()
  };
}

function getYtDlpBinaryInfo() {
  return getBinaryInfoFor('yt-dlp');
}

function getFfmpegBinaryInfo() {
  return getBinaryInfoFor('ffmpeg');
}

function getBinaryInfoFor(binaryName: string) {
  // Use the same corrected path resolution logic as ConfigManager
  const platform = process.platform;
  const executableName = platform === 'win32' ? `${binaryName}.exe` : binaryName;
  
  // In bundled apps with ASAR enabled:
  // - app.getAppPath() points to the app directory inside Resources
  // - Binaries are unpacked to app.asar.unpacked/dist/bin/{platform}/{executableName}
  const appPath = app.getAppPath();
  
  // Try multiple possible paths for the unpacked binaries
  const possiblePaths = [];
  
  // Path 1: Standard unpacked path
  const resourcesPath = appPath.replace('/app', '');
  const unpackedPath = join(resourcesPath, 'app.asar.unpacked', 'dist', 'bin', platform, executableName);
  possiblePaths.push(unpackedPath);
  
  // Path 2: Alternative unpacked path (if app.getAppPath() returns different structure)
  const altUnpackedPath = join(appPath, '..', 'app.asar.unpacked', 'dist', 'bin', platform, executableName);
  possiblePaths.push(altUnpackedPath);
  
  // Path 3: Direct unpacked path from app root
  const directUnpackedPath = join(appPath, 'app.asar.unpacked', 'dist', 'bin', platform, executableName);
  possiblePaths.push(directUnpackedPath);
  
  // Path 4: Fallback to the old path for development
  const fallbackPath = join(appPath, 'dist', 'bin', platform, executableName);
  possiblePaths.push(fallbackPath);
  
  // Find the first path that exists
  let binaryPath = null;
  for (const path of possiblePaths) {
    if (require('fs').existsSync(path)) {
      binaryPath = path;
      break;
    }
  }
  
  // If no path exists, use the first unpacked path as default
  if (!binaryPath) {
    binaryPath = unpackedPath;
  }
  
  const currentPlatform = osPlatform();
  
  return {
    name: binaryName,
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
