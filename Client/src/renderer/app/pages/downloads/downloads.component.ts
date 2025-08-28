import { Component, OnInit, OnDestroy } from '@angular/core';
import { DownloadItem } from '../../../../types';
import { DownloadService } from '../../services/download.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-downloads',
  template: `
    <div class="downloads-page">
      <div class="page-header">
        <h2>Downloads</h2>
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

      <div class="downloads-content">
        <!-- Active Downloads -->
        <div class="download-section" *ngIf="getActiveDownloads().length > 0">
          <h3>Active Downloads</h3>
          <div class="download-list">
            <div class="download-item" *ngFor="let download of getActiveDownloads()">
              <div class="download-info">
                <div class="download-title">{{ download.stream.pageTitle }}</div>
                <div class="download-url">{{ download.stream.url }}</div>
                <div class="download-meta">
                  <span class="download-status status-{{ download.status }}">
                    <i [class]="getStatusIcon(download.status)"></i>
                    {{ download.status | titlecase }}
                  </span>
                  <span class="download-queue" *ngIf="download.status === 'pending'">
                    Queue Position: {{ getQueuePosition(download.id) + 1 }}
                  </span>
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
                  *ngIf="download.status === 'downloading'"
                  icon="pi pi-pause" 
                  [text]="true" 
                  size="small"
                  (onClick)="pauseDownload(download.id)"
                  tooltip="Pause Download">
                </p-button>
                <p-button 
                  *ngIf="download.status === 'paused'"
                  icon="pi pi-play" 
                  [text]="true" 
                  size="small"
                  (onClick)="resumeDownload(download.id)"
                  tooltip="Resume Download">
                </p-button>
                <p-button 
                  icon="pi pi-times" 
                  [text]="true" 
                  size="small"
                  (onClick)="cancelDownload(download.id)"
                  tooltip="Cancel Download"
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
                <div class="download-url">{{ download.stream.url }}</div>
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
                  icon="pi pi-folder-open" 
                  [text]="true" 
                  size="small"
                  (onClick)="openDownloadFolder(download.outputPath)"
                  tooltip="Open Folder"
                  *ngIf="download.outputPath">
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
                <div class="download-url">{{ download.stream.url }}</div>
                <div class="download-meta">
                  <span class="download-status status-{{ download.status }}">
                    <i [class]="getStatusIcon(download.status)"></i>
                    {{ download.status | titlecase }}
                  </span>
                  <span class="download-error" *ngIf="download.error">
                    Error: {{ download.error }}
                  </span>
                </div>
              </div>
              
              <div class="download-actions">
                <p-button 
                  icon="pi pi-refresh" 
                  [text]="true" 
                  size="small"
                  (onClick)="retryDownload(download.id)"
                  tooltip="Retry Download">
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

    .download-url {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

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
  `]
})
export class DownloadsComponent implements OnInit, OnDestroy {
  downloads: DownloadItem[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private downloadService: DownloadService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.downloadService.downloads$.subscribe(downloads => {
        this.downloads = downloads;
      })
    );
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

  async pauseDownload(downloadId: string): Promise<void> {
    const success = await this.downloadService.pauseDownload(downloadId);
    if (success) {
      this.toastService.showSuccess('Download paused', 'Download Control');
    } else {
      this.toastService.showError('Failed to pause download', 'Download Control');
    }
  }

  async resumeDownload(downloadId: string): Promise<void> {
    const success = await this.downloadService.resumeDownload(downloadId);
    if (success) {
      this.toastService.showSuccess('Download resumed', 'Download Control');
    } else {
      this.toastService.showError('Failed to resume download', 'Download Control');
    }
  }

  async cancelDownload(downloadId: string): Promise<void> {
    const success = await this.downloadService.cancelDownload(downloadId);
    if (success) {
      this.toastService.showSuccess('Download cancelled', 'Download Control');
    } else {
      this.toastService.showError('Failed to cancel download', 'Download Control');
    }
  }

  async clearCompleted(): Promise<void> {
    await this.downloadService.clearCompletedDownloads();
    this.toastService.showSuccess('Completed downloads cleared', 'Downloads');
  }

  async retryDownload(downloadId: string): Promise<void> {
    // For now, we'll just show a message that retry is not implemented
    this.toastService.showInfo('Retry functionality coming soon', 'Downloads');
  }

  openDownloadFolder(outputPath?: string): void {
    if (outputPath) {
      // This would open the folder in the file explorer
      // For now, just show a message
      this.toastService.showInfo(`Would open folder: ${outputPath}`, 'Downloads');
    }
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
