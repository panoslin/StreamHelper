import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-layout',
  template: `
    <div class="layout-wrapper">
      <!-- Header -->
      <header class="header">
        <div class="header-content">
          <div class="logo">
            <i class="pi pi-video" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
            <h1>StreamHelper Client</h1>
          </div>
          <div class="header-actions">
            <p-button 
              icon="pi pi-moon" 
              [text]="true" 
              (onClick)="toggleTheme()"
              tooltip="Toggle Theme">
            </p-button>
            <p-button 
              icon="pi pi-cog" 
              [text]="true" 
              (onClick)="navigateToSettings()"
              tooltip="Settings">
            </p-button>
          </div>
        </div>
      </header>

      <!-- Navigation -->
      <nav class="navigation">
        <div class="nav-content">
          <button
            class="nav-button"
            [class.active]="isActiveRoute('/downloads')"
            (click)="navigateTo('/downloads')">
            <i class="pi pi-download"></i>
            <span>Downloads</span>
          </button>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: var(--surface-ground);
    }

    .header {
      background: var(--surface-card);
      border-bottom: 1px solid var(--surface-border);
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }

    .logo {
      display: flex;
      align-items: center;
      color: var(--primary-color);
    }

    .logo h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .navigation {
      background: var(--surface-section);
      border-bottom: 1px solid var(--surface-border);
      padding: 0.5rem 1rem;
    }

    .nav-content {
      display: flex;
      gap: 0.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .nav-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: 2px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--text-color-secondary);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      min-width: 120px;
      justify-content: center;
    }

    .nav-button:hover {
      background: var(--surface-hover);
      color: var(--text-color);
      border-color: var(--surface-border);
    }

    .nav-button.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .nav-button.active:hover {
      background: var(--primary-600);
      border-color: var(--primary-600);
    }

    .nav-button i {
      font-size: 1.1rem;
    }

    .nav-button span {
      font-weight: 600;
      letter-spacing: 0.025em;
    }

    .main-content {
      flex: 1;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .header-content, .nav-content, .main-content {
        padding-left: 1rem;
        padding-right: 1rem;
      }
      
      .logo h1 {
        font-size: 1.2rem;
      }
      
      .nav-content {
        flex-direction: column;
        gap: 0.25rem;
      }

      .nav-button {
        min-width: auto;
        justify-content: flex-start;
        padding: 0.75rem 1rem;
      }
    }
  `]
})
export class LayoutComponent implements OnInit {
  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {}

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
