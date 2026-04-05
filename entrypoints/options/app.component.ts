import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApiKeyFormComponent],
  template: `<app-api-key-form />`,
})
export class AppComponent {}
