import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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
  private persistenceFile!: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.maxConcurrentDownloads = configManager.get('maxConcurrentDownloads');
    this.ensureDownloadDirectory();
    this.initializePersistence();
    this.loadDownloads();
    this.startAutoSave();
  }

  private ensureDownloadDirectory(): void {
    const downloadDir = configManager.get('defaultDownloadDir');
    const expandedDir = this.expandPath(downloadDir);
    
    if (!existsSync(expandedDir)) {
      mkdirSync(expandedDir, { recursive: true });
      logger.info('Download directory created', { path: expandedDir });
    }
  }

  private expandPath(path: string): string {
    // Expand ~ to home directory
    if (path.startsWith('~')) {
      return path.replace('~', require('os').homedir());
    }
    return path;
  }

  private initializePersistence(): void {
    // Set up persistence file path
    let appDataPath = configManager.get('appDataPath') || '~/.streamhelper';
    // Expand tilde to actual home directory
    if (appDataPath.startsWith('~')) {
      appDataPath = appDataPath.replace('~', require('os').homedir());
    }
    this.persistenceFile = join(appDataPath, 'downloads.json');
    
    // Ensure app data directory exists
    if (!existsSync(appDataPath)) {
      mkdirSync(appDataPath, { recursive: true });
      logger.info('App data directory created', { path: appDataPath });
    }
    
    logger.info('Persistence initialized', { 
      originalPath: configManager.get('appDataPath') || '~/.streamhelper',
      expandedPath: appDataPath,
      fullPath: this.persistenceFile
    });
  }

  private loadDownloads(): void {
    try {
      if (!existsSync(this.persistenceFile)) {
        logger.info('No persistence file found, starting with empty downloads');
        return;
      }

      logger.info('Loading downloads from persistence', { file: this.persistenceFile });
      const data = readFileSync(this.persistenceFile, 'utf8');
      const downloadsData = JSON.parse(data);

      // Validate data structure
      if (!downloadsData || !downloadsData.downloads || !Array.isArray(downloadsData.downloads)) {
        logger.warn('Invalid persistence data structure, starting fresh');
        return;
      }

      // Restore downloads with proper date conversion
      this.downloads.clear();
      downloadsData.downloads.forEach(([id, downloadData]: [string, any]) => {
        try {
          // Convert date strings back to Date objects
          if (downloadData.createdAt) {
            downloadData.createdAt = new Date(downloadData.createdAt);
          }
          if (downloadData.startedAt) {
            downloadData.startedAt = new Date(downloadData.startedAt);
          }
          if (downloadData.completedAt) {
            downloadData.completedAt = new Date(downloadData.completedAt);
          }

          // Create download item with validation
          const download: DownloadItem = {
            id: downloadData.id || id,
            stream: downloadData.stream,
            status: downloadData.status || 'pending',
            progress: downloadData.progress || 0,
            speed: downloadData.speed,
            eta: downloadData.eta,
            outputPath: downloadData.outputPath,
            outputTemplate: downloadData.outputTemplate,
            error: downloadData.error,
            priority: downloadData.priority || 0,
            createdAt: downloadData.createdAt || new Date(),
            startedAt: downloadData.startedAt,
            completedAt: downloadData.completedAt,
            retryCount: downloadData.retryCount || 0,
            pausedProgress: downloadData.pausedProgress,
            pausedSpeed: downloadData.pausedSpeed,
            pausedEta: downloadData.pausedEta,
            logs: downloadData.logs // Restore logs from persistence
          };

          this.downloads.set(id, download);
          
          // Debug logging for logs restoration
          if (downloadData.logs) {
            logger.debug('Logs restored for download', { 
              id, 
              hasLogs: !!downloadData.logs,
              stdoutCount: downloadData.logs.stdout?.length || 0,
              stderrCount: downloadData.logs.stderr?.length || 0,
              hasCommand: !!downloadData.logs.fullCommand,
              exitCode: downloadData.logs.exitCode
            });
          } else {
            logger.debug('No logs found for download', { id });
          }
        } catch (error) {
          logger.error('Failed to restore download item', { id, error, data: downloadData });
        }
      });

      // Restore download queue (only pending downloads)
      this.downloadQueue = (downloadsData.downloadQueue || []).filter((id: string) => {
        const download = this.downloads.get(id);
        return download && download.status === 'pending';
      });

      // Reset any stuck downloads to pending
      this.downloads.forEach((download, id) => {
        if (download.status === 'downloading') {
          download.status = 'pending';
          download.progress = 0;
        }
      });

      logger.info('Downloads restored from persistence', { 
        count: this.downloads.size, 
        queueSize: this.downloadQueue.length 
      });

      // Send restored downloads to renderer
      this.downloads.forEach((download, id: string) => {
        try {
          ipcHandlers.sendDownloadProgress({
            id,
            progress: download.progress,
            speed: download.speed || '',
            eta: download.eta || '',
            status: download.status,
            type: 'restored'
          });
        } catch (error) {
          logger.error('Failed to send restored download to renderer', { id, error });
        }
      });

    } catch (error) {
      logger.error('Failed to load downloads from persistence', { 
        error, 
        file: this.persistenceFile 
      });
      // Continue with empty downloads if loading fails
    }
  }

  private saveDownloads(): void {
    try {
      // Prepare data for persistence
      const downloadsData = {
        version: '1.0.0', // For future migrations
        timestamp: new Date().toISOString(),
        downloads: Array.from(this.downloads.entries()),
        downloadQueue: this.downloadQueue
      };

      // Write to file with atomic operation (write to temp file first)
      const tempFile = `${this.persistenceFile}.tmp`;
      writeFileSync(tempFile, JSON.stringify(downloadsData, null, 2), 'utf8');
      
      // Atomic move (rename) to final location
      const fs = require('fs');
      fs.renameSync(tempFile, this.persistenceFile);

      logger.debug('Downloads saved to persistence', { 
        count: this.downloads.size, 
        queueSize: this.downloadQueue.length 
      });
    } catch (error) {
      logger.error('Failed to save downloads to persistence', { error });
    }
  }

  private startAutoSave(): void {
    // Save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveDownloads();
    }, 30000);

    // Also save on app exit
    process.on('exit', () => this.saveDownloads());
    process.on('SIGINT', () => this.saveDownloads());
    process.on('SIGTERM', () => this.saveDownloads());
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  async enqueueStream(stream: StreamData, priority = 0): Promise<number> {
    const downloadItem: DownloadItem = {
      id: generateId(),
      stream,
      status: 'pending',
      progress: 0,
      priority,
      createdAt: new Date(),
      logs: {
        stdout: [],
        stderr: [],
        fullCommand: '',
        exitCode: undefined,
        errorDetails: undefined
      }
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
    
    // Save to persistence
    this.saveDownloads();
    
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

    // Initialize logs for this download (always create logs regardless of status)
    if (!download.logs) {
      download.logs = {
        stdout: [],
        stderr: [],
        fullCommand: '',
        exitCode: undefined,
        errorDetails: undefined
      };
    }

    const ytdlpPath = configManager.get('ytdlpPath');
    const downloadDir = configManager.get('defaultDownloadDir');
    const expandedDir = this.expandPath(downloadDir);
    
    // Create filename from page title or custom name
    const titleToUse = download.stream.customName || download.stream.pageTitle;
    const safeTitle = this.createSafeFilename(titleToUse);
    const outputTemplate = join(expandedDir, `${safeTitle}.%(ext)s`);
    
    // Store the output template for later use
    download.outputTemplate = outputTemplate;

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

    // Store the full command for logging
    if (download.logs) {
      download.logs.fullCommand = `${ytdlpPath} ${args.join(' ')}`;
    }

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
        const output = data.toString();
        this.parseProgress(downloadId, output);
        
        // Store stdout logs
        if (download.logs) {
          download.logs.stdout.push(output);
        }
      });

      process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        this.parseProgress(downloadId, output);
        
        // Store stderr logs
        if (download.logs) {
          download.logs.stderr.push(output);
        }
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
        // Store exit code in logs
        if (download.logs) {
          download.logs.exitCode = code;
        }
        
        this.handleDownloadComplete(downloadId, code);
      });

      process.on('error', (error: Error) => {
        // Store error details in logs
        if (download.logs) {
          download.logs.errorDetails = error.message;
        }
        
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
      
      // Ensure logs are captured for completed downloads
      if (download.logs) {
        download.logs.exitCode = code;
      }
      
      // Determine the actual output path from the template
      if (download.outputTemplate) {
        // Try to find the actual file by looking for files matching the pattern
        const downloadDir = configManager.get('defaultDownloadDir');
        const expandedDir = downloadDir.replace(/^~/, require('os').homedir());
        const titleToUse = download.stream.customName || download.stream.pageTitle;
        const safeTitle = this.createSafeFilename(titleToUse);
        
        // Look for common video extensions
        const extensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
        for (const ext of extensions) {
          const potentialPath = join(expandedDir, `${safeTitle}.${ext}`);
          try {
            const fs = require('fs');
            if (fs.existsSync(potentialPath)) {
              download.outputPath = potentialPath;
              break;
            }
          } catch (error) {
            logger.warn('Failed to check file existence', { path: potentialPath, error });
          }
        }
        
        // If no file found, use the template as fallback
        if (!download.outputPath) {
          download.outputPath = download.outputTemplate.replace('%(ext)s', 'mp4');
        }
      }
      
      logger.info('Download completed successfully', { id: downloadId, outputPath: download.outputPath });
      
      ipcHandlers.sendDownloadCompleted(downloadId, download.outputPath);
    } else {
      download.status = 'failed';
      download.error = `Process exited with code ${code}`;
      
      // Ensure logs are captured for failed downloads
      if (download.logs) {
        download.logs.exitCode = code;
      }
      
      logger.error('Download failed', { id: downloadId, code });
      
      ipcHandlers.sendDownloadFailed(downloadId, download.error);
    }

    // Process next item in queue
    this.processQueue();
    
    // Save to persistence
    this.saveDownloads();
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
    
    // Save to persistence
    this.saveDownloads();
    
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
    
    // Save to persistence
    this.saveDownloads();
    
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
    
    // Save to persistence
    this.saveDownloads();
    
    return false;
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
    
    // Save to persistence
    this.saveDownloads();
    
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
    
    // Save to persistence
    this.saveDownloads();
    
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

    // Save to persistence
    this.saveDownloads();
    
    return true;
  }

  removeDownload(downloadId: string): boolean {
    const download = this.downloads.get(downloadId);
    
    if (!download) {
      logger.warn('Download not found for removal', { downloadId });
      return false;
    }

    // Remove from downloads map
    this.downloads.delete(downloadId);
    
    // Remove from queue if it's still there
    const queueIndex = this.downloadQueue.indexOf(downloadId);
    if (queueIndex > -1) {
      this.downloadQueue.splice(queueIndex, 1);
    }

    // Remove from active downloads if it's running
    const activeDownload = this.activeDownloads.get(downloadId);
    if (activeDownload) {
      activeDownload.process.kill('SIGTERM');
      clearInterval(activeDownload.progressInterval);
      this.activeDownloads.delete(downloadId);
    }

    logger.info('Download removed', { 
      downloadId, 
      status: download.status,
      url: download.stream.url 
    });

    // Save to persistence
    this.saveDownloads();
    
    return true;
  }

  getDownloadLogs(downloadId: string): any {
    const download = this.downloads.get(downloadId);
    if (!download) {
      logger.warn('Download not found for logs retrieval', { downloadId });
      return null;
    }
    
    if (!download.logs) {
      logger.warn('No logs found for download', { downloadId, status: download.status });
      return null;
    }
    
    logger.debug('Logs retrieved for download', { 
      downloadId, 
      hasLogs: !!download.logs,
      stdoutCount: download.logs.stdout?.length || 0,
      stderrCount: download.logs.stderr?.length || 0,
      hasCommand: !!download.logs.fullCommand,
      exitCode: download.logs.exitCode
    });
    
    return download.logs;
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
    
    // Save to persistence
    this.saveDownloads();
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
