import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DownloadItem, DownloadProgress } from '../../../types';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  private downloadsSubject = new BehaviorSubject<DownloadItem[]>([]);
  public downloads$ = this.downloadsSubject.asObservable();

  constructor() {
    this.initializeListeners();
    this.loadDownloads();
  }

  private initializeListeners(): void {
    // Listen for download progress updates
    (window as any).electronAPI.onDownloadProgress((progress: DownloadProgress) => {
      this.updateDownloadProgress(progress);
    });

    // Listen for download completion
    (window as any).electronAPI.onDownloadCompleted((data: any) => {
      this.handleDownloadCompleted(data);
    });

    // Listen for download failures
    (window as any).electronAPI.onDownloadFailed((data: any) => {
      this.handleDownloadFailed(data);
    });

    // Listen for new streams
    (window as any).electronAPI.onStreamUpdate((streamData: any) => {
      this.handleNewStream(streamData);
    });
  }

  private async loadDownloads(): Promise<void> {
    try {
      const downloads = await (window as any).electronAPI.getDownloads();
      this.downloadsSubject.next(downloads);
    } catch (error) {
      console.error('Failed to load downloads:', error);
    }
  }

  private updateDownloadProgress(progress: DownloadProgress): void {
    // console.log('Received progress update:', progress);
    const currentDownloads = this.downloadsSubject.value;
    const downloadIndex = currentDownloads.findIndex(d => d.id === progress.id);
    
    if (downloadIndex !== -1) {
      const updatedDownloads = [...currentDownloads];
      updatedDownloads[downloadIndex] = {
        ...updatedDownloads[downloadIndex],
        progress: progress.progress,
        speed: progress.speed,
        eta: progress.eta,
        status: progress.status
      };
      
      // console.log('Updated download progress:', updatedDownloads[downloadIndex]);
      this.downloadsSubject.next(updatedDownloads);
    } else {
      console.warn('Download not found for progress update:', progress.id);
    }
  }

  private handleDownloadCompleted(data: any): void {
    const currentDownloads = this.downloadsSubject.value;
    const downloadIndex = currentDownloads.findIndex(d => d.id === data.id);
    
    if (downloadIndex !== -1) {
      const updatedDownloads = [...currentDownloads];
      updatedDownloads[downloadIndex] = {
        ...updatedDownloads[downloadIndex],
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        outputPath: data.outputPath
      };
      
      this.downloadsSubject.next(updatedDownloads);
    }
  }

  private handleDownloadFailed(data: any): void {
    const currentDownloads = this.downloadsSubject.value;
    const downloadIndex = currentDownloads.findIndex(d => d.id === data.id);
    
    if (downloadIndex !== -1) {
      const updatedDownloads = [...currentDownloads];
      updatedDownloads[downloadIndex] = {
        ...updatedDownloads[downloadIndex],
        status: 'failed',
        error: data.error
      };
      
      this.downloadsSubject.next(updatedDownloads);
    }
  }

  private handleNewStream(streamData: any): void {
    // This will be handled by the stream service
    // We just need to reload downloads to see if any new ones were created
    this.loadDownloads();
  }

  async pauseDownload(downloadId: string): Promise<boolean> {
    try {
      const result = await (window as any).electronAPI.pauseDownload(downloadId);
      return result.success;
    } catch (error) {
      console.error('Failed to pause download:', error);
      return false;
    }
  }

  async resumeDownload(downloadId: string): Promise<boolean> {
    try {
      const result = await (window as any).electronAPI.resumeDownload(downloadId);
      return result.success;
    } catch (error) {
      console.error('Failed to resume download:', error);
      return false;
    }
  }

  async cancelDownload(downloadId: string): Promise<boolean> {
    try {
      const result = await (window as any).electronAPI.cancelDownload(downloadId);
      return result.success;
    } catch (error) {
      console.error('Failed to cancel download:', error);
      return false;
    }
  }

  async retryDownload(downloadId: string): Promise<boolean> {
    try {
      const result = await (window as any).electronAPI.retryDownload(downloadId);
      return result.success;
    } catch (error) {
      console.error('Failed to retry download:', error);
      return false;
    }
  }

  async removeFailedDownload(downloadId: string): Promise<boolean> {
    try {
      const result = await (window as any).electronAPI.removeFailedDownload(downloadId);
      return result.success;
    } catch (error) {
      console.error('Failed to remove failed download:', error);
      return false;
    }
  }

  async clearCompletedDownloads(): Promise<void> {
    try {
      await (window as any).electronAPI.clearCompletedDownloads();
      await this.loadDownloads(); // Reload the list
    } catch (error) {
      console.error('Failed to clear completed downloads:', error);
    }
  }

  async testStreamCapture(url?: string, pageTitle?: string): Promise<boolean> {
    try {
      const result = await (window as any).electronAPI.testStreamCapture({ url, pageTitle });
      if (result.success) {
        await this.loadDownloads(); // Reload to see the new test download
      }
      return result.success;
    } catch (error) {
      console.error('Test stream capture failed:', error);
      return false;
    }
  }

  async downloadStream(stream: any): Promise<number> {
    try {
      // TODO: Implement proper stream download logic
      // This will communicate directly with the main process download manager
      throw new Error('Stream download not yet implemented');
    } catch (error) {
      console.error('Failed to download stream:', error);
      throw error;
    }
  }

  getDownloads(): DownloadItem[] {
    return this.downloadsSubject.value;
  }

  getActiveDownloads(): DownloadItem[] {
    return this.downloadsSubject.value.filter(d => 
      d.status === 'downloading' || d.status === 'pending'
    );
  }

  getCompletedDownloads(): DownloadItem[] {
    return this.downloadsSubject.value.filter(d => 
      d.status === 'completed' || d.status === 'failed'
    );
  }

  getDownloadById(id: string): DownloadItem | undefined {
    return this.downloadsSubject.value.find(d => d.id === id);
  }

  getDownloadsByStatus(status: string): DownloadItem[] {
    return this.downloadsSubject.value.filter(d => d.status === status);
  }

  getQueuePosition(downloadId: string): number {
    const downloads = this.downloadsSubject.value;
    const activeDownloads = downloads.filter(d => 
      d.status === 'downloading' || d.status === 'pending'
    );
    return activeDownloads.findIndex(d => d.id === downloadId);
  }

  async openDownloadsFolder(): Promise<void> {
    try {
      await (window as any).electronAPI.openDownloadsFolder();
    } catch (error) {
      console.error('Failed to open downloads folder:', error);
    }
  }
}
