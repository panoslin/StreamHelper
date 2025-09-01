import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfig } from '../../../types';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const config = await (window as any).electronAPI.getConfig();
      this.configSubject.next(config);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<boolean> {
    try {
      const result = await (window as any).electronAPI.updateConfig(updates);
      return result.success;
    } catch (error) {
      console.error('Failed to update configuration:', error);
      return false;
    }
  }

  getConfig(): AppConfig | null {
    return this.configSubject.value;
  }

  getConfigValue<K extends keyof AppConfig>(key: K): AppConfig[K] | undefined {
    const config = this.configSubject.value;
    return config ? config[key] : undefined;
  }

  async resetToDefaults(): Promise<boolean> {
    const defaultConfig: AppConfig = {
      webSocketPort: 8080,
      maxConcurrentDownloads: 3,
      defaultDownloadDir: '~/Downloads/StreamHelper',
      ytdlpPath: '',
      ffmpegPath: '',
      autoStartDownloads: true,
      notifications: true,
      appDataPath: '~/.streamhelper',
      theme: 'auto'
    };

    return await this.updateConfig(defaultConfig);
  }

  async setWebSocketPort(port: number): Promise<boolean> {
    return await this.updateConfig({ webSocketPort: port });
  }

  async setMaxConcurrentDownloads(max: number): Promise<boolean> {
    return await this.updateConfig({ maxConcurrentDownloads: max });
  }

  async setDefaultDownloadDir(dir: string): Promise<boolean> {
    return await this.updateConfig({ defaultDownloadDir: dir });
  }

  async setYtdlpPath(path: string): Promise<boolean> {
    return await this.updateConfig({ ytdlpPath: path });
  }

  async setAutoStartDownloads(autoStart: boolean): Promise<boolean> {
    return await this.updateConfig({ autoStartDownloads: autoStart });
  }

  async setNotifications(enabled: boolean): Promise<boolean> {
    return await this.updateConfig({ notifications: enabled });
  }
}
