import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { AppConfig, DEFAULT_CONFIG } from '../../shared/constants';
import { expandPath } from '../../shared/utils';
import { logger } from '../utils/logger';

export class ConfigManager {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    this.configPath = join(app.getPath('userData'), 'config.json');
    this.config = this.loadConfig();
    this.ensureBinaryPath();
  }

  private loadConfig(): AppConfig {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        this.config = { ...DEFAULT_CONFIG, ...loadedConfig };
        logger.info('Configuration loaded from file', { path: this.configPath });
      } else {
        this.config = { ...DEFAULT_CONFIG };
        this.saveConfig();
        logger.info('Default configuration created');
      }
    } catch (error) {
      logger.error('Failed to load configuration, using defaults', { error });
      this.config = { ...DEFAULT_CONFIG };
    }

    return this.config;
  }

  private saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info('Configuration saved to file');
    } catch (error) {
      logger.error('Failed to save configuration', { error });
    }
  }

  private ensureBinaryPath(): void {
    // Ensure yt-dlp binary path
    if (!this.config.ytdlpPath) {
      this.config.ytdlpPath = this.resolveBinaryPath('yt-dlp');
      this.saveConfig();
    }
    
    // Ensure FFmpeg binary path
    if (!this.config.ffmpegPath) {
      this.config.ffmpegPath = this.resolveBinaryPath('ffmpeg');
      this.saveConfig();
    }
  }

  private resolveBinaryPath(binaryName: string): string {
    // Use Electron's app path and platform detection for bundled app
    const platform = process.platform;
    const executableName = platform === 'win32' ? `${binaryName}.exe` : binaryName;
    
    // In bundled apps with ASAR enabled:
    // - app.getAppPath() points to the app directory inside Resources
    // - Binaries are unpacked to app.asar.unpacked/dist/bin/{platform}/{executableName}
    const appPath = app.getAppPath();
    
    // Try multiple possible paths for the unpacked binaries
    const possiblePaths = [];
    
    // Path 1: Standard unpacked path
    const resourcesPath = appPath.replace('/app', '');
    const unpackedPath = join(resourcesPath, 'app.asar.unpacked', 'dist', 'bin', platform, executableName);
    possiblePaths.push(unpackedPath);
    
    // Path 2: Alternative unpacked path (if app.getAppPath() returns different structure)
    const altUnpackedPath = join(appPath, '..', 'app.asar.unpacked', 'dist', 'bin', platform, executableName);
    possiblePaths.push(altUnpackedPath);
    
    // Path 3: Direct unpacked path from app root
    const directUnpackedPath = join(appPath, 'app.asar.unpacked', 'dist', 'bin', platform, executableName);
    possiblePaths.push(directUnpackedPath);
    
    // Path 4: Fallback to the old path for development
    const fallbackPath = join(appPath, 'dist', 'bin', platform, executableName);
    possiblePaths.push(fallbackPath);
    
    // Find the first path that exists
    let binaryPath = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        binaryPath = path;
        break;
      }
    }
    
    // If no path exists, use the first unpacked path as default
    if (!binaryPath) {
      binaryPath = unpackedPath;
    }
    
    logger.info(`${binaryName} binary path resolved`, { 
      path: binaryPath, 
      platform, 
      appPath, 
      possiblePaths,
      exists: existsSync(binaryPath)
    });
    
    return binaryPath;
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): boolean {
    try {
      this.config = { ...this.config, ...updates };
      
      // Expand paths if they contain ~
      if (updates.defaultDownloadDir) {
        this.config.defaultDownloadDir = expandPath(updates.defaultDownloadDir);
      }
      
      this.saveConfig();
      logger.info('Configuration updated', { updates });
      return true;
    } catch (error) {
      logger.error('Failed to update configuration', { error, updates });
      return false;
    }
  }

  get(key: keyof AppConfig): any {
    return this.config[key];
  }

  set(key: keyof AppConfig, value: any): void {
    (this.config as any)[key] = value;
    this.saveConfig();
    logger.info(`Configuration key '${String(key)}' updated`, { value });
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.ensureBinaryPath();
    this.saveConfig();
    logger.info('Configuration reset to defaults');
  }
}

export const configManager = new ConfigManager();
