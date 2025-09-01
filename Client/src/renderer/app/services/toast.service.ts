import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  constructor() {}

  showSuccess(message: string, duration: number = 3000): void {
    this.showToast({
      id: this.generateId(),
      type: 'success',
      message,
      duration
    });
  }

  showError(message: string, duration: number = 5000): void {
    this.showToast({
      id: this.generateId(),
      type: 'error',
      message,
      duration
    });
  }

  showInfo(message: string, duration: number = 3000): void {
    this.showToast({
      id: this.generateId(),
      type: 'info',
      message,
      duration
    });
  }

  showWarning(message: string, duration: number = 4000): void {
    this.showToast({
      id: this.generateId(),
      type: 'warning',
      message,
      duration
    });
  }

  private showToast(toast: ToastMessage): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto-remove toast after duration
    if (toast.duration) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, toast.duration);
    }
  }

  removeToast(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(toast => toast.id !== id));
  }

  clearAll(): void {
    this.toastsSubject.next([]);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
