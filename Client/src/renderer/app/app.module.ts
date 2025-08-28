import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from 'primeng/api';

// Components
import { AppComponent } from './app.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DownloadsComponent } from './pages/downloads/downloads.component';
import { StreamsComponent } from './pages/streams/streams.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { DownloadItemComponent } from './components/download-item/download-item.component';
import { StreamItemComponent } from './components/stream-item/stream-item.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';

// Services
import { DownloadService } from './services/download.service';
import { StreamService } from './services/stream.service';
import { ConfigService } from './services/config.service';
import { ToastService } from './services/toast.service';

const routes: Routes = [
  { path: '', redirectTo: '/downloads', pathMatch: 'full' },
  { path: 'downloads', component: DownloadsComponent },
  { path: 'streams', component: StreamsComponent },
  { path: 'settings', component: SettingsComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    DownloadsComponent,
    StreamsComponent,
    SettingsComponent,
    DownloadItemComponent,
    StreamItemComponent,
    ProgressBarComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes),
    
    // PrimeNG Modules
    ButtonModule,
    CardModule,
    ProgressBarModule,
    TableModule,
    InputTextModule,
    DropdownModule,
    CheckboxModule,
    ToastModule,
    TabViewModule,
    BadgeModule,
    TooltipModule,
    ConfirmDialogModule
  ],
  providers: [
    DownloadService,
    StreamService,
    ConfigService,
    ToastService,
    ConfirmationService,
    MessageService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
