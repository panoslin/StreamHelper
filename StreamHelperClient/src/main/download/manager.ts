import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { StreamData, DownloadRequest, DownloadProgress } from '@/types';
import { EVENTS, YTDLP_CONFIG, SUPPORTED_FORMATS, SUPPORTED_QUALITIES } from '@/shared/constants';
import { getPlatform, expandPath, generateFilename, sanitizeFilename } from '@/shared/utils';
import { configManager } from '../config/manager';
import { webSocketManager } from '../communication/websocket';

interface DownloadJob {
  id: string;
  stream: StreamData;
  request: DownloadRequest;
  process: ChildProcess | null;
  status: 'queued' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: DownloadProgress;
  startTime: number;
  error?: string;
  outputPath?: string;
}

interface DownloadQueue {
  pending: DownloadJob[];
  active: DownloadJob[];
  completed: DownloadJob[];
  failed: DownloadJob[];
}

class DownloadManager extends EventEmitter {
  private queue: DownloadQueue;
  private maxConcurrent: number;
  private ytDlpPath: string;
  private isRunning: boolean = false;
  private processQueueInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.queue = {
      pending: [],
      active: [],
      completed: [],
      failed: [],
    };
    this.maxConcurrent = configManager.getMaxConcurrentDownloads();
    this.ytDlpPath = configManager.getYtDlpConfig().binaryPath;
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for download requests from WebSocket
    webSocketManager.on('download:request', (request: DownloadRequest) => {
      this.addDownloadRequest(request);
    });


  }

  // Public methods
  async addDownloadRequest(request: DownloadRequest): Promise<string> {
    try {
      // Validate request
      const validation = this.validateDownloadRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid download request: ${validation.errors.join(', ')}`);
      }

      // Find the stream
      const stream = await this.findStream(request.streamId);
      if (!stream) {
        throw new Error(`Stream not found: ${request.streamId}`);
      }

      // Create download job
      const job: DownloadJob = {
        id: this.generateJobId(),
        stream,
        request,
        process: null,
        status: 'queued',
        progress: {
          streamId: request.streamId,
          percentage: 0,
          speed: '0 B/s',
          eta: 'Unknown',
          downloaded: '0 B',
          total: 'Unknown',
          status: 'queued',
        },
        startTime: Date.now(),
      };

      // Add to pending queue
      this.queue.pending.push(job);
      console.log(`Download job added to queue: ${job.id}`);

      // Emit event
      this.emit(EVENTS.DOWNLOAD_STARTED, request);

      // Start processing queue
      this.processQueue();

      return job.id;
    } catch (error) {
      console.error('Failed to add download request:', error);
      throw error;
    }
  }

  async startDownload(jobId: string): Promise<void> {
    const job = this.findJob(jobId);
    if (!job) {
      throw new Error(`Download job not found: ${jobId}`);
    }

    if (job.status !== 'queued') {
      throw new Error(`Cannot start job in ${job.status} status`);
    }

    // Move to active queue
    this.moveJob(jobId, 'pending', 'active');
    job.status = 'downloading';
    job.progress.status = 'downloading';

    // Start the download
    await this.executeDownload(job);
  }

  async pauseDownload(jobId: string): Promise<void> {
    const job = this.findJob(jobId);
    if (!job || job.status !== 'downloading') {
      return;
    }

    if (job.process) {
      job.process.kill('SIGSTOP');
      job.status = 'queued';
      job.progress.status = 'queued';
      this.moveJob(jobId, 'active', 'pending');
    }
  }

  async resumeDownload(jobId: string): Promise<void> {
    const job = this.findJob(jobId);
    if (!job || job.status !== 'queued') {
      return;
    }

    await this.startDownload(jobId);
  }

  async cancelDownload(jobId: string): Promise<void> {
    const job = this.findJob(jobId);
    if (!job) {
      return;
    }

    if (job.process) {
      job.process.kill('SIGTERM');
    }

    job.status = 'cancelled';
    job.progress.status = 'cancelled';

    // Remove from active queue
    this.moveJob(jobId, 'active', 'failed');

    console.log(`Download cancelled: ${jobId}`);
  }

  async clearCompleted(): Promise<void> {
    this.queue.completed = [];
    this.queue.failed = [];
    console.log('Completed downloads cleared');
  }

  // Queue management
  private async processQueue(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    while (this.queue.active.length < this.maxConcurrent && this.queue.pending.length > 0) {
      const job = this.queue.pending.shift();
      if (job) {
        await this.startDownload(job.id);
      }
    }
    
    this.isRunning = false;
  }

  private moveJob(jobId: string, fromQueue: keyof DownloadQueue, toQueue: keyof DownloadQueue): void {
    const fromIndex = this.queue[fromQueue].findIndex(job => job.id === jobId);
    if (fromIndex !== -1) {
      const job = this.queue[fromQueue].splice(fromIndex, 1)[0];
      this.queue[toQueue].push(job);
    }
  }

  // yt-dlp execution
  private async executeDownload(job: DownloadJob): Promise<void> {
    try {
      // Validate yt-dlp binary
      if (!await this.validateYtDlpBinary()) {
        throw new Error('yt-dlp binary not found or invalid');
      }

      // Prepare output directory
      const outputDir = expandPath(job.request.outputDir);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Generate output filename
      const filename = job.request.filename || generateFilename(job.stream, job.request.format);
      const outputPath = join(outputDir, filename);

      // Build yt-dlp command
      const args = this.buildYtDlpArgs(job, outputPath);
      
      console.log(`Starting download: ${job.id}`);
      console.log(`Command: ${this.ytDlpPath} ${args.join(' ')}`);

      // Spawn yt-dlp process
      const process = spawn(this.ytDlpPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: outputDir,
      });

      job.process = process;
      job.outputPath = outputPath;

      // Handle process events
      this.setupProcessHandlers(job, process);

      // Start processing queue again
      this.processQueue();

    } catch (error) {
      console.error(`Failed to execute download ${job.id}:`, error);
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.progress.status = 'error';
      
      this.moveJob(job.id, 'active', 'failed');
      this.emit(EVENTS.DOWNLOAD_ERROR, { streamId: job.stream.id, error: job.error });
      
      this.processQueue();
    }
  }

  private setupProcessHandlers(job: DownloadJob, process: ChildProcess): void {
    let outputBuffer = '';

    process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      outputBuffer += output;
      
      // Parse progress information
      this.parseProgressOutput(job, output);
    });

    process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`yt-dlp stderr (${job.id}):`, output);
      
      // Parse progress information (yt-dlp often outputs progress to stderr)
      this.parseProgressOutput(job, output);
    });

    process.on('close', (code: number) => {
      console.log(`Download process closed (${job.id}): code ${code}`);
      
      if (code === 0) {
        job.status = 'completed';
        job.progress.status = 'completed';
        job.progress.percentage = 100;
        
        this.moveJob(job.id, 'active', 'completed');
        this.emit(EVENTS.DOWNLOAD_COMPLETED, job.stream);
      } else {
        job.status = 'error';
        job.error = `Process exited with code ${code}`;
        job.progress.status = 'error';
        
        this.moveJob(job.id, 'active', 'failed');
        this.emit(EVENTS.DOWNLOAD_ERROR, { streamId: job.stream.id, error: job.error });
      }
      
      job.process = null;
      this.processQueue();
    });

    process.on('error', (error: Error) => {
      console.error(`Download process error (${job.id}):`, error);
      
      job.status = 'error';
      job.error = error.message;
      job.progress.status = 'error';
      
      this.moveJob(job.id, 'active', 'failed');
      this.emit(EVENTS.DOWNLOAD_ERROR, { streamId: job.stream.id, error: job.error });
      
      job.process = null;
      this.processQueue();
    });
  }

  private parseProgressOutput(job: DownloadJob, output: string): void {
    // Parse yt-dlp progress output
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse percentage
      const percentageMatch = line.match(/(\d+\.?\d*)%/);
      if (percentageMatch) {
        job.progress.percentage = parseFloat(percentageMatch[1]);
      }
      
      // Parse speed
      const speedMatch = line.match(/(\d+\.?\d*\s*[KMGT]?B\/s)/);
      if (speedMatch) {
        job.progress.speed = speedMatch[1];
      }
      
      // Parse ETA
      const etaMatch = line.match(/(\d+:\d+)/);
      if (etaMatch) {
        job.progress.eta = etaMatch[1];
      }
      
      // Parse downloaded/total
      const sizeMatch = line.match(/(\d+\.?\d*\s*[KMGT]?B)\s*\/\s*(\d+\.?\d*\s*[KMGT]?B)/);
      if (sizeMatch) {
        job.progress.downloaded = sizeMatch[1];
        job.progress.total = sizeMatch[2];
      }
    }
    
    // Emit progress update
    this.emit(EVENTS.DOWNLOAD_PROGRESS, job.progress);
  }

  private buildYtDlpArgs(job: DownloadJob, outputPath: string): string[] {
    const args: string[] = [
      '--newline',
      '--progress',
      '--no-playlist',
      '--no-warnings',
      '--no-colors',
    ];

    // Output format
    if (job.request.format !== 'auto') {
      args.push('--format', job.request.format);
    }

    // Quality selection
    if (job.request.quality !== 'auto') {
      args.push('--format-sort', job.request.quality);
    }

    // Output path
    args.push('-o', outputPath);

    // Subtitle options
    if (job.request.includeSubtitles) {
      args.push('--write-subs');
      args.push('--sub-lang', 'en');
    }

    // Thumbnail options
    if (job.request.includeThumbnail) {
      args.push('--write-thumbnail');
    }

    // URL
    args.push(job.stream.url);

    return args;
  }

  // Validation methods
  private validateDownloadRequest(request: DownloadRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.streamId) {
      errors.push('Stream ID is required');
    }

    if (!request.outputDir) {
      errors.push('Output directory is required');
    }

    if (!SUPPORTED_FORMATS.includes(request.format)) {
      errors.push(`Unsupported format: ${request.format}`);
    }

    if (!SUPPORTED_QUALITIES.includes(request.quality)) {
      errors.push(`Unsupported quality: ${request.quality}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async validateYtDlpBinary(): Promise<boolean> {
    if (!this.ytDlpPath || !existsSync(this.ytDlpPath)) {
      return false;
    }

    try {
      // Test yt-dlp version
      const result = await this.executeYtDlpCommand(['--version']);
      const version = result.trim();
      
      // Update stored version
      configManager.setYtDlpVersion(version);
      
      return version.length > 0;
    } catch (error) {
      console.error('Failed to validate yt-dlp binary:', error);
      return false;
    }
  }

  private async executeYtDlpCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ytDlpPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: YTDLP_CONFIG.TIMEOUT,
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      process.on('close', (code: number) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`yt-dlp command failed: ${errorOutput}`));
        }
      });

      process.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  // Utility methods
  private findJob(jobId: string): DownloadJob | undefined {
    return [
      ...this.queue.pending,
      ...this.queue.active,
      ...this.queue.completed,
      ...this.queue.failed,
    ].find(job => job.id === jobId);
  }

  private async findStream(streamId: string): Promise<StreamData | null> {
    // TODO: Implement stream storage/retrieval
    // For now, return a mock stream
    return {
      id: streamId,
      url: 'https://example.com/stream.m3u8',
      pageTitle: 'Example Stream',
      pageUrl: 'https://example.com',
      timestamp: Date.now(),
      status: 'pending',
    };
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  getQueueStatus() {
    return {
      pending: this.queue.pending.length,
      active: this.queue.active.length,
      completed: this.queue.completed.length,
      failed: this.queue.failed.length,
      total: this.queue.pending.length + this.queue.active.length + this.queue.completed.length + this.queue.failed.length,
    };
  }

  getActiveDownloads(): DownloadJob[] {
    return [...this.queue.active];
  }

  getCompletedDownloads(): DownloadJob[] {
    return [...this.queue.completed];
  }

  getFailedDownloads(): DownloadJob[] {
    return [...this.queue.failed];
  }

  isDownloading(): boolean {
    return this.queue.active.length > 0;
  }
}

// Create singleton instance
const downloadManager = new DownloadManager();

export function setupDownloadManager(): Promise<void> {
  return Promise.resolve();
}

export { downloadManager };
export default downloadManager;
