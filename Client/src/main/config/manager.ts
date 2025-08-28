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
    if (!this.config.ytdlpPath) {
      const { getBinaryPath } = require('../../shared/utils');
      this.config.ytdlpPath = getBinaryPath();
      this.saveConfig();
    }
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
