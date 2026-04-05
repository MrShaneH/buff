import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { getSettings, saveSettings } from '../../../../lib/storage';
import type { Provider } from '../../../../lib/storage';
import { validateAnthropicKey, validateOpenAIKey } from '../../../../lib/apiClient';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
};

@Component({
  selector: 'app-api-key-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div>
      <label for="api-key">{{ label() }}</label>
      <input
        id="api-key"
        type="text"
        [formControl]="apiKeyControl"
        [attr.placeholder]="placeholder()"
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
export class ApiKeyFormComponent {
  readonly provider = input<Provider>('anthropic');
  readonly apiKey = input('');
  readonly saved = output<void>();

  readonly apiKeyControl = new FormControl('', { nonNullable: true });
  readonly status = signal<ValidationStatus>('idle');
  readonly isValidating = computed(() => this.status() === 'validating');
  readonly isValid = computed(() => this.status() === 'valid');
  readonly isInvalid = computed(() => this.status() === 'invalid');
  readonly label = computed(() =>
    this.provider() === 'anthropic' ? 'Anthropic API Key' : 'OpenAI API Key',
  );
  readonly placeholder = computed(() =>
    this.provider() === 'anthropic' ? 'sk-ant-…' : 'sk-…',
  );

  constructor() {
    // Sync form control whenever the parent updates the apiKey input
    // (initial load from storage and provider-switch clear both flow through here)
    effect(() => {
      this.apiKeyControl.setValue(this.apiKey());
      this.status.set('idle');
    });
  }

  async onValidate(): Promise<void> {
    this.status.set('validating');
    this.apiKeyControl.disable();

    const currentProvider = this.provider();
    const key = this.apiKeyControl.value;
    const model = DEFAULT_MODELS[currentProvider];

    const settings = await getSettings();
    await saveSettings({ ...settings, apiKey: key, provider: currentProvider, model });

    const isValid =
      currentProvider === 'anthropic'
        ? await validateAnthropicKey(key)
        : await validateOpenAIKey(key);

    this.status.set(isValid ? 'valid' : 'invalid');
    this.apiKeyControl.enable();

    if (isValid) {
      this.saved.emit();
    }
  }
}
