import { Component, OnInit, OnDestroy } from '@angular/core';
import { StreamData } from '../../../../types';
import { StreamService } from '../../services/stream.service';
import { DownloadService } from '../../services/download.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-streams',
  template: `
    <div class="streams-page">
      <div class="page-header">
        <h2>Streams</h2>
        <div class="header-actions">
          <p-button 
            icon="pi pi-refresh" 
            [text]="true" 
            size="small"
            (onClick)="refreshStreams()"
            tooltip="Refresh Streams">
          </p-button>
        </div>
      </div>

      <div class="streams-content">
        <!-- Captured Streams -->
        <div class="streams-section" *ngIf="streams.length > 0">
          <h3>Captured Streams</h3>
          <div class="streams-grid">
            <div class="stream-card" *ngFor="let stream of streams">
              <div class="stream-header">
                <div class="stream-title">{{ stream.pageTitle }}</div>
                <div class="stream-status">
                  <span class="status-badge" [class]="getStreamStatus(stream)">
                    {{ getStreamStatusText(stream) }}
                  </span>
                </div>
              </div>
              
              <div class="stream-content">
                <div class="stream-url">{{ stream.url }}</div>
                <div class="stream-meta">
                  <span class="stream-time">
                    <i class="pi pi-clock"></i>
                    {{ formatTime(stream.timestamp) }}
                  </span>
                  <span class="stream-id" *ngIf="stream.id">
                    <i class="pi pi-hashtag"></i>
                    {{ stream.id }}
                  </span>
                </div>
              </div>

              <div class="stream-actions">
                <p-button 
                  *ngIf="!isStreamDownloading(stream)"
                  label="Download" 
                  icon="pi pi-download" 
                  size="small"
                  (onClick)="downloadStream(stream)"
                  styleClass="p-button-primary">
                </p-button>
                <p-button 
                  *ngIf="isStreamDownloading(stream)"
                  label="Downloading..." 
                  icon="pi pi-spin pi-spinner" 
                  size="small"
                  [disabled]="true"
                  styleClass="p-button-secondary">
                </p-button>
                <p-button 
                  icon="pi pi-copy" 
                  [text]="true" 
                  size="small"
                  (onClick)="copyStreamUrl(stream.url)"
                  tooltip="Copy URL">
                </p-button>
                <p-button 
                  icon="pi pi-trash" 
                  [text]="true" 
                  size="small"
                  (onClick)="removeStream(stream)"
                  tooltip="Remove Stream"
                  styleClass="p-button-danger">
                </p-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="streams.length === 0">
          <i class="pi pi-video" style="font-size: 4rem; color: var(--text-color-secondary);"></i>
          <h3>No Streams Captured Yet</h3>
          <p>Use the Chrome extension to capture streams from web pages</p>
        </div>

        <!-- Connection Status -->
        <div class="connection-status">
          <p-card>
            <ng-template pTemplate="header">
              <div class="status-header">
                <i class="pi pi-wifi status-icon"></i>
                <span>Connection Status</span>
              </div>
            </ng-template>
            <ng-template pTemplate="content">
              <div class="status-content">
                <div class="status-item">
                  <span class="status-label">WebSocket Server:</span>
                  <span class="status-value" [class]="websocketStatus.isRunning ? 'status-online' : 'status-offline'">
                    {{ websocketStatus.isRunning ? 'Running' : 'Stopped' }}
                  </span>
                </div>
                <div class="status-item">
                  <span class="status-label">Connected Clients:</span>
                  <span class="status-value">{{ websocketStatus.connectedClients }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">Port:</span>
                  <span class="status-value">{{ websocketStatus.port }}</span>
                </div>
              </div>
            </ng-template>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .streams-page {
      max-width: 100%;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .page-header h2 {
      margin: 0;
      color: var(--text-color);
    }

    .streams-section {
      margin-bottom: 2rem;
    }

    .streams-section h3 {
      margin-bottom: 1rem;
      color: var(--text-color);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .streams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1rem;
    }

    .stream-card {
      background: var(--surface-card);
      border-radius: 8px;
      border: 1px solid var(--surface-border);
      padding: 1rem;
      transition: all 0.2s ease;
    }

    .stream-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stream-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .stream-title {
      font-weight: 600;
      color: var(--text-color);
      flex: 1;
      margin-right: 1rem;
      line-height: 1.3;
    }

    .stream-status {
      flex-shrink: 0;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-new { 
      background: var(--blue-100); 
      color: var(--blue-700); 
    }
    .status-downloading { 
      background: var(--yellow-100); 
      color: var(--yellow-700); 
    }
    .status-completed { 
      background: var(--green-100); 
      color: var(--green-700); 
    }

    .stream-content {
      margin-bottom: 1rem;
    }

    .stream-url {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin-bottom: 0.5rem;
      word-break: break-all;
      line-height: 1.4;
    }

    .stream-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--text-color-secondary);
    }

    .stream-meta span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .stream-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
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

    .empty-state-actions {
      margin-top: 1.5rem;
    }

    .connection-status {
      margin-top: 2rem;
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--surface-section);
    }

    .status-icon {
      font-size: 1.25rem;
      color: var(--primary-color);
    }

    .status-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .status-label {
      font-weight: 500;
      color: var(--text-color);
    }

    .status-value {
      font-weight: 600;
    }

    .status-online {
      color: var(--green-600);
    }

    .status-offline {
      color: var(--red-600);
    }
  `]
})
export class StreamsComponent implements OnInit, OnDestroy {
  streams: StreamData[] = [];
  websocketStatus = {
    isRunning: false,
    connectedClients: 0,
    port: 0
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private streamService: StreamService,
    private downloadService: DownloadService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.streamService.streams$.subscribe(streams => {
        this.streams = streams;
      })
    );

    this.loadWebSocketStatus();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async loadWebSocketStatus(): Promise<void> {
    try {
      this.websocketStatus = await (window as any).electronAPI.getWebSocketStatus();
    } catch (error) {
      console.error('Failed to load WebSocket status:', error);
    }
  }

  async refreshStreams(): Promise<void> {
    try {
      // Reload streams from the service
      this.streams = this.streamService.getStreams();
      this.toastService.showSuccess('Streams refreshed successfully!', 'Refresh');
    } catch (error) {
      this.toastService.showError('Failed to refresh streams', 'Refresh');
    }
  }

  async downloadStream(stream: StreamData): Promise<void> {
    try {
      const queuePosition = await this.downloadService.downloadStream(stream);
      this.toastService.showSuccess(`Stream queued for download (Position: ${queuePosition + 1})`, 'Download');
    } catch (error) {
      this.toastService.showError('Failed to queue stream for download', 'Download');
    }
  }

  isStreamDownloading(stream: StreamData): boolean {
    // Check if this stream is currently being downloaded
    const downloads = this.downloadService.getDownloads();
    return downloads.some(d => 
      d.stream.url === stream.url && 
      (d.status === 'downloading' || d.status === 'pending')
    );
  }

  getStreamStatus(stream: StreamData): string {
    if (this.isStreamDownloading(stream)) {
      return 'status-downloading';
    }
    
    const downloads = this.downloadService.getDownloads();
    const completed = downloads.find(d => 
      d.stream.url === stream.url && d.status === 'completed'
    );
    
    if (completed) {
      return 'status-completed';
    }
    
    return 'status-new';
  }

  getStreamStatusText(stream: StreamData): string {
    if (this.isStreamDownloading(stream)) {
      return 'Downloading';
    }
    
    const downloads = this.downloadService.getDownloads();
    const completed = downloads.find(d => 
      d.stream.url === stream.url && d.status === 'completed'
    );
    
    if (completed) {
      return 'Completed';
    }
    
    return 'New';
  }

  async copyStreamUrl(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toastService.showSuccess('URL copied to clipboard', 'Copy');
    } catch (error) {
      this.toastService.showError('Failed to copy URL', 'Copy');
    }
  }

  async removeStream(stream: StreamData): Promise<void> {
    // For now, just show a message that removal is not implemented
    this.toastService.showInfo('Stream removal functionality coming soon', 'Streams');
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
