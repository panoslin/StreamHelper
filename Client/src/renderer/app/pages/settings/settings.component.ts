import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-settings',
  template: `
    <div class="settings-page">
      <h2>Settings</h2>
      <p>Settings page - coming soon</p>
      <p>WebSocket Port: {{ webSocketPort }}</p>
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 1rem;
    }
  `]
})
export class SettingsComponent implements OnInit {
  webSocketPort = 8080;

  constructor(private configService: ConfigService) {}

  ngOnInit(): void {
    this.configService.config$.subscribe(config => {
      if (config) {
        this.webSocketPort = config.webSocketPort;
      }
    });
  }
}
