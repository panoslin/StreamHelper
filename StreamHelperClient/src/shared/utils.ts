import { Platform, StreamData, DownloadRequest } from '@/types';
import { PLATFORM_CONFIG, SUPPORTED_EXTENSIONS, ILLEGAL_CHARS, MAX_FILENAME_LENGTH } from '@/shared/constants';
import path from 'path';
import os from 'os';

// Platform detection
export function getPlatform(): Platform {
  return os.platform() as Platform;
}

export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

export function isMac(): boolean {
  return getPlatform() === 'darwin';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

// Path utilities
export function getHomeDirectory(): string {
  const platform = getPlatform();
  return PLATFORM_CONFIG[platform].homeDir;
}

export function normalizePath(filePath: string): string {
  const platform = getPlatform();
  return filePath.replace(/[\/\\]/g, PLATFORM_CONFIG[platform].pathSeparator);
}

export function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return filePath.replace('~', getHomeDirectory());
  }
  return filePath;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(ILLEGAL_CHARS, '_')
    .substring(0, MAX_FILENAME_LENGTH)
    .trim();
}

export function generateFilename(stream: StreamData, format: string): string {
  const timestamp = new Date(stream.timestamp).toISOString().split('T')[0];
  const sanitizedTitle = sanitizeFilename(stream.pageTitle);
  return `${sanitizedTitle}_${timestamp}.${format}`;
}

// URL utilities
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isStreamUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  
  const urlLower = url.toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => urlLower.includes(ext));
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

// File utilities
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function getFileSizeString(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  return `${hours}h ${minutes}m ${secs}s`;
}

// Validation utilities
export function validateDownloadRequest(request: DownloadRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!request.streamId) {
    errors.push('Stream ID is required');
  }
  
  if (!request.outputDir) {
    errors.push('Output directory is required');
  }
  
  if (!isValidUrl(request.outputDir) && !path.isAbsolute(request.outputDir)) {
    errors.push('Output directory must be a valid path');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Time utilities
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 0) return 'In the future';
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

// Array utilities
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function sortByProperty<T>(array: T[], property: keyof T, ascending: boolean = true): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];
    
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Error handling utilities
export function isError(error: any): error is Error {
  return error instanceof Error;
}

export function getErrorMessage(error: any): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// Color utilities for progress bars
export function getProgressColor(percentage: number): string {
  if (percentage < 25) return 'bg-error-500';
  if (percentage < 50) return 'bg-warning-500';
  if (percentage < 75) return 'bg-primary-500';
  return 'bg-success-500';
}

// UUID generation (simple implementation)
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
