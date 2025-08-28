import { Component, Input } from '@angular/core';
import { StreamData } from '../../../../types';

@Component({
  selector: 'app-stream-item',
  template: `
    <div class="stream-item">
      <span>{{ stream?.pageTitle || 'Unknown Stream' }}</span>
    </div>
  `,
  styles: [`
    .stream-item {
      padding: 0.5rem;
    }
  `]
})
export class StreamItemComponent {
  @Input() stream?: StreamData;
}
