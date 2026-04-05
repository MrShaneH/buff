import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getSettings, saveSettings } from '../../../../lib/storage';

@Component({
  selector: 'app-api-key-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div>
      <label for="api-key">Anthropic API Key</label>
      <input
        id="api-key"
        type="text"
        [value]="apiKey()"
        (input)="apiKey.set($any($event.target).value)"
      />
      <button (click)="onValidate()">Validate Key</button>
    </div>
  `,
})
export class ApiKeyFormComponent implements OnInit {
  readonly apiKey = signal('');

  async ngOnInit(): Promise<void> {
    const settings = await getSettings();
    this.apiKey.set(settings.anthropicApiKey);
  }

  async onValidate(): Promise<void> {
    const settings = await getSettings();
    await saveSettings({ ...settings, anthropicApiKey: this.apiKey() });
  }
}
