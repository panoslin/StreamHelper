import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DownloadItem } from '../../../../types';
import { DownloadService } from '../../services/download.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

// Import IPC channels for cleanup
const IPC_CHANNELS = {
  WEBSOCKET_STATUS_UPDATED: 'websocket-status-updated'
};

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
                <!-- Retry button for pending downloads -->
                <p-button 
                  *ngIf="download.status === 'pending'"
                  icon="pi pi-refresh" 
                  [text]="true" 
                  size="small"
                  (onClick)="retryDownload(download.id)"
                  tooltip="Retry Download"
                  styleClass="p-button-success">
                </p-button>
                
                <p-button 
                  icon="pi pi-wrench" 
                  [text]="true" 
                  size="small"
                  (onClick)="viewDownloadLogs(download.id)"
                  tooltip="View Logs"
                  styleClass="p-button-info">
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
                  icon="pi pi-wrench" 
                  [text]="true" 
                  size="small"
                  (onClick)="viewDownloadLogs(download.id)"
                  tooltip="View Logs"
                  styleClass="p-button-info">
                </p-button>
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

              </div>
              
              <div class="download-actions">
                <!-- Retry button for failed downloads -->
                <p-button 
                  icon="pi pi-refresh" 
                  [text]="true" 
                  size="small"
                  (onClick)="retryDownload(download.id)"
                  tooltip="Retry Download"
                  styleClass="p-button-success">
                </p-button>
                
                <p-button 
                  icon="pi pi-wrench" 
                  [text]="true" 
                  size="small"
                  (onClick)="viewDownloadLogs(download.id)"
                  tooltip="View Logs"
                  styleClass="p-button-info">
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

    /* Logs Modal Styles */
    .logs-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .logs-modal-content {
      background: var(--surface-card);
      border-radius: 12px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--surface-border);
    }

    .logs-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-section);
    }

    .logs-modal-header h3 {
      margin: 0;
      color: var(--text-color);
      font-size: 1.25rem;
    }

    .logs-modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-color-secondary);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .logs-modal-close:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    .logs-modal-body {
      padding: 1.5rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    .log-section {
      margin-bottom: 1.5rem;
    }

    .log-section h4 {
      margin: 0 0 0.5rem 0;
      color: var(--text-color);
      font-size: 1rem;
      font-weight: 600;
    }

    .log-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .log-info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .log-info-item strong {
      color: var(--text-color);
      font-size: 0.875rem;
    }

    .log-info-item span, .log-info-item code {
      color: var(--text-color-secondary);
      font-size: 0.875rem;
      font-family: monospace;
    }

    .log-info-item .status-completed { color: var(--green-600); font-weight: 600; }
    .log-info-item .status-failed { color: var(--red-600); font-weight: 600; }
    .log-info-item .status-downloading { color: var(--blue-600); font-weight: 600; }
    .log-info-item .status-pending { color: var(--orange-600); font-weight: 600; }

    .log-command {
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      padding: 0.75rem;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-color);
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
    }

    .log-exit-code {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-color);
    }

    .log-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 0.75rem;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.75rem;
      color: #dc2626;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
    }

    .log-output, .log-error-output {
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      padding: 0.75rem;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-color);
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }

    .logs-modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--surface-border);
      display: flex;
      justify-content: flex-end;
      background: var(--surface-section);
    }

    .logs-modal-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logs-modal-btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .logs-modal-btn-primary:hover {
      background: var(--primary-600);
      transform: translateY(-1px);
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
    // Note: ipcRenderer.on doesn't return a subscription, so we can't add it to subscriptions array
    (window as any).electronAPI.onWebSocketStatusUpdate((status: any) => {
      this.websocketStatus = status;
      this.cdr.detectChanges();
    });

    this.loadWebSocketStatus();
  }

  ngOnDestroy(): void {
    // Only unsubscribe from RxJS subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    
    // Remove IPC listeners manually if the method exists
    try {
      if ((window as any).electronAPI.removeAllListeners) {
        (window as any).electronAPI.removeAllListeners(IPC_CHANNELS.WEBSOCKET_STATUS_UPDATED);
      }
    } catch (error) {
      console.warn('Could not remove IPC listeners:', error);
    }
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
    this.toastService.showSuccess('Completed downloads cleared');
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
            // this.toastService.showSuccess('File highlighted in Finder');
          } else {
            this.toastService.showError('Failed to show file in Finder');
          }
        }).catch((error: any) => {
          console.error('Failed to highlight file in Finder:', error);
          this.toastService.showError('Failed to show file in Finder');
        });
      } catch (error) {
        console.error('Error highlighting file in Finder:', error);
        this.toastService.showError('Error showing file in Finder');
      }
    }
  }

  removeDownload(downloadId: string): void {
    this.downloadService.removeDownload(downloadId).then((success: boolean) => {
      if (success) {
        // this.toastService.showSuccess('Download removed from history');
        // Force change detection to update UI immediately
        this.cdr.detectChanges();
        setTimeout(() => this.cdr.detectChanges(), 100);
      } else {
        this.toastService.showError('Failed to remove download');
      }
    }).catch((error: any) => {
      console.error('Error removing download:', error);
      this.toastService.showError('Error removing download');
    });
  }

  async viewDownloadLogs(downloadId: string): Promise<void> {
    try {
      const logs = await this.downloadService.getDownloadLogs(downloadId);
      if (logs) {
        this.showLogsModal(logs, downloadId);
      } else {
        this.toastService.showError('No logs available for this download');
      }
    } catch (error) {
      console.error('Error viewing download logs:', error);
      this.toastService.showError('Failed to load download logs');
    }
  }

  async retryDownload(downloadId: string): Promise<void> {
    try {
      const success = await this.downloadService.retryDownload(downloadId);
      if (success) {
        this.toastService.showSuccess('Download queued for retry');
        // The service automatically reloads downloads after retry
      } else {
        this.toastService.showError('Failed to retry download');
      }
    } catch (error) {
      console.error('Error retrying download:', error);
      this.toastService.showError('Error retrying download');
    }
  }

  private showLogsModal(logs: any, downloadId: string): void {
    // Get download info for better context
    const download = this.downloads.find(d => d.id === downloadId);
    const downloadTitle = download?.stream.pageTitle || 'Unknown Download';
    const downloadStatus = download?.status || 'Unknown Status';
    
    // Create a modal to display the logs
    const modal = document.createElement('div');
    modal.className = 'logs-modal-overlay';
    modal.innerHTML = `
      <div class="logs-modal-content">
        <div class="logs-modal-header">
          <h3>Download Logs - ${downloadTitle}</h3>
          <button class="logs-modal-close">&times;</button>
        </div>
        <div class="logs-modal-body">
          <div class="log-section">
            <h4>Download Information:</h4>
            <div class="log-info-grid">
              <div class="log-info-item">
                <strong>Status:</strong> <span class="status-${downloadStatus}">${downloadStatus}</span>
              </div>
              <div class="log-info-item">
                <strong>ID:</strong> <code>${downloadId}</code>
              </div>
              <div class="log-info-item">
                <strong>Created:</strong> ${download?.createdAt ? new Date(download.createdAt).toLocaleString() : 'N/A'}
              </div>
              ${download?.startedAt ? `
                <div class="log-info-item">
                  <strong>Started:</strong> ${new Date(download.startedAt).toLocaleString()}
                </div>
              ` : ''}
              ${download?.completedAt ? `
                <div class="log-info-item">
                  <strong>Completed:</strong> ${new Date(download.completedAt).toLocaleString()}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="log-section">
            <h4>Command Executed:</h4>
            <pre class="log-command">${logs.fullCommand || 'N/A'}</pre>
          </div>
          ${logs.exitCode !== undefined ? `
            <div class="log-section">
              <h4>Exit Code:</h4>
              <span class="log-exit-code">${logs.exitCode}</span>
            </div>
          ` : ''}
          ${logs.errorDetails ? `
            <div class="log-section">
              <h4>Error Details:</h4>
              <pre class="log-error">${logs.errorDetails}</pre>
            </div>
          ` : ''}
          <div class="log-section">
            <h4>Standard Output:</h4>
            <pre class="log-output">${logs.stdout?.join('') || 'No output'}</pre>
          </div>
          <div class="log-section">
            <h4>Error Output:</h4>
            <pre class="log-error-output">${logs.stderr?.join('') || 'No errors'}</pre>
          </div>
        </div>
        <div class="logs-modal-footer">
          <button class="logs-modal-btn logs-modal-btn-primary" onclick="this.closest('.logs-modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;

    // Add event listener for close button
    const closeBtn = modal.querySelector('.logs-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.remove());
    }

    // Add click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    document.body.appendChild(modal);
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


}
