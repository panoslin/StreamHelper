import { app } from 'electron';

/**
 * Check if the application is running in development mode
 */
export function isDevelopment(): boolean {
  return !app.isPackaged;
}

/**
 * Check if the application is running in production mode
 */
export function isProduction(): boolean {
  return app.isPackaged;
}

/**
 * Get the current environment name
 */
export function getEnvironment(): 'development' | 'production' {
  return isDevelopment() ? 'development' : 'production';
}

/**
 * Get the application data directory
 */
export function getAppDataPath(): string {
  return app.getPath('userData');
}

/**
 * Get the application logs directory
 */
export function getLogsPath(): string {
  return app.getPath('logs');
}

/**
 * Get the application temp directory
 */
export function getTempPath(): string {
  return app.getPath('temp');
}

/**
 * Get the application executable path
 */
export function getExecutablePath(): string {
  return app.getPath('exe');
}

/**
 * Get the application resources path
 */
export function getResourcesPath(): string {
  return app.getAppPath();
}
