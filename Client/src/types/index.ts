export interface StreamData {
  url: string;
  pageTitle: string;
  pageUrl: string;
  userAgent: string;
  timestamp: number;
  id?: string;
}

export interface DownloadItem {
  id: string;
  stream: StreamData;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  speed?: string;
  eta?: string;
  outputPath?: string;
  outputTemplate?: string;
  error?: string;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount?: number;
  pausedProgress?: number;
  pausedSpeed?: string;
  pausedEta?: string;
}

export interface WebSocketMessage {
  type: 'STREAM_CAPTURED' | 'DOWNLOAD_PROGRESS' | 'DOWNLOAD_COMPLETED' | 'DOWNLOAD_FAILED' | 'CONNECTION_ESTABLISHED' | 'STREAM_ENQUEUED' | 'NEW_STREAM_ADDED' | 'ERROR';
  data: any;
}

export interface AppConfig {
  webSocketPort: number;
  maxConcurrentDownloads: number;
  defaultDownloadDir: string;
  ytdlpPath: string;
  autoStartDownloads: boolean;
  notifications: boolean;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  speed?: string;
  eta?: string;
  status: 'downloading' | 'completed' | 'failed';
}
