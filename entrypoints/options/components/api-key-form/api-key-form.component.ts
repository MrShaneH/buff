import { Component, OnInit, signal } from '@angular/core';
import { getSettings, saveSettings } from '../../../../lib/storage';
import { validateAnthropicKey } from '../../../../lib/apiClient';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

@Component({
  selector: 'app-api-key-form',
  standalone: true,
  template: `
    <div>
      <label for="api-key">Anthropic API Key</label>
      <input
        id="api-key"
        type="text"
        [value]="apiKey()"
        (input)="apiKey.set($any($event.target).value)"
        [disabled]="status() === 'validating'"
      />
      <button (click)="onValidate()" [disabled]="status() === 'validating'">
        Validate Key
      </button>
      @if (status() === 'validating') {
        <span data-testid="status-loading">Validating…</span>
      } @else if (status() === 'valid') {
        <span data-testid="status-valid">Key is valid</span>
      } @else if (status() === 'invalid') {
        <span data-testid="status-invalid">Invalid key — please check and try again</span>
      }
    </div>
  `,
})
export class ApiKeyFormComponent implements OnInit {
  readonly apiKey = signal('');
  readonly status = signal<ValidationStatus>('idle');

  async ngOnInit(): Promise<void> {
    const settings = await getSettings();
    this.apiKey.set(settings.anthropicApiKey);
  }

  async onValidate(): Promise<void> {
    this.status.set('validating');
    const settings = await getSettings();
    await saveSettings({ ...settings, anthropicApiKey: this.apiKey() });
    const isValid = await validateAnthropicKey(this.apiKey());
    this.status.set(isValid ? 'valid' : 'invalid');
  }
}
