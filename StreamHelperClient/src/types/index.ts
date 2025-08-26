// Communication protocol types
export interface StreamMessage {
  type: 'STREAM_CAPTURED' | 'DOWNLOAD_REQUEST' | 'DOWNLOAD_PROGRESS' | 'DOWNLOAD_COMPLETE' | 'DOWNLOAD_ERROR' | 'CLIENT_STATUS';
  id: string;
  timestamp: number;
  data: any;
}

export interface StreamData {
  id: string;
  url: string;
  pageTitle: string;
  pageUrl: string;
  timestamp: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress?: number;
  error?: string;
  downloadPath?: string;
  fileSize?: number;
  duration?: number;
  quality?: string;
  format?: string;
}

export interface DownloadRequest {
  streamId: string;
  quality: 'auto' | 'best' | 'worst' | string;
  format: 'mp4' | 'mkv' | 'webm' | 'auto';
  outputDir: string;
  filename?: string;
  includeSubtitles: boolean;
  includeThumbnail: boolean;
}

export interface DownloadProgress {
  streamId: string;
  percentage: number;
  speed: string;
  eta: string;
  downloaded: string;
  total: string;
  status: 'downloading' | 'processing' | 'completed' | 'error' | 'queued' | 'cancelled';
}

export interface ClientStatus {
  connected: boolean;
  version: string;
  platform: string;
  downloadQueue: number;
  activeDownloads: number;
}

// Application configuration types
export interface AppConfig {
  downloadDirectory: string;
  maxConcurrentDownloads: number;
  defaultQuality: 'auto' | 'best' | 'worst';
  defaultFormat: 'mp4' | 'mkv' | 'webm' | 'auto';
  includeSubtitles: boolean;
  includeThumbnail: boolean;
  autoStartDownloads: boolean;
  notificationSound: boolean;
  minimizeToTray: boolean;
  startWithSystem: boolean;
}

export interface YtDlpConfig {
  binaryPath: string;
  version: string;
  supportedFormats: string[];
  supportedQualities: string[];
}

// Platform types
export type Platform = 'win32' | 'darwin' | 'linux';

// Event types
export interface AppEvents {
  'stream:captured': StreamData;
  'download:started': DownloadRequest;
  'download:progress': DownloadProgress;
  'download:completed': StreamData;
  'download:error': { streamId: string; error: string };
  'client:connected': void;
  'client:disconnected': void;
}

// UI component types
export interface StreamListItemProps {
  stream: StreamData;
  onDownload: (streamId: string) => void;
  onCancel: (streamId: string) => void;
  onRetry: (streamId: string) => void;
}

export interface DownloadQueueItemProps {
  download: DownloadProgress;
  onCancel: (streamId: string) => void;
  onPause: (streamId: string) => void;
  onResume: (streamId: string) => void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type EventCallback<T = any> = (data: T) => void;
export type EventMap = Record<string, EventCallback>;
