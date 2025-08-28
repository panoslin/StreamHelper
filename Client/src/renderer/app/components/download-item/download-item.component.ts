import { Component, Input } from '@angular/core';
import { DownloadItem } from '../../../../types';

@Component({
  selector: 'app-download-item',
  template: `
    <div class="download-item">
      <span>{{ download?.stream?.pageTitle || 'Unknown' }}</span>
    </div>
  `,
  styles: [`
    .download-item {
      padding: 0.5rem;
    }
  `]
})
export class DownloadItemComponent {
  @Input() download?: DownloadItem;
}
