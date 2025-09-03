import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private messageService: MessageService) {}

  showSuccess(summary: string, detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail,
      life: 3000
    });
  }

  showInfo(summary: string, detail: string): void {
    this.messageService.add({
      severity: 'info',
      summary,
      detail,
      life: 3000
    });
  }

  showWarning(summary: string, detail: string): void {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail,
      life: 5000
    });
  }

  showError(summary: string, detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary,
      detail,
      life: 8000
    });
  }

  showDownloadStarted(filename: string): void {
    this.showSuccess('Download Started', `Started downloading: ${filename}`);
  }

  showDownloadCompleted(filename: string): void {
    this.showSuccess('Download Completed', `Successfully downloaded: ${filename}`);
  }

  showDownloadFailed(filename: string, error: string): void {
    this.showError('Download Failed', `Failed to download ${filename}: ${error}`);
  }

  showStreamCaptured(pageTitle: string): void {
    this.showInfo('Stream Captured', `New stream captured from: ${pageTitle}`);
  }

  showWebSocketConnected(): void {
    this.showSuccess('WebSocket Connected', 'Extension connection established');
  }

  showWebSocketDisconnected(): void {
    this.showWarning('WebSocket Disconnected', 'Extension connection lost');
  }

  clear(): void {
    this.messageService.clear();
  }
}
