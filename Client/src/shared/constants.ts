import { AppConfig } from '../types';

export { AppConfig };

export const DEFAULT_CONFIG: AppConfig = {
  webSocketPort: 8080,
  maxConcurrentDownloads: 3,
  defaultDownloadDir: '~/Downloads/StreamHelper',
  ytdlpPath: '',
  autoStartDownloads: true,
  notifications: true
};

export const IPC_CHANNELS = {
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

export const DOWNLOAD_STATUS = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused'
} as const;

export const PLATFORMS = {
  DARWIN: 'darwin',
  WIN32: 'win32',
  LINUX: 'linux'
} as const;
