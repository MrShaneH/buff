import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { getSettings, saveSettings } from '../../../../lib/storage';
import { validateAnthropicKey } from '../../../../lib/apiClient';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

@Component({
  selector: 'app-api-key-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div>
      <label for="api-key">Anthropic API Key</label>
      <input
        id="api-key"
        type="text"
        [formControl]="apiKeyControl"
      />
      <button (click)="onValidate()" [disabled]="isValidating()">
        Validate Key
      </button>
      <div role="status" aria-live="polite">
        @if (isValidating()) {
          <span data-testid="status-loading">Validating…</span>
        } @else if (isValid()) {
          <span data-testid="status-valid">Key is valid</span>
        } @else if (isInvalid()) {
          <span data-testid="status-invalid">Invalid key — please check and try again</span>
        }
      </div>
    </div>
  `,
})
export class ApiKeyFormComponent implements OnInit {
  readonly apiKeyControl = new FormControl('', { nonNullable: true });
  readonly status = signal<ValidationStatus>('idle');
  readonly isValidating = computed(() => this.status() === 'validating');
  readonly isValid = computed(() => this.status() === 'valid');
  readonly isInvalid = computed(() => this.status() === 'invalid');

  async ngOnInit(): Promise<void> {
    const settings = await getSettings();
    this.apiKeyControl.setValue(settings.anthropicApiKey);
  }

  async onValidate(): Promise<void> {
    this.status.set('validating');
    this.apiKeyControl.disable();
    const settings = await getSettings();
    await saveSettings({ ...settings, anthropicApiKey: this.apiKeyControl.value });
    const isValid = await validateAnthropicKey(this.apiKeyControl.value);
    this.status.set(isValid ? 'valid' : 'invalid');
    this.apiKeyControl.enable();
  }
}
