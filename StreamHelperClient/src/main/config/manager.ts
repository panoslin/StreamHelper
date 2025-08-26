import Store from 'electron-store';
import { AppConfig, Platform } from '@/types';
import { DEFAULT_DOWNLOAD_DIR, MAX_CONCURRENT_DOWNLOADS, DEFAULT_QUALITY, DEFAULT_FORMAT } from '@/shared/constants';
import { getPlatform, getHomeDirectory, expandPath } from '@/shared/utils';
import { join } from 'path';

// Configuration schema
interface ConfigSchema {
  app: AppConfig;
  ytdlp: {
    binaryPath: string;
    version: string;
    lastUpdateCheck: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    windowBounds: {
      width: number;
      height: number;
      x?: number;
      y?: number;
    };
    sidebarCollapsed: boolean;
  };
  communication: {
    websocketPort: number;
    autoConnect: boolean;
    retryInterval: number;
    maxRetries: number;
  };
}

// Default configuration
const defaultConfig: ConfigSchema = {
  app: {
    downloadDirectory: DEFAULT_DOWNLOAD_DIR,
    maxConcurrentDownloads: MAX_CONCURRENT_DOWNLOADS,
    defaultQuality: DEFAULT_QUALITY,
    defaultFormat: DEFAULT_FORMAT,
    includeSubtitles: true,
    includeThumbnail: true,
    autoStartDownloads: false,
    notificationSound: true,
    minimizeToTray: true,
    startWithSystem: false,
  },
  ytdlp: {
    binaryPath: '',
    version: '',
    lastUpdateCheck: 0,
  },
  ui: {
    theme: 'system',
    windowBounds: {
      width: 1200,
      height: 800,
    },
    sidebarCollapsed: false,
  },
  communication: {
    websocketPort: 8080,
    autoConnect: true,
    retryInterval: 5000,
    maxRetries: 3,
  },
};

class ConfigManager {
  private store: Store<ConfigSchema>;
  private platform: Platform;

  constructor() {
    this.platform = getPlatform();
    this.store = new Store<ConfigSchema>({
      name: 'config',
      defaults: defaultConfig,
      schema: {
        app: {
          type: 'object',
          properties: {
            downloadDirectory: { type: 'string' },
            maxConcurrentDownloads: { type: 'number', minimum: 1, maximum: 10 },
            defaultQuality: { type: 'string', enum: ['auto', 'best', 'worst'] },
            defaultFormat: { type: 'string', enum: ['mp4', 'mkv', 'webm', 'auto'] },
            includeSubtitles: { type: 'boolean' },
            includeThumbnail: { type: 'boolean' },
            autoStartDownloads: { type: 'boolean' },
            notificationSound: { type: 'boolean' },
            minimizeToTray: { type: 'boolean' },
            startWithSystem: { type: 'boolean' },
          },
        },
        ytdlp: {
          type: 'object',
          properties: {
            binaryPath: { type: 'string' },
            version: { type: 'string' },
            lastUpdateCheck: { type: 'number' },
          },
        },
        ui: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark', 'system'] },
            windowBounds: {
              type: 'object',
              properties: {
                width: { type: 'number', minimum: 800 },
                height: { type: 'number', minimum: 600 },
                x: { type: 'number' },
                y: { type: 'number' },
              },
            },
            sidebarCollapsed: { type: 'boolean' },
          },
        },
        communication: {
          type: 'object',
          properties: {
            websocketPort: { type: 'number', minimum: 1024, maximum: 65535 },
            autoConnect: { type: 'boolean' },
            retryInterval: { type: 'number', minimum: 1000, maximum: 30000 },
            maxRetries: { type: 'number', minimum: 1, maximum: 10 },
          },
        },
      },
    });

    // Initialize platform-specific defaults
    this.initializePlatformDefaults();
  }

  private initializePlatformDefaults(): void {
    const currentConfig = this.store.get('app');
    
    // Set default download directory based on platform
    if (!currentConfig.downloadDirectory || currentConfig.downloadDirectory === DEFAULT_DOWNLOAD_DIR) {
      const homeDir = getHomeDirectory();
      const defaultDir = join(homeDir, 'Downloads', 'StreamHelper');
      this.store.set('app.downloadDirectory', defaultDir);
    }

    // Set yt-dlp binary path based on platform
    const ytdlpConfig = this.store.get('ytdlp');
    if (!ytdlpConfig.binaryPath) {
      const binaryPath = this.getDefaultYtDlpPath();
      this.store.set('ytdlp.binaryPath', binaryPath);
    }
  }

  private getDefaultYtDlpPath(): string {
    const platform = getPlatform();
    const homeDir = getHomeDirectory();
    
    switch (platform) {
      case 'win32':
        return join(homeDir, 'AppData', 'Local', 'Programs', 'yt-dlp', 'yt-dlp.exe');
      case 'darwin':
        return join(homeDir, 'Applications', 'yt-dlp');
      case 'linux':
        return join(homeDir, '.local', 'bin', 'yt-dlp');
      default:
        return '';
    }
  }

  // Get configuration methods
  getAppConfig(): AppConfig {
    return this.store.get('app');
  }

  getYtDlpConfig() {
    return this.store.get('ytdlp');
  }

  getUIConfig() {
    return this.store.get('ui');
  }

  getCommunicationConfig() {
    return this.store.get('communication');
  }

  getDownloadDirectory(): string {
    const dir = this.store.get('app.downloadDirectory') as string;
    return expandPath(dir);
  }

  getMaxConcurrentDownloads(): number {
    return this.store.get('app.maxConcurrentDownloads');
  }

  getDefaultQuality(): string {
    return this.store.get('app.defaultQuality');
  }

  getDefaultFormat(): string {
    return this.store.get('app.defaultFormat');
  }

  // Set configuration methods
  setAppConfig(config: Partial<AppConfig>): void {
    this.store.set('app', { ...this.getAppConfig(), ...config });
  }

  setDownloadDirectory(directory: string): void {
    this.store.set('app.downloadDirectory', directory);
  }

  setMaxConcurrentDownloads(max: number): void {
    this.store.set('app.maxConcurrentDownloads', Math.max(1, Math.min(10, max)));
  }

  setDefaultQuality(quality: string): void {
    this.store.set('app.defaultQuality', quality);
  }

  setDefaultFormat(format: string): void {
    this.store.set('app.defaultFormat', format);
  }

  setYtDlpBinaryPath(path: string): void {
    this.store.set('ytdlp.binaryPath', path);
  }

  setYtDlpVersion(version: string): void {
    this.store.set('ytdlp.version', version);
  }

  setWindowBounds(bounds: { width: number; height: number; x?: number; y?: number }): void {
    this.store.set('ui.windowBounds', bounds);
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.store.set('ui.theme', theme);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.store.set('ui.sidebarCollapsed', collapsed);
  }

  // Reset configuration
  resetToDefaults(): void {
    this.store.clear();
    this.initializePlatformDefaults();
  }

  // Export/Import configuration
  exportConfig(): string {
    return JSON.stringify(this.store.store, null, 2);
  }

  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      this.store.store = config;
      this.initializePlatformDefaults();
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  // Validation methods
  validateDownloadDirectory(directory: string): { valid: boolean; error?: string } {
    try {
      const expandedPath = expandPath(directory);
      
      // Check if directory exists or can be created
      const fs = require('fs');
      if (!fs.existsSync(expandedPath)) {
        try {
          fs.mkdirSync(expandedPath, { recursive: true });
        } catch (error) {
          return { valid: false, error: 'Cannot create directory' };
        }
      }
      
      // Check if directory is writable
      try {
        const testFile = join(expandedPath, '.test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (error) {
        return { valid: false, error: 'Directory is not writable' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid directory path' };
    }
  }

  // Get configuration file path
  getConfigFilePath(): string {
    return this.store.path;
  }

  // Check if configuration has been modified
  isModified(): boolean {
    return this.store.size > 0;
  }
}

// Create singleton instance
const configManager = new ConfigManager();

export function setupConfigManager(): Promise<void> {
  return Promise.resolve();
}

export { configManager };
export default configManager;
