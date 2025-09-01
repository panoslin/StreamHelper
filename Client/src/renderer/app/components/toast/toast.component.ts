import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container" *ngIf="toasts.length > 0">
      <div 
        *ngFor="let toast of toasts" 
        class="toast"
        [class]="'toast-' + toast.type"
        [@toastAnimation]>
        <div class="toast-content">
          <div class="toast-icon">
            <i [class]="getIconClass(toast.type)"></i>
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button 
            class="toast-close" 
            (click)="removeToast(toast.id)"
            type="button">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
      min-width: 300px;
    }

    .toast-success {
      border-left: 4px solid #22c55e;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    }

    .toast-error {
      border-left: 4px solid #ef4444;
      background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
    }

    .toast-info {
      border-left: 4px solid #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }

    .toast-warning {
      border-left: 4px solid #f59e0b;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toast-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-icon i {
      font-size: 16px;
    }

    .toast-success .toast-icon i {
      color: #22c55e;
    }

    .toast-error .toast-icon i {
      color: #ef4444;
    }

    .toast-info .toast-icon i {
      color: #3b82f6;
    }

    .toast-warning .toast-icon i {
      color: #f59e0b;
    }

    .toast-message {
      flex: 1;
      color: var(--text-color);
      font-size: 14px;
      line-height: 1.4;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: var(--text-color-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .toast-close:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .toast.removing {
      animation: slideOut 0.3s ease-in forwards;
    }
  `],
  animations: [
    // You can add Angular animations here if needed
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeToast(id: string): void {
    this.toastService.removeToast(id);
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success':
        return 'pi pi-check-circle';
      case 'error':
        return 'pi pi-times-circle';
      case 'info':
        return 'pi pi-info-circle';
      case 'warning':
        return 'pi pi-exclamation-triangle';
      default:
        return 'pi pi-info-circle';
    }
  }
}
