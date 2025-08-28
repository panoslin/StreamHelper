import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { DownloadItem, StreamData, DownloadProgress } from '../../types';
import { generateId } from '../../shared/utils';
import { configManager } from '../config/manager';
import { logger } from '../utils/logger';
import { ipcHandlers } from '../ipc/handlers';
import { IPC_CHANNELS } from '../../shared/constants';

export class DownloadManager {
  private downloads: Map<string, DownloadItem> = new Map();
  private activeDownloads: Map<string, { process: ChildProcess; progressInterval: NodeJS.Timeout }> = new Map();
  private downloadQueue: string[] = [];
  private maxConcurrentDownloads: number;

  constructor() {
    this.maxConcurrentDownloads = configManager.get('maxConcurrentDownloads');
    this.ensureDownloadDirectory();
  }

  private ensureDownloadDirectory(): void {
    const downloadDir = configManager.get('defaultDownloadDir');
    if (!existsSync(downloadDir)) {
      mkdirSync(downloadDir, { recursive: true });
      logger.info('Download directory created', { path: downloadDir });
    }
  }

  async enqueueStream(stream: StreamData, priority = 0): Promise<number> {
    const downloadItem: DownloadItem = {
      id: generateId(),
      stream,
      status: 'pending',
      progress: 0,
      priority,
      createdAt: new Date()
    };

    this.downloads.set(downloadItem.id, downloadItem);
    
    // Add to queue based on priority
    if (priority > 0) {
      this.downloadQueue.unshift(downloadItem.id);
    } else {
      this.downloadQueue.push(downloadItem.id);
    }

    logger.info('Stream enqueued for download', { 
      id: downloadItem.id, 
      url: stream.url, 
      priority 
    });

    // Notify renderer about new download
    try {
      ipcHandlers.sendNewStream(stream);
      logger.info('Sent new stream notification to renderer', { streamId: downloadItem.id });
      
      // Also send the download item directly to update the UI
      const downloadItemForUI = {
        id: downloadItem.id,
        stream: downloadItem.stream,
        status: downloadItem.status,
        progress: downloadItem.progress,
        priority: downloadItem.priority,
        createdAt: downloadItem.createdAt
      };
      
      ipcHandlers.sendDownloadProgress({
        id: downloadItem.id,
        progress: 0,
        status: 'pending',
        type: 'new'
      });
      
    } catch (error) {
      logger.error('Failed to send new stream notification', { error, streamId: downloadItem.id });
    }

    this.processQueue();
    return this.downloadQueue.indexOf(downloadItem.id);
  }

  private processQueue(): void {
    const activeCount = this.activeDownloads.size;
    const availableSlots = this.maxConcurrentDownloads - activeCount;

    if (availableSlots <= 0 || this.downloadQueue.length === 0) {
      return;
    }

    for (let i = 0; i < availableSlots && i < this.downloadQueue.length; i++) {
      const downloadId = this.downloadQueue.shift();
      if (downloadId) {
        this.startDownload(downloadId);
      }
    }
  }

  private async startDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      logger.error('Download not found', { downloadId });
      return;
    }

    download.status = 'downloading';
    download.startedAt = new Date();

    const ytdlpPath = configManager.get('ytdlpPath');
    const downloadDir = configManager.get('defaultDownloadDir');
    
    // Create filename from page title
    const safeTitle = download.stream.pageTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const outputTemplate = join(downloadDir, `${safeTitle}_%(epoch)s.%(ext)s`);

    const args = [
      download.stream.url,
      '-o', outputTemplate,
      // '--progress-template', 'download:%(progress.downloaded_bytes)s/%(progress.total_bytes)s %(progress.speed)s %(progress.eta)s',
      // '--newline',
      '--no-playlist',
      // '--extract-audio',
      // '--audio-format', 'mp3',
      // '--audio-quality', '0',
      '--no-check-certificate', // Fix SSL certificate issues
      '--ignore-errors', // Continue on errors
      '--retries', '3' // Retry failed downloads
    ];

    try {
      const process = spawn(ytdlpPath, args);

      process.stdout?.on('data', (data: Buffer) => {
        this.parseProgress(downloadId, data.toString());
      });

      process.stderr?.on('data', (data: Buffer) => {
        this.parseProgress(downloadId, data.toString());
      });

      // Send periodic progress updates to ensure UI stays responsive
      const progressInterval = setInterval(() => {
        const currentDownload = this.downloads.get(downloadId);
        if (currentDownload && currentDownload.status === 'downloading') {
          try {
            ipcHandlers.sendDownloadProgress({
              id: downloadId,
              progress: currentDownload.progress,
              speed: currentDownload.speed || '',
              eta: currentDownload.eta || '',
              status: 'downloading'
            });
          } catch (error) {
            logger.error('Failed to send periodic progress update', { error, downloadId });
          }
        }
      }, 1000); // Update every second

      // Store the interval ID to clear it when download completes
      this.activeDownloads.set(downloadId, { process, progressInterval });

      process.on('close', (code: number) => {
        this.handleDownloadComplete(downloadId, code);
      });

      process.on('error', (error: Error) => {
        this.handleDownloadError(downloadId, error);
      });

      logger.info('Download started', { 
        id: downloadId, 
        url: download.stream.url,
        command: `${ytdlpPath} ${args.join(' ')}`
      });

    } catch (error) {
      this.handleDownloadError(downloadId, error as Error);
    }
  }

  private parseProgress(downloadId: string, output: string): void {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    // Log all output for debugging
    logger.debug('yt-dlp output', { downloadId, output: output.trim() });

    // Parse yt-dlp progress output - try multiple formats
    let progress = 0;
    let speed = '';
    let eta = '';

    // Format 1: download:123456/1234567 1.2MiB/s 123 (old custom format)
    const progressMatch1 = output.match(/download:(\d+)\/(\d+)\s+([\d.]+[KMGT]iB\/s)\s+(\d+)/);
    if (progressMatch1) {
      const [, downloaded, total, speedStr, etaStr] = progressMatch1;
      progress = Math.round((parseInt(downloaded) / parseInt(total)) * 100);
      speed = speedStr;
      eta = etaStr;
    }
    
    // Format 2: [download] 12.3% of ~123.4MiB at 1.2MiB/s ETA 00:12
    const progressMatch2 = output.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+[KMGT]iB)\s+at\s+([\d.]+[KMGT]iB\/s)\s+ETA\s+(\d+:\d+)/);
    if (progressMatch2) {
      const [, percent, size, speedStr, etaStr] = progressMatch2;
      progress = Math.round(parseFloat(percent));
      speed = speedStr;
      eta = etaStr;
      console.log('Format 2 matched:', { percent, speed, eta });
    }

    // Format 3: [download] Downloading item 12 of 445
    const progressMatch3 = output.match(/\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/);
    if (progressMatch3) {
      const [, current, total] = progressMatch3;
      progress = Math.round((parseInt(current) / parseInt(total)) * 100);
      console.log('Format 3 matched:', { current, total, progress });
    }

    // Format 4: [download] 12.3% of ~123.4MiB at 1.2MiB/s ETA 02:32 (frag 22/1344)
    const progressMatch4 = output.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+[KMGT]iB)\s+at\s+([\d.]+[KMGT]iB\/s)\s+ETA\s+(\d+:\d+)\s*\(frag\s+(\d+)\/(\d+)\)/);
    if (progressMatch4) {
      const [, percent, size, speedStr, etaStr, fragCurrent, fragTotal] = progressMatch4;
      progress = Math.round(parseFloat(percent));
      speed = speedStr;
      eta = etaStr;
      
      // Also calculate progress based on fragment count for more accuracy
      const fragProgress = Math.round((parseInt(fragCurrent) / parseInt(fragTotal)) * 100);
      // Use the higher of the two progress values
      progress = Math.max(progress, fragProgress);
      console.log('Format 4 matched:', { percent, speed, eta, fragCurrent, fragTotal, fragProgress, finalProgress: progress });
    }

    // If we found any progress, update the download and send to renderer
    if (progress > 0 || output.includes('[download]')) {
      // Always update progress to show real-time updates from yt-dlp
      if (progress > 0) {
        download.progress = progress;
        console.log('Progress updated to:', progress);
      }
      if (speed) download.speed = speed;
      if (eta) download.eta = eta;

      // Send progress update to renderer
      try {
        const progressUpdate = {
          id: downloadId,
          progress: download.progress,
          speed: download.speed,
          eta: download.eta,
          status: 'downloading'
        };
        console.log('Sending progress update to renderer:', progressUpdate);
        ipcHandlers.sendDownloadProgress(progressUpdate);
        logger.debug('Sent progress update to renderer', { downloadId, progress: download.progress, speed, eta });
      } catch (error) {
        logger.error('Failed to send progress update', { error, downloadId });
      }
    } else {
      console.log('No progress found in output:', output.trim());
    }
  }

  private handleDownloadComplete(downloadId: string, code: number): void {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    const activeDownload = this.activeDownloads.get(downloadId);
    if (activeDownload) {
      clearInterval(activeDownload.progressInterval);
      this.activeDownloads.delete(downloadId);
    }

    if (code === 0) {
      download.status = 'completed';
      download.progress = 100;
      download.completedAt = new Date();
      logger.info('Download completed successfully', { id: downloadId });
      
      ipcHandlers.sendDownloadCompleted(downloadId);
    } else {
      download.status = 'failed';
      download.error = `Process exited with code ${code}`;
      logger.error('Download failed', { id: downloadId, code });
      
      ipcHandlers.sendDownloadFailed(downloadId, download.error);
    }

    // Process next item in queue
    this.processQueue();
  }

  private handleDownloadError(downloadId: string, error: Error): void {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    const activeDownload = this.activeDownloads.get(downloadId);
    if (activeDownload) {
      clearInterval(activeDownload.progressInterval);
      this.activeDownloads.delete(downloadId);
    }
    download.status = 'failed';
    download.error = error.message;
    
    logger.error('Download error', { id: downloadId, error: error.message });
    
    ipcHandlers.sendDownloadFailed(downloadId, error.message);

    this.processQueue();
  }

  pauseDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    const activeDownload = this.activeDownloads.get(downloadId);

    if (!download || !activeDownload) {
      return false;
    }

    if (download.status === 'downloading') {
      activeDownload.process.kill('SIGSTOP');
      download.status = 'paused';
      logger.info('Download paused', { downloadId });
      return true;
    }

    return false;
  }

  resumeDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    const activeDownload = this.activeDownloads.get(downloadId);

    if (!download || !activeDownload) {
      return false;
    }

    if (download.status === 'paused') {
      activeDownload.process.kill('SIGCONT');
      download.status = 'downloading';
      logger.info('Download resumed', { downloadId });
      return true;
    }

    return false;
  }

  cancelDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    const activeDownload = this.activeDownloads.get(downloadId);

    if (!download) {
      return false;
    }

    if (activeDownload) {
      activeDownload.process.kill('SIGTERM');
      clearInterval(activeDownload.progressInterval);
      this.activeDownloads.delete(downloadId);
    }

    download.status = 'failed';
    download.error = 'Download cancelled by user';
    
    // Remove from queue if it's still there
    const queueIndex = this.downloadQueue.indexOf(downloadId);
    if (queueIndex > -1) {
      this.downloadQueue.splice(queueIndex, 1);
    }

    logger.info('Download cancelled', { downloadId });
    this.processQueue();
    return true;
  }

  getDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }

  getDownload(downloadId: string): DownloadItem | undefined {
    return this.downloads.get(downloadId);
  }

  clearCompleted(): void {
    const completedIds = Array.from(this.downloads.values())
      .filter(d => d.status === 'completed' || d.status === 'failed')
      .map(d => d.id);

    completedIds.forEach(id => {
      this.downloads.delete(id);
    });

    logger.info('Completed downloads cleared', { count: completedIds.length });
  }
}

export const downloadManager = new DownloadManager();
