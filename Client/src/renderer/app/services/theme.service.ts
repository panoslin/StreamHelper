import { Injectable, Renderer2, RendererFactory2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConfigService } from './config.service';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentThemeSubject = new BehaviorSubject<Theme>('auto');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  private renderer: Renderer2;

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
    private configService: ConfigService
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.initializeTheme();
  }

  private async initializeTheme(): Promise<void> {
    try {
      const config = await this.configService.getConfig();
      if (config && config.theme) {
        this.setTheme(config.theme);
      } else {
        // Default to auto theme
        this.setTheme('auto');
      }
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      this.setTheme('auto');
    }
  }

  async setTheme(theme: Theme): Promise<void> {
    this.currentThemeSubject.next(theme);
    
    // Remove existing theme classes
    this.renderer.removeClass(this.document.body, 'light-theme');
    this.renderer.removeClass(this.document.body, 'dark-theme');
    
    // Apply new theme
    if (theme === 'dark') {
      this.applyDarkTheme();
    } else if (theme === 'light') {
      this.applyLightTheme();
    } else {
      // Auto theme - check system preference
      this.checkSystemTheme();
    }

    // Save to config
    try {
      await this.configService.updateConfig({ theme });
    } catch (error) {
      console.error('Failed to save theme to config:', error);
    }
  }

  applyTheme(theme: Theme): void {
    this.currentThemeSubject.next(theme);
    
    // Remove existing theme classes
    this.renderer.removeClass(this.document.body, 'light-theme');
    this.renderer.removeClass(this.document.body, 'dark-theme');
    
    // Apply new theme
    if (theme === 'dark') {
      this.applyDarkTheme();
    } else if (theme === 'light') {
      this.applyLightTheme();
    } else {
      // Auto theme - check system preference
      this.checkSystemTheme();
    }
  }

  private applyDarkTheme(): void {
    this.renderer.addClass(this.document.body, 'dark-theme');
    this.renderer.setAttribute(this.document.documentElement, 'data-theme', 'dark');
    
    // Apply dark theme to PrimeNG components
    this.applyPrimeNGDarkTheme();
    
    this.isDarkModeSubject.next(true);
  }

  private applyLightTheme(): void {
    this.renderer.addClass(this.document.body, 'light-theme');
    this.renderer.setAttribute(this.document.documentElement, 'data-theme', 'light');
    
    // Apply light theme to PrimeNG components
    this.applyPrimeNGLightTheme();
    
    this.isDarkModeSubject.next(false);
  }

  private applyPrimeNGDarkTheme(): void {
    // Remove light theme class
    this.renderer.removeClass(this.document.body, 'p-component-overlay');
    
    // Add dark theme class
    this.renderer.addClass(this.document.body, 'dark-theme');
    
    // Update CSS custom properties for PrimeNG
    this.renderer.setStyle(this.document.documentElement, '--p-primary-color', '#3B82F6');
    this.renderer.setStyle(this.document.documentElement, '--p-primary-color-text', '#ffffff');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-ground', '#1a1a1a');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-section', '#2d2d2d');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-card', '#2d2d2d');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-overlay', '#404040');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-border', '#404040');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-hover', '#404040');
    this.renderer.setStyle(this.document.documentElement, '--p-text-color', '#ffffff');
    this.renderer.setStyle(this.document.documentElement, '--p-text-color-secondary', '#a0a0a0');
    this.renderer.setStyle(this.document.documentElement, '--p-border-radius', '8px');
  }

  private applyPrimeNGLightTheme(): void {
    // Remove dark theme class
    this.renderer.removeClass(this.document.body, 'dark-theme');
    
    // Add light theme class
    this.renderer.addClass(this.document.body, 'light-theme');
    
    // Update CSS custom properties for PrimeNG
    this.renderer.setStyle(this.document.documentElement, '--p-primary-color', '#3B82F6');
    this.renderer.setStyle(this.document.documentElement, '--p-primary-color-text', '#ffffff');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-ground', '#f8f9fa');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-section', '#ffffff');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-card', '#ffffff');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-overlay', '#ffffff');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-border', '#e0e0e0');
    this.renderer.setStyle(this.document.documentElement, '--p-surface-hover', '#f8f9fa');
    this.renderer.setStyle(this.document.documentElement, '--p-text-color', '#333333');
    this.renderer.setStyle(this.document.documentElement, '--p-text-color-secondary', '#6c757d');
    this.renderer.setStyle(this.document.documentElement, '--p-border-radius', '8px');
  }

  private checkSystemTheme(): void {
    // Check if system prefers dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      this.applyDarkTheme();
    } else {
      this.applyLightTheme();
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentThemeSubject.value === 'auto') {
        if (e.matches) {
          this.applyDarkTheme();
        } else {
          this.applyLightTheme();
        }
      }
    });
  }

  getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }

  // Method to toggle between light and dark themes
  toggleTheme(): void {
    const currentTheme = this.getCurrentTheme();
    if (currentTheme === 'auto') {
      // If auto, switch to light
      this.setTheme('light');
    } else if (currentTheme === 'light') {
      // If light, switch to dark
      this.setTheme('dark');
    } else {
      // If dark, switch to auto
      this.setTheme('auto');
    }
  }
}
