import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DownloadItem } from '../../../../types';
import { DownloadService } from '../../services/download.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-downloads',
  template: `
    <div class="downloads-page">
      <!-- Dashboard Header with Connection Status -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="header-left">
            <div class="logo-section">
              <i class="pi pi-download logo-icon"></i>
              <h2 class="title">Downloads</h2>
            </div>
          </div>
          
          <div class="header-center">
            <div class="status-dashboard">
              <div class="status-item">
                <div class="status-icon">
                  <i class="pi pi-wifi" [class]="websocketStatus.isRunning ? 'status-online' : 'status-offline'"></i>
                </div>
                <div class="status-content">
                  <span class="status-label">Server</span>
                  <span class="status-value" [class]="websocketStatus.isRunning ? 'status-online' : 'status-offline'">
                    {{ websocketStatus.isRunning ? 'Running' : 'Stopped' }}
                  </span>
                </div>
              </div>
              
              <div class="status-item">
                <div class="status-icon">
                  <i class="pi pi-users"></i>
                </div>
                <div class="status-content">
                  <span class="status-label">Clients</span>
                  <span class="status-value">{{ websocketStatus.connectedClients }}</span>
                </div>
              </div>
              
              <div class="status-item">
                <div class="status-icon">
                  <i class="pi pi-globe"></i>
                </div>
                <div class="status-content">
                  <span class="status-label">Port</span>
                  <span class="status-value">{{ websocketStatus.port }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="header-right">
            <div class="header-actions">
              <p-button 
                label="Show in Finder" 
                icon="pi pi-folder-open" 
                [text]="true"
                (onClick)="openDownloadsFolder()"
                styleClass="p-button-secondary">
              </p-button>
              <p-button 
                label="Clear Completed" 
                icon="pi pi-trash" 
                [text]="true"
                (onClick)="clearCompleted()"
                [disabled]="getCompletedDownloads().length === 0">
              </p-button>
            </div>
          </div>
        </div>
      </div>

      <div class="downloads-content">
        <!-- Active Downloads -->
        <div class="download-section" *ngIf="getActiveDownloads().length > 0">
          <h3>Active Downloads</h3>
          <div class="download-list">
            <div class="download-item" *ngFor="let download of getActiveDownloads(); trackBy: trackByDownloadId">
              <div class="download-info">
                <div class="download-title">{{ download.stream.pageTitle }}</div>
                <div class="download-source" *ngIf="download.stream.pageUrl && download.stream.pageUrl !== 'Unknown'">
                  <i class="pi pi-globe source-icon"></i>
                  <span class="source-url">{{ download.stream.pageUrl }}</span>
                </div>
                <!-- <div class="download-url">{{ download.stream.url }}</div> -->
                <div class="download-meta">
                  <span class="download-status status-{{ download.status }}">
                    <i [class]="getStatusIcon(download.status)"></i>
                    {{ download.status | titlecase }}
                  </span>
                  <span class="download-queue" *ngIf="download.status === 'pending'">
                    Queue Position: {{ getQueuePosition(download.id) + 1 }}
                  </span>
                  <!-- Retry count removed for simplicity -->
                </div>
              </div>
              
              <div class="download-progress" *ngIf="download.status === 'downloading'">
                <p-progressBar 
                  [value]="download.progress" 
                  [showValue]="true"
                  styleClass="download-progress-bar">
                </p-progressBar>
                <div class="progress-details" *ngIf="download.speed || download.eta">
                  <span *ngIf="download.speed">Speed: {{ download.speed }}</span>
                  <span *ngIf="download.eta">ETA: {{ download.eta }}</span>
                </div>
              </div>

              <div class="download-actions">
                <p-button 
                  icon="pi pi-trash" 
                  [text]="true" 
                  size="small"
                  (onClick)="removeDownload(download.id)"
                  tooltip="Remove Download"
                  styleClass="p-button-danger">
                </p-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Completed Downloads -->
        <div class="download-section" *ngIf="getCompletedDownloads().length > 0">
          <h3>Completed Downloads</h3>
          <div class="download-list">
            <div class="download-item completed" *ngFor="let download of getCompletedDownloads()">
              <div class="download-info">
                <div class="download-title">{{ download.stream.pageTitle }}</div>
                <div class="download-source" *ngIf="download.stream.pageUrl && download.stream.pageUrl !== 'Unknown'">
                  <i class="pi pi-globe source-icon"></i>
                  <span class="source-url">{{ download.stream.pageUrl }}</span>
                </div>
                <!-- <div class="download-url">{{ download.stream.url }}</div> -->
                <div class="download-meta">
                  <span class="download-status status-{{ download.status }}">
                    <i [class]="getStatusIcon(download.status)"></i>
                    {{ download.status | titlecase }}
                  </span>
                  <span class="download-time" *ngIf="download.completedAt">
                    Completed: {{ formatTime(download.completedAt.getTime()) }}
                  </span>
                </div>
              </div>
              
              <div class="download-actions">
                <p-button 
                  icon="pi pi-eye" 
                  [text]="true" 
                  size="small"
                  (onClick)="highlightFileInFinder(download.outputPath)"
                  tooltip="Show File in Finder"
                  *ngIf="download.outputPath">
                </p-button>
                <p-button 
                  icon="pi pi-trash" 
                  [text]="true" 
                  size="small"
                  (onClick)="removeDownload(download.id)"
                  tooltip="Remove Download"
                  styleClass="p-button-danger">
                </p-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Failed Downloads -->
        <div class="download-section" *ngIf="getFailedDownloads().length > 0">
          <h3>Failed Downloads</h3>
          <div class="download-list">
            <div class="download-item failed" *ngFor="let download of getFailedDownloads()">
              <div class="download-info">
                <div class="download-title">{{ download.stream.pageTitle }}</div>
                <div class="download-source" *ngIf="download.stream.pageUrl && download.stream.pageUrl !== 'Unknown'">
                  <i class="pi pi-globe source-icon"></i>
                  <span class="source-url">{{ download.stream.pageUrl }}</span>
                </div>
                <!-- <div class="download-url">{{ download.stream.url }}</div> -->
                <div class="download-meta">
                  <span class="download-status status-{{ download.status }}">
                    <i [class]="getStatusIcon(download.status)"></i>
                    {{ download.status | titlecase }}
                  </span>
                  <span class="download-error" *ngIf="download.error">
                    <i class="pi pi-exclamation-triangle"></i>
                    {{ download.error }}
                  </span>
                  <!-- Retry count removed for simplicity -->
                </div>
                <div class="download-error-details" *ngIf="download.error">
                  <div class="error-message">
                    <strong>Error Details:</strong> {{ getErrorMessage(download.error) }}
                  </div>
                  <div class="error-suggestion" *ngIf="getErrorSuggestion(download.error)">
                    <strong>Suggestion:</strong> {{ getErrorSuggestion(download.error) }}
                  </div>
                </div>
              </div>
              
              <div class="download-actions">
                <p-button 
                  icon="pi pi-trash" 
                  [text]="true" 
                  size="small"
                  (onClick)="removeDownload(download.id)"
                  tooltip="Remove Download"
                  styleClass="p-button-danger">
                </p-button>
              </div>
            </div>
          </div>
        </div>



        <!-- Empty State -->
        <div class="empty-state" *ngIf="downloads.length === 0">
          <i class="pi pi-download" style="font-size: 4rem; color: var(--text-color-secondary);"></i>
          <h3>No Downloads Yet</h3>
          <p>Streams will appear here once captured and queued for download</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .downloads-page {
      max-width: 100%;
    }

    /* Dashboard Header Styles - Consistent with StreamHelper Design */
    .dashboard-header {
      background: var(--surface-card);
      color: var(--text-color);
      padding: 1.5rem 2rem;
      margin-bottom: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid var(--surface-border);
      position: relative;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      font-size: 1.5rem;
      color: var(--primary-color);
      transition: all 0.2s ease;
    }

    .logo-section:hover .logo-icon {
      color: var(--primary-600);
    }

    .title {
      margin: 0;
      color: var(--text-color);
      font-size: 1.5rem;
      font-weight: 600;
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .status-dashboard {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      min-width: 400px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--surface-section);
      border-radius: 8px;
      border: 1px solid var(--surface-border);
      transition: all 0.2s ease;
      position: relative;
    }

    .status-item:hover {
      background: var(--surface-hover);
      border-color: var(--primary-color);
    }

    .status-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--primary-color);
      border-radius: 8px 8px 0 0;
    }

    .status-item:nth-child(1)::before {
      background: var(--green-500);
    }

    .status-item:nth-child(2)::before {
      background: var(--blue-500);
    }

    .status-item:nth-child(3)::before {
      background: var(--orange-500);
    }

    .status-icon {
      font-size: 1.25rem;
      color: var(--primary-color);
      transition: all 0.2s ease;
    }

    .status-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .status-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-color-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.2;
    }

    .status-online {
      color: var(--green-500) !important;
    }

    .status-offline {
      color: var(--red-500) !important;
    }

    .header-right {
      display: flex;
      align-items: center;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .header-actions ::ng-deep .p-button {
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      color: var(--text-color);
      transition: all 0.2s ease;
      border-radius: 8px;
      padding: 0.75rem 1.25rem;
    }

    .header-actions ::ng-deep .p-button:hover {
      background: var(--surface-hover);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .header-actions ::ng-deep .p-button:focus {
      box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.2);
    }

    .download-section {
      margin-bottom: 2rem;
    }

    .download-section h3 {
      margin-bottom: 1rem;
      color: var(--text-color);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .download-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .download-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--surface-card);
      border-radius: 8px;
      border: 1px solid var(--surface-border);
      transition: all 0.2s ease;
    }

    .download-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .download-item.completed {
      border-left: 4px solid var(--green-500);
    }

    .download-item.failed {
      border-left: 4px solid var(--red-500);
    }

    .download-info {
      flex: 1;
      min-width: 0;
    }

    .download-title {
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .download-source {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .source-icon {
      font-size: 0.875rem;
      color: var(--primary-color);
      flex-shrink: 0;
    }

    .source-url {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .source-url:hover {
      color: var(--primary-color);
      text-decoration: underline;
    }

    .download-url {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .download-source {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .source-icon {
      font-size: 0.875rem;
      color: var(--primary-color);
      flex-shrink: 0;
    }

    .source-url {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .source-url:hover {
      color: var(--primary-color);
      text-decoration: underline;
    }

    /* Retry count styles removed for simplicity */

    .download-meta {
      display: flex;
      gap: 1rem;
      align-items: center;
      font-size: 0.875rem;
    }

    .download-status {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 500;
    }

    .status-pending { color: var(--yellow-600); }
    .status-downloading { color: var(--blue-600); }
    .status-completed { color: var(--green-600); }
    .status-failed { color: var(--red-600); }
    .status-paused { color: var(--orange-600); }

    .download-progress {
      flex: 1;
      margin: 0 1rem;
      min-width: 200px;
    }

    .download-progress-bar {
      margin-bottom: 0.5rem;
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-color-secondary);
    }

    .download-actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-color-secondary);
    }

    .empty-state h3 {
      margin: 1rem 0 0.5rem 0;
      color: var(--text-color);
    }

    .empty-state p {
      margin-bottom: 1rem;
    }

    .download-error {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--red-600);
      font-weight: 500;
    }

    .download-error-details {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--red-50);
      border: 1px solid var(--red-200);
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .error-message {
      margin-bottom: 0.5rem;
      color: var(--red-700);
    }

    .error-suggestion {
      color: var(--red-600);
      font-style: italic;
    }

    .download-error-details strong {
      color: var(--red-800);
    }


  `]
})
export class DownloadsComponent implements OnInit, OnDestroy {
  downloads: DownloadItem[] = [];
  websocketStatus = {
    isRunning: false,
    connectedClients: 0,
    port: 0
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private downloadService: DownloadService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.downloadService.downloads$.subscribe(downloads => {
        // console.log('Downloads component received update:', downloads);
        this.downloads = downloads;
        
        // // Debug: Log active downloads specifically
        // const activeDownloads = this.getActiveDownloads();
        // console.log('Active downloads after update:', activeDownloads);
        
        // Force change detection to ensure UI updates
        this.cdr.detectChanges();
      })
    );

    // Listen for WebSocket status updates in real-time
    this.subscriptions.push(
      (window as any).electronAPI.onWebSocketStatusUpdate((status: any) => {
        this.websocketStatus = status;
        this.cdr.detectChanges();
      })
    );

    this.loadWebSocketStatus();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getActiveDownloads(): DownloadItem[] {
    return this.downloads.filter(d => 
      d.status === 'downloading' || d.status === 'pending'
    );
  }

  getCompletedDownloads(): DownloadItem[] {
    return this.downloads.filter(d => d.status === 'completed');
  }

  getFailedDownloads(): DownloadItem[] {
    return this.downloads.filter(d => d.status === 'failed');
  }

  getQueuePosition(downloadId: string): number {
    return this.downloadService.getQueuePosition(downloadId);
  }

  trackByDownloadId(index: number, download: DownloadItem): string {
    return download.id;
  }

  // Download control methods removed for simplicity

  async clearCompleted(): Promise<void> {
    await this.downloadService.clearCompletedDownloads();
    this.toastService.showSuccess('Completed downloads cleared', 'Downloads');
    this.cdr.detectChanges();
  }

  // Retry and remove methods removed for simplicity

  private async loadWebSocketStatus(): Promise<void> {
    try {
      this.websocketStatus = await (window as any).electronAPI.getWebSocketStatus();
    } catch (error) {
      console.error('Failed to load WebSocket status:', error);
    }
  }

  // openDownloadFolder method removed for simplicity

  highlightFileInFinder(filePath?: string): void {
    if (filePath) {
      try {
        // Use Electron IPC to highlight file in Finder
        (window as any).electronAPI.highlightFileInFinder(filePath).then((result: any) => {
          if (result && result.success) {
            this.toastService.showSuccess('File highlighted in Finder', 'Downloads');
          } else {
            this.toastService.showError('Failed to show file in Finder', 'Downloads');
          }
        }).catch((error: any) => {
          console.error('Failed to highlight file in Finder:', error);
          this.toastService.showError('Failed to show file in Finder', 'Downloads');
        });
      } catch (error) {
        console.error('Error highlighting file in Finder:', error);
        this.toastService.showError('Error showing file in Finder', 'Downloads');
      }
    }
  }

  removeDownload(downloadId: string): void {
    this.downloadService.removeDownload(downloadId).then((success: boolean) => {
      if (success) {
        this.toastService.showSuccess('Download removed from history', 'Downloads');
        // Force change detection to update UI immediately
        this.cdr.detectChanges();
        setTimeout(() => this.cdr.detectChanges(), 100);
      } else {
        this.toastService.showError('Failed to remove download', 'Downloads');
      }
    }).catch((error: any) => {
      console.error('Error removing download:', error);
      this.toastService.showError('Error removing download', 'Downloads');
    });
  }

  openDownloadsFolder(): void {
    // Open the main downloads folder in Finder/Explorer
    this.downloadService.openDownloadsFolder();
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'pi pi-check-circle';
      case 'downloading': return 'pi pi-download';
      case 'pending': return 'pi pi-clock';
      case 'failed': return 'pi pi-exclamation-triangle';
      case 'paused': return 'pi pi-pause';
      default: return 'pi pi-question-circle';
    }
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  getErrorMessage(error: string): string {
    if (error.includes('Process exited with code')) {
      const codeMatch = error.match(/Process exited with code (\d+)/);
      if (codeMatch) {
        const code = parseInt(codeMatch[1]);
        if (code === 1) {
          return 'The download process failed with exit code 1. This usually indicates a yt-dlp error or network issue.';
        } else if (code === -2) {
          return 'The download process was interrupted or cancelled.';
        } else if (code === 2) {
          return 'The download process failed due to invalid arguments or configuration.';
        }
        return `The download process failed with exit code ${code}. This indicates an error during execution.`;
      }
      return 'The download process exited unexpectedly. This usually indicates a yt-dlp error or system issue.';
    }
    if (error.includes('ENOENT')) {
      return 'File or directory not found. The yt-dlp binary is missing.';
    }
    if (error.includes('ECONNREFUSED')) {
      return 'Connection refused. Please check your internet connection or server status.';
    }
    if (error.includes('ECONNRESET')) {
      return 'Connection reset by peer. This might indicate a network issue or server problem.';
    }
    if (error.includes('ETIMEDOUT')) {
      return 'Request timed out. Please check your internet connection or server response time.';
    }
    if (error.includes('ENOTFOUND')) {
      return 'Domain not found. The requested URL is invalid or the server is down.';
    }
    if (error.includes('EHOSTUNREACH')) {
      return 'Host unreachable. The requested URL is not reachable from your current network.';
    }
    if (error.includes('ECONNABORTED')) {
      return 'Connection aborted. The request was interrupted or cancelled.';
    }
    if (error.includes('EPIPE')) {
      return 'Broken pipe. The connection was closed unexpectedly.';
    }
    if (error.includes('EAI_AGAIN')) {
      return 'DNS lookup failed. Please check your DNS settings or try again later.';
    }
    if (error.includes('ENETUNREACH')) {
      return 'Network is unreachable. Please check your network connection.';
    }
    if (error.includes('EADDRINUSE')) {
      return 'Address already in use. The requested port might be occupied.';
    }
    if (error.includes('EACCES')) {
      return 'Permission denied. You do not have the necessary permissions to access this resource.';
    }
    if (error.includes('EPERM')) {
      return 'Operation not permitted. The system has rejected the request.';
    }
    return error;
  }

  getErrorSuggestion(error: string): string | null {
    if (error.includes('Process exited with code')) {
      const codeMatch = error.match(/Process exited with code (\d+)/);
      if (codeMatch) {
        const code = parseInt(codeMatch[1]);
        if (code === 1) {
          return 'Check if the URL is accessible, verify yt-dlp is working, and ensure your internet connection is stable.';
        } else if (code === -2) {
          return 'The download was interrupted. Try starting the download again.';
        } else if (code === 2) {
          return 'Check your yt-dlp configuration and ensure the URL format is supported.';
        }
        return 'Try restarting the download. If the issue persists, check the URL and your network connection.';
      }
      return 'Try restarting the download. If the issue persists, check your yt-dlp installation and network connection.';
    }
    if (error.includes('ENOENT')) {
      return 'Install yt-dlp: brew install yt-dlp, or check the yt-dlp path in settings.';
    }
    if (error.includes('ECONNREFUSED')) {
      return 'Check your internet connection and ensure the server is running.';
    }
    if (error.includes('ECONNRESET')) {
      return 'Verify the URL and try again. If the issue persists, check your firewall settings.';
    }
    if (error.includes('ETIMEDOUT')) {
      return 'Check your internet connection and try again. If the issue persists, verify the server response time.';
    }
    if (error.includes('ENOTFOUND')) {
      return 'Verify the URL and try again. If the issue persists, check your DNS settings.';
    }
    if (error.includes('EHOSTUNREACH')) {
      return 'Check your network connection and ensure the server is reachable.';
    }
    if (error.includes('ECONNABORTED')) {
      return 'Check your internet connection and try again. If the issue persists, verify the server response time.';
    }
    if (error.includes('EPIPE')) {
      return 'Check your internet connection and try again. If the issue persists, verify the server response time.';
    }
    if (error.includes('EAI_AGAIN')) {
      return 'Check your DNS settings and try again. If the issue persists, try a different DNS server.';
    }
    if (error.includes('ENETUNREACH')) {
      return 'Check your network connection and ensure you are connected to the internet.';
    }
    if (error.includes('EADDRINUSE')) {
      return 'The requested port might be occupied by another application. Try a different port or stop the other application.';
    }
    if (error.includes('EACCES')) {
      return 'You do not have permission to access this resource. Check your user permissions or file/directory ownership.';
    }
    if (error.includes('EPERM')) {
      return 'You do not have permission to perform this operation. Check your user permissions.';
    }
    return null;
  }
}
