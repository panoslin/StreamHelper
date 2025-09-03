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
        // Ensure all required fields are present by merging with defaults
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
    const platform = process.platform;
    const appPath = app.getAppPath();
    

    
    // Ensure yt-dlp path
    if (!this.config.ytdlpPath) {
      const ytdlpBinaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
      const ytdlpPath = this.findBinaryPath(appPath, platform, ytdlpBinaryName);
      this.config.ytdlpPath = ytdlpPath;
      logger.info('yt-dlp binary path set', { 
        path: ytdlpPath, 
        platform, 
        exists: existsSync(ytdlpPath)
      });
    }
    
    // Ensure FFmpeg path
    if (!this.config.ffmpegPath) {
      const ffmpegBinaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
      const ffmpegPath = this.findBinaryPath(appPath, platform, ffmpegBinaryName);
      this.config.ffmpegPath = ffmpegPath;
      logger.info('FFmpeg binary path set', { 
        path: ffmpegPath, 
        platform, 
        exists: existsSync(ffmpegPath)
      });
    }
    
    this.saveConfig();
  }

  private findBinaryPath(appPath: string, platform: string, binaryName: string): string {
    // Try multiple possible paths for the unpacked binaries
    const possiblePaths: string[] = [];
    
    // Path 1: Standard unpacked path
    const resourcesPath = appPath.replace('/app', '');
    const unpackedPath = join(resourcesPath, 'app.asar.unpacked', 'dist', 'bin', platform, binaryName);
    possiblePaths.push(unpackedPath);
    
    // Path 2: Alternative unpacked path (if app.getAppPath() returns different structure)
    const altUnpackedPath = join(appPath, '..', 'app.asar.unpacked', 'dist', 'bin', platform, binaryName);
    possiblePaths.push(altUnpackedPath);
    
    // Path 3: Direct unpacked path from app root
    const directUnpackedPath = join(appPath, 'app.asar.unpacked', 'dist', 'bin', platform, binaryName);
    possiblePaths.push(directUnpackedPath);
    
    // Path 4: Fallback to the old path for development
    const fallbackPath = join(appPath, 'dist', 'bin', platform, binaryName);
    possiblePaths.push(fallbackPath);
    
    // Find the first path that exists
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }
    
    // If no path exists, use the first unpacked path as default
    return unpackedPath;
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Expand paths if they contain ~
    if (updates.defaultDownloadDir) {
      this.config.defaultDownloadDir = expandPath(updates.defaultDownloadDir);
    }
    
    this.saveConfig();
    logger.info('Configuration updated', { updates });
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
