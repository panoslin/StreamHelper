import { app } from 'electron';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

export class Logger {
  private logPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    const logsDir = join(userDataPath, 'logs');
    
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    
    this.logPath = join(logsDir, 'app.log');
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
  }

  info(message: string, data?: any): void {
    const logMessage = this.formatMessage('INFO', message, data);
    console.log(logMessage.trim());
    this.writeToFile(logMessage);
  }

  warn(message: string, data?: any): void {
    const logMessage = this.formatMessage('WARN', message, data);
    console.warn(logMessage.trim());
    this.writeToFile(logMessage);
  }

  error(message: string, data?: any): void {
    const logMessage = this.formatMessage('ERROR', message, data);
    console.error(logMessage.trim());
    this.writeToFile(logMessage);
  }

  debug(message: string, data?: any): void {
    const logMessage = this.formatMessage('DEBUG', message, data);
    console.debug(logMessage.trim());
    this.writeToFile(logMessage);
  }

  private writeToFile(message: string): void {
    try {
      writeFileSync(this.logPath, message, { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}

export const logger = new Logger();
