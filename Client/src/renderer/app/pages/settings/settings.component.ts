import { Component, OnInit, OnDestroy } from '@angular/core';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  template: `
    <div class="settings-page" [class.dark-theme]="isDarkMode">
      <div class="settings-header">
        <h2>Settings</h2>
        <p>Configure StreamHelper application settings</p>
      </div>

      <div class="settings-section">
        <h3>Download Settings</h3>
        
        <div class="setting-item">
          <label for="downloadDir">Download Directory:</label>
          <div class="directory-input-group">
            <input 
              type="text" 
              id="downloadDir" 
              [(ngModel)]="downloadDirectory" 
              placeholder="Enter download directory path"
              class="directory-input">
            <button 
              class="browse-btn" 
              (click)="browseDirectory()"
              type="button">
              Browse
            </button>
          </div>
          <div class="setting-hint">
            <i class="pi pi-info-circle"></i>
            <span>Choose where downloaded videos will be saved</span>
          </div>
        </div>

        <div class="setting-item">
          <label for="maxDownloads">Max Concurrent Downloads:</label>
          <input 
            type="number" 
            id="maxDownloads" 
            [(ngModel)]="maxConcurrentDownloads" 
            min="1" 
            max="10"
            class="number-input">
          <div class="setting-hint">
            <i class="pi pi-info-circle"></i>
            <span>Number of downloads that can run simultaneously</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>Connection Settings</h3>
        
        <div class="setting-item">
          <label for="webSocketPort">WebSocket Port:</label>
          <input 
            type="number" 
            id="webSocketPort" 
            [(ngModel)]="webSocketPort" 
            min="1024" 
            max="65535"
            class="number-input">
          <div class="setting-hint">
            <i class="pi pi-info-circle"></i>
            <span>Port for Chrome extension communication</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>Appearance Settings</h3>
        
        <div class="setting-item">
          <label for="theme">Theme:</label>
          <select 
            id="theme" 
            [(ngModel)]="theme" 
            class="theme-select">
            <option value="auto">Auto (Follow System)</option>
            <option value="light">Light Theme</option>
            <option value="dark">Dark Theme</option>
          </select>
          <div class="setting-hint">
            <i class="pi pi-palette"></i>
            <span>Choose your preferred theme or let it follow your system settings</span>
          </div>
        </div>
      </div>

      <div class="settings-actions">
        <button 
          class="btn btn-secondary" 
          (click)="resetToDefaults()">
          Reset to Defaults
        </button>
        <button 
          class="btn btn-primary" 
          (click)="saveSettings()">
          Save Settings
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .settings-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .settings-header h2 {
      color: var(--text-color);
      margin-bottom: 0.5rem;
    }

    .settings-header p {
      color: var(--text-color-secondary);
      margin: 0;
    }

    .settings-section {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .settings-section h3 {
      color: var(--text-color);
      margin: 0 0 1.5rem 0;
      font-size: 1.25rem;
      border-bottom: 2px solid var(--primary-color);
      padding-bottom: 0.5rem;
    }

    .setting-item {
      margin-bottom: 1.5rem;
    }

    .setting-item label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: var(--text-color);
    }

    .directory-input-group {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .directory-input {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid var(--surface-border);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-color);
      background: var(--surface-section);
      transition: all 0.2s ease;
    }

    .directory-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .browse-btn {
      padding: 0.75rem 1rem;
      background: var(--surface-hover);
      border: 2px solid var(--surface-border);
      border-radius: 8px;
      color: var(--text-color);
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .browse-btn:hover {
      background: var(--surface-border);
      border-color: var(--primary-color);
    }

    .number-input {
      width: 120px;
      padding: 0.75rem;
      border: 2px solid var(--surface-border);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-color);
      background: var(--surface-section);
      transition: all 0.2s ease;
    }

    .number-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .theme-select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid var(--surface-border);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-color);
      background: var(--surface-section);
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .theme-select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .theme-select option {
      background: var(--surface-section);
      color: var(--text-color);
    }

    .setting-hint {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .setting-hint i {
      color: var(--primary-color);
      font-size: 1rem;
    }

    .settings-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-color-dark, #1976d2);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }

    .btn-secondary {
      background: var(--surface-hover);
      color: var(--text-color);
      border: 2px solid var(--surface-border);
    }

    .btn-secondary:hover {
      background: var(--surface-border);
      border-color: var(--primary-color);
    }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  webSocketPort = 8080;
  downloadDirectory = '~/Downloads/StreamHelper';
  maxConcurrentDownloads = 3;
  theme: 'light' | 'dark' | 'auto' = 'auto';
  isDarkMode = false;
  private configSubscription?: Subscription;
  private themeSubscription?: Subscription;

  constructor(
    private configService: ConfigService,
    private themeService: ThemeService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.configSubscription = this.configService.config$.subscribe(config => {
      if (config) {
        this.webSocketPort = config.webSocketPort;
        this.downloadDirectory = config.defaultDownloadDir;
        this.maxConcurrentDownloads = config.maxConcurrentDownloads;
        this.theme = config.theme || 'auto';
      }
    });

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  ngOnDestroy(): void {
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  async browseDirectory(): Promise<void> {
    try {
      const result = await (window as any).electronAPI.selectDirectory();
      if (result.success && result.path) {
        this.downloadDirectory = result.path;
      }
    } catch (error) {
      console.error('Failed to browse directory:', error);
    }
  }

  async saveSettings(): Promise<void> {
    try {
      // Apply theme immediately (without saving to config)
      this.themeService.applyTheme(this.theme);
      
      // Save all settings in a single atomic operation to prevent race conditions
      const success = await this.configService.updateConfig({
        webSocketPort: this.webSocketPort,
        defaultDownloadDir: this.downloadDirectory,
        maxConcurrentDownloads: this.maxConcurrentDownloads,
        theme: this.theme
      });

      if (success) {
        this.toastService.showSuccess('Settings Saved', 'All settings have been saved successfully');
      } else {
        this.toastService.showError('Save Failed', 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.toastService.showError('Save Failed', 'Failed to save settings: ' + (error as Error).message);
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      const success = await this.configService.resetToDefaults();
      if (success) {
        // Reload current config
        this.ngOnInit();
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }
}
