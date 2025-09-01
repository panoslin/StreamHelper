import { Component, OnInit } from '@angular/core';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  template: `
    <app-layout></app-layout>
    <app-toast></app-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    // Initialize the app
    this.toastService.showSuccess('StreamHelper Client started successfully');
  }
}
