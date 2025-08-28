import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DownloadItem } from '../../../../types';
import { DownloadService } from '../../services/download.service';
import { StreamService } from '../../services/stream.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <h2>Dashboard</h2>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <p-card class="stat-card">
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-video stat-icon"></i>
              <span>Total Streams</span>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="stat-value">{{ totalStreams }}</div>
            <div class="stat-description">Captured streams</div>
          </ng-template>
        </p-card>

        <p-card class="stat-card">
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-download stat-icon"></i>
              <span>Active Downloads</span>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="stat-value">{{ activeDownloads }}</div>
            <div class="stat-description">Currently downloading</div>
          </ng-template>
        </p-card>

        <p-card class="stat-card">
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-check-circle stat-icon"></i>
              <span>Completed</span>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="stat-value">{{ completedDownloads }}</div>
            <div class="stat-description">Successfully downloaded</div>
          </ng-template>
        </p-card>

        <p-card class="stat-card">
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-exclamation-triangle stat-icon"></i>
              <span>Failed</span>
            </div>
          </ng-template>
          <ng-template pTemplate="content">
            <div class="stat-value">{{ failedDownloads }}</div>
            <div class="stat-description">Failed downloads</div>
          </ng-template>
        </p-card>
      </div>



      <!-- Recent Activity -->
      <div class="activity-section">
        <h3>Recent Activity</h3>
        
        <div class="activity-tabs">
          <p-tabView>
            <p-tabPanel header="Recent Streams">
              <div class="stream-list" *ngIf="getRecentStreams().length > 0; else noStreams">
                <div class="stream-item" *ngFor="let download of getRecentStreams()">
                  <div class="stream-info">
                    <div class="stream-title">{{ download.stream.pageTitle }}</div>
                    <div class="stream-url">{{ download.stream.url }}</div>
                    <div class="stream-time">{{ formatTime(download.stream.timestamp) }}</div>
                  </div>
                  <div class="stream-actions">
                    <p-button 
                      icon="pi pi-download" 
                      [text]="true" 
                      size="small"
                      tooltip="Download Stream">
                    </p-button>
                  </div>
                </div>
              </div>
              <ng-template #noStreams>
                <div class="empty-state">
                  <i class="pi pi-video" style="font-size: 3rem; color: var(--text-color-secondary);"></i>
                  <p>No streams captured yet</p>
                  <p class="text-secondary">Use the Chrome extension to capture streams</p>
                </div>
              </ng-template>
            </p-tabPanel>

            <p-tabPanel header="Recent Downloads">
              <div class="download-list" *ngIf="getRecentDownloads().length > 0; else noDownloads">
                <div class="download-item" *ngFor="let download of getRecentDownloads()">
                  <div class="download-info">
                    <div class="download-title">{{ download.stream.pageTitle }}</div>
                    <div class="download-status">
                      <span class="status-badge" [class]="'status-' + download.status">
                        {{ download.status }}
                      </span>
                      <span class="download-progress" *ngIf="download.status === 'downloading'">
                        {{ download.progress }}%
                      </span>
                    </div>
                    <div class="download-time">{{ formatTime(download.createdAt.getTime()) }}</div>
                  </div>
                </div>
              </div>
              <ng-template #noDownloads>
                <div class="empty-state">
                  <i class="pi pi-download" style="font-size: 3rem; color: var(--text-color-secondary);"></i>
                  <p>No downloads yet</p>
                  <p class="text-secondary">Streams will appear here once downloaded</p>
                </div>
              </ng-template>
            </p-tabPanel>
          </p-tabView>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 100%;
    }

    .dashboard h2 {
      margin-bottom: 2rem;
      color: var(--text-color);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      text-align: center;
    }

    .stat-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--surface-section);
    }

    .stat-icon {
      font-size: 1.5rem;
      color: var(--primary-color);
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: var(--primary-color);
      margin-bottom: 0.5rem;
    }

    .stat-description {
      color: var(--text-color-secondary);
      font-size: 0.9rem;
    }



    .activity-section {
      background: var(--surface-card);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .activity-section h3 {
      margin-bottom: 1.5rem;
      color: var(--text-color);
    }

    .stream-list, .download-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .stream-item, .download-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--surface-section);
      border-radius: 6px;
      border: 1px solid var(--surface-border);
    }

    .stream-info, .download-info {
      flex: 1;
    }

    .stream-title, .download-title {
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 0.25rem;
    }

    .stream-url {
      color: var(--text-color-secondary);
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
      word-break: break-all;
    }

    .stream-time, .download-time {
      color: var(--text-color-secondary);
      font-size: 0.8rem;
    }

    .download-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-pending {
      background: var(--yellow-100);
      color: var(--yellow-800);
    }

    .status-downloading {
      background: var(--blue-100);
      color: var(--blue-800);
    }

    .status-completed {
      background: var(--green-100);
      color: var(--green-800);
    }

    .status-failed {
      background: var(--red-100);
      color: var(--red-800);
    }

    .status-paused {
      background: var(--orange-100);
      color: var(--orange-800);
    }

    .download-progress {
      color: var(--text-color-secondary);
      font-size: 0.9rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-color-secondary);
    }

    .empty-state p {
      margin: 0.5rem 0;
    }

    .text-secondary {
      font-size: 0.9rem;
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .stream-item, .download-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  downloads: DownloadItem[] = [];
  totalStreams = 0;
  activeDownloads = 0;
  completedDownloads = 0;
  failedDownloads = 0;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private downloadService: DownloadService,
    private streamService: StreamService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.downloadService.downloads$.subscribe(downloads => {
        this.downloads = downloads;
        this.updateStats();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateStats(): void {
    this.totalStreams = this.downloads.length;
    this.activeDownloads = this.downloads.filter(d => 
      d.status === 'downloading' || d.status === 'pending'
    ).length;
    this.completedDownloads = this.downloads.filter(d => 
      d.status === 'completed'
    ).length;
    this.failedDownloads = this.downloads.filter(d => 
      d.status === 'failed'
    ).length;
  }



  getRecentStreams(): DownloadItem[] {
    return this.downloads
      .filter(d => d.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 5);
  }

  getRecentDownloads(): DownloadItem[] {
    return this.downloads
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 5);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'downloading': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'paused': return 'text-orange-600';
      default: return 'text-gray-600';
    }
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

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }
}
