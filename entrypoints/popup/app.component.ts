import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1>Buff</h1>
      <p>Coming soon</p>
    </div>
  `,
})
export class AppComponent {}
