import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  template: `
    <div class="progress-bar">
      <p-progressBar [value]="progress" [showValue]="true"></p-progressBar>
    </div>
  `,
  styles: [`
    .progress-bar {
      width: 100%;
    }
  `]
})
export class ProgressBarComponent {
  @Input() progress: number = 0;
}
