// Application constants
export const APP_NAME = 'StreamHelper Client';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Desktop client for StreamHelper Chrome extension';

// Communication constants
export const WEBSOCKET_PORT = 8080;
export const WEBSOCKET_HOST = 'localhost';
export const WEBSOCKET_URL = `ws://${WEBSOCKET_HOST}:${WEBSOCKET_PORT}`;

// Download constants
export const DEFAULT_DOWNLOAD_DIR = '~/Downloads/StreamHelper';
export const MAX_CONCURRENT_DOWNLOADS = 3;
export const DEFAULT_QUALITY = 'auto';
export const DEFAULT_FORMAT = 'mp4';
export const SUPPORTED_FORMATS = ['mp4', 'mkv', 'webm', 'avi', 'mov'];
export const SUPPORTED_QUALITIES = ['auto', 'best', 'worst', '144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];

// File constants
export const SUPPORTED_EXTENSIONS = ['.m3u8', '.mpd', '.mp4', '.mkv', '.webm'];
export const MAX_FILENAME_LENGTH = 255;
export const ILLEGAL_CHARS = /[<>:"/\\|?*]/g;

// UI constants
export const ANIMATION_DURATION = 200;
export const TOAST_DURATION = 5000;
export const REFRESH_INTERVAL = 1000;
export const MAX_STREAMS_DISPLAY = 100;

// Error messages
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: 'Failed to connect to StreamHelper extension',
  DOWNLOAD_FAILED: 'Download failed. Please check the URL and try again.',
  INVALID_URL: 'Invalid stream URL provided',
  BINARY_NOT_FOUND: 'yt-dlp binary not found. Please check your installation.',
  PERMISSION_DENIED: 'Permission denied. Please check your download directory.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  DOWNLOAD_STARTED: 'Download started successfully',
  DOWNLOAD_COMPLETED: 'Download completed successfully',
  CONNECTION_ESTABLISHED: 'Connected to StreamHelper extension',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const;

// Platform-specific constants
export const PLATFORM_CONFIG = {
  win32: {
    binaryName: 'yt-dlp.exe',
    pathSeparator: '\\',
    homeDir: process.env.USERPROFILE || '',
  },
  darwin: {
    binaryName: 'yt-dlp',
    pathSeparator: '/',
    homeDir: process.env.HOME || '',
  },
  linux: {
    binaryName: 'yt-dlp',
    pathSeparator: '/',
    homeDir: process.env.HOME || '',
  },
} as const;

// yt-dlp constants
export const YTDLP_CONFIG = {
  MIN_VERSION: '2023.12.30',
  UPDATE_CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  TIMEOUT: 300000, // 5 minutes
  MAX_RETRIES: 3,
} as const;

// Event names
export const EVENTS = {
  STREAM_CAPTURED: 'stream:captured',
  DOWNLOAD_STARTED: 'download:started',
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETED: 'download:completed',
  DOWNLOAD_ERROR: 'download:error',
  CLIENT_CONNECTED: 'client:connected',
  CLIENT_DISCONNECTED: 'client:disconnected',
  SETTINGS_CHANGED: 'settings:changed',
  APP_READY: 'app:ready',
} as const;
