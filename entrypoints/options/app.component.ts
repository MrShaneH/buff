import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { getSettings, saveSettings } from '../../lib/storage';
import type { Provider } from '../../lib/storage';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';
import { ProviderSelectorComponent } from './components/provider-selector/provider-selector.component';

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
};

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProviderSelectorComponent, ApiKeyFormComponent],
  template: `
    <app-provider-selector
      [provider]="provider()"
      (providerChange)="onProviderChange($event)"
    />
    <app-api-key-form
      [provider]="provider()"
      [apiKey]="apiKey()"
    />
  `,
})
export class AppComponent implements OnInit {
  readonly provider = signal<Provider>('anthropic');
  readonly apiKey = signal('');

  async ngOnInit(): Promise<void> {
    const settings = await getSettings();
    this.provider.set(settings.provider);
    this.apiKey.set(settings.apiKey);
  }

  async onProviderChange(newProvider: Provider): Promise<void> {
    this.provider.set(newProvider);
    this.apiKey.set('');
    await saveSettings({ apiKey: '', provider: newProvider, model: DEFAULT_MODELS[newProvider] });
  }
}
