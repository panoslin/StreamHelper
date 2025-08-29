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
    const safeTitle = this.createSafeFilename(download.stream.pageTitle);
    const outputTemplate = join(downloadDir, `${safeTitle}.%(ext)s`);
    console.log('outputTemplate', outputTemplate);

    const args = [
      download.stream.url,
      '-o', outputTemplate,
      '--no-playlist',
      '--no-check-certificate', // Skip SSL verification (fixes SSL error)
      '--ignore-errors', // Continue on errors
      '--retries', '3', // Retry failed downloads
      '--format', 'best[ext=mp4]/best', // Add format selection for better reliability
      '--no-part', // Don't create .part files
      '--force-overwrites' // Overwrite existing files
    ];

    // Add referer header if we have the page URL
    if (download.stream.pageUrl && download.stream.pageUrl !== 'Unknown') {
      try {
        const pageUrl = new URL(download.stream.pageUrl);
        const referer = `${pageUrl.protocol}//${pageUrl.host}${pageUrl.pathname}`;
        args.push('--add-header', `Referer:${referer}`);
      } catch (error) {
        // If URL parsing fails, use the page URL as-is
        args.push('--add-header', `Referer:${download.stream.pageUrl}`);
      }
    }

    // Add user agent header to mimic browser
    if (download.stream.userAgent && download.stream.userAgent !== 'Unknown') {
      args.push('--add-header', `User-Agent:${download.stream.userAgent}`);
    } else {
      // Fallback to realistic user agent
      args.push('--add-header', 'User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    // Add origin header for CORS compliance
    if (download.stream.pageUrl && download.stream.pageUrl !== 'Unknown') {
      try {
        const pageUrl = new URL(download.stream.pageUrl);
        const origin = `${pageUrl.protocol}//${pageUrl.host}`;
        args.push('--add-header', `Origin:${origin}`);
      } catch (error) {
        // If URL parsing fails, skip origin header
        logger.warn('Failed to parse page URL for origin header', { error, pageUrl: download.stream.pageUrl });
      }
    }

    try {
      const process = spawn(ytdlpPath, args);

      // If this is a resumed download, restore the preserved progress
      if (download.pausedProgress !== undefined) {
        download.progress = download.pausedProgress;
        download.speed = download.pausedSpeed;
        download.eta = download.pausedEta;
        
        // Send initial progress update to restore UI state
        ipcHandlers.sendDownloadProgress({
          id: downloadId,
          progress: download.progress,
          speed: download.speed || '',
          eta: download.eta || '',
          status: 'downloading'
        });
      }

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
    // logger.debug('yt-dlp output', { downloadId, output: output.trim() });

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
      // console.log('Format 2 matched:', { percent, speed, eta });
    }

    // Format 3: [download] Downloading item 12 of 445
    const progressMatch3 = output.match(/\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/);
    if (progressMatch3) {
      const [, current, total] = progressMatch3;
      progress = Math.round((parseInt(current) / parseInt(total)) * 100);
      // console.log('Format 3 matched:', { current, total, progress });
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
      // console.log('Format 4 matched:', { percent, speed, eta, fragCurrent, fragTotal, fragProgress, finalProgress: progress });
    }

    // If we found any progress, update the download and send to renderer
    if (progress > 0 || output.includes('[download]')) {
      // Always update progress to show real-time updates from yt-dlp
      if (progress > 0) {
        download.progress = progress;
        // console.log('Progress updated to:', progress);
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
        // console.log('Sending progress update to renderer:', progressUpdate);
        ipcHandlers.sendDownloadProgress(progressUpdate);
        // logger.debug('Sent progress update to renderer', { downloadId, progress: download.progress, speed, eta });
      } catch (error) {
        logger.error('Failed to send progress update', { error, downloadId });
      }
    } else {
      // console.log('No progress found in output:', output.trim());
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

    // Check if this download was intentionally paused
    if (download.status === 'paused') {
      logger.info('Download process terminated while paused', { id: downloadId, code });
      // Don't process queue for paused downloads - they'll be resumed manually
      return;
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

    // Check if this download was intentionally paused
    if (download.status === 'paused') {
      logger.info('Download error occurred while paused', { id: downloadId, error: error.message });
      // Don't process queue for paused downloads - they'll be resumed manually
      return;
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

    if (!download) {
      logger.warn('Download not found for pause', { downloadId });
      return false;
    }

    if (!activeDownload) {
      logger.warn('Download not active for pause', { downloadId, status: download.status });
      return false;
    }

    if (download.status === 'downloading') {
      try {
        // Mark as paused first to prevent auto-restart
        download.status = 'paused';
        
        // Clear the progress interval to stop updates
        clearInterval(activeDownload.progressInterval);
        
        // Store current progress and state for resume
        download.pausedProgress = download.progress;
        download.pausedSpeed = download.speed;
        download.pausedEta = download.eta;
        
        // Kill the process to actually stop the download
        activeDownload.process.kill('SIGTERM');
        
        // Remove from activeDownloads since we killed the process
        this.activeDownloads.delete(downloadId);
        
        // Add to resume queue for manual restart
        if (!this.downloadQueue.includes(downloadId)) {
          this.downloadQueue.unshift(downloadId);
        }
        
        logger.info('Download paused and process terminated', { downloadId });
        return true;
      } catch (error) {
        logger.error('Failed to pause download', { downloadId, error });
        // Revert status if pause failed
        download.status = 'downloading';
        return false;
      }
    } else if (download.status === 'paused') {
      logger.info('Download already paused', { downloadId });
      return true; // Already paused, consider this a success
    } else {
      logger.warn('Cannot pause download in current status', { downloadId, status: download.status });
      return false;
    }
  }

  resumeDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    
    if (!download) {
      logger.warn('Download not found for resume', { downloadId });
      return false;
    }

    if (download.status !== 'paused') {
      logger.warn('Cannot resume non-paused download', { downloadId, status: download.status });
      return false;
    }

    try {
      // Restore paused progress and state
      if (download.pausedProgress !== undefined) {
        download.progress = download.pausedProgress;
        download.speed = download.pausedSpeed;
        download.eta = download.pausedEta;
        
        // Clear paused state
        download.pausedProgress = undefined;
        download.pausedSpeed = undefined;
        download.pausedEta = undefined;
      }
      
      // Reset status to pending for restart
      download.status = 'pending';
      
      // Remove from queue if it's there
      const queueIndex = this.downloadQueue.indexOf(downloadId);
      if (queueIndex > -1) {
        this.downloadQueue.splice(queueIndex, 1);
      }
      
      // Add to front of queue for immediate processing
      this.downloadQueue.unshift(downloadId);
      
      // Process queue to start the download
      this.processQueue();
      
      logger.info('Download queued for resume with preserved progress', { downloadId });
      return true;
    } catch (error) {
      logger.error('Failed to resume download', { downloadId, error });
      return false;
    }
  }

  private restartDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    if (!download) {
      logger.warn('Download not found for restart', { downloadId });
      return false;
    }

    try {
      // Reset download state for restart
      download.status = 'pending';
      download.progress = download.progress || 0; // Keep current progress
      
      // Remove from queue if it's there
      const queueIndex = this.downloadQueue.indexOf(downloadId);
      if (queueIndex > -1) {
        this.downloadQueue.splice(queueIndex, 1);
      }
      
      // Add to front of queue for immediate processing
      this.downloadQueue.unshift(downloadId);
      
      // Process queue to start the download
      this.processQueue();
      
      logger.info('Download queued for restart', { downloadId });
      return true;
    } catch (error) {
      logger.error('Failed to restart download', { downloadId, error });
      return false;
    }
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

  retryDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    
    if (!download) {
      logger.warn('Download not found for retry', { downloadId });
      return false;
    }

    if (download.status !== 'failed') {
      logger.warn('Cannot retry non-failed download', { downloadId, status: download.status });
      return false;
    }

    // Reset download state
    download.status = 'pending';
    download.progress = 0;
    download.speed = undefined;
    download.eta = undefined;
    download.error = undefined;
    download.retryCount = (download.retryCount || 0) + 1;

    // Add back to queue with higher priority
    this.downloadQueue.unshift(downloadId);

    logger.info('Download queued for retry', { 
      downloadId, 
      retryCount: download.retryCount,
      url: download.stream.url 
    });

    // Process queue to start the retry
    this.processQueue();
    return true;
  }

  removeFailedDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    
    if (!download) {
      logger.warn('Download not found for removal', { downloadId });
      return false;
    }

    if (download.status !== 'failed') {
      logger.warn('Cannot remove non-failed download', { downloadId, status: download.status });
      return false;
    }

    // Remove from downloads map
    this.downloads.delete(downloadId);
    
    // Remove from queue if it's still there
    const queueIndex = this.downloadQueue.indexOf(downloadId);
    if (queueIndex > -1) {
      this.downloadQueue.splice(queueIndex, 1);
    }

    logger.info('Failed download removed', { 
      downloadId, 
      url: download.stream.url 
    });

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

  /**
   * Create a safe, readable filename from page title
   * @param pageTitle - The original page title
   * @returns Safe filename without invalid characters
   */
  private createSafeFilename(pageTitle: string): string {
    if (!pageTitle || pageTitle === 'Unknown Stream') {
      return `stream_${Date.now()}`;
    }

    // Clean the title: preserve more meaningful content while ensuring safety
    let cleanTitle = pageTitle
      // Remove HTML entities
      .replace(/&[a-zA-Z]+;/g, '') // Remove HTML entities like &nbsp;, &amp;, etc.
      // Remove only the most problematic characters, preserve more content
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim();

    // If title is empty after cleaning, use timestamp
    if (!cleanTitle || cleanTitle.length < 3) {
      cleanTitle = `stream_${Date.now()}`;
    }

    // If title is too long, truncate intelligently
    if (cleanTitle.length > 80) {
      // Try to find a good breaking point (word boundary)
      const truncated = cleanTitle.substring(0, 80);
      const lastSpaceIndex = truncated.lastIndexOf(' ');
      if (lastSpaceIndex > 50) { // Only break at word if we have enough content
        cleanTitle = truncated.substring(0, lastSpaceIndex);
      } else {
        cleanTitle = truncated;
      }
    }

    // Add timestamp to ensure uniqueness (but make it readable)
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '') // Remove colons and hyphens
      .replace(/\..+/, '') // Remove milliseconds
      .substring(8, 14); // Get only HHMMSS part

    return `${cleanTitle}_${timestamp}`;
  }
}

export const downloadManager = new DownloadManager();
