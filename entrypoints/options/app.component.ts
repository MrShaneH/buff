import { Component } from '@angular/core';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ApiKeyFormComponent],
  template: `<app-api-key-form />`,
})
export class AppComponent {}
