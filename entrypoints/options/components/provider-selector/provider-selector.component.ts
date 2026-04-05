import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Provider } from '../../../../lib/storage';

@Component({
  selector: 'app-provider-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <label>
        <input
          type="radio"
          name="provider"
          value="anthropic"
          [checked]="provider() === 'anthropic'"
          (change)="providerChange.emit('anthropic')"
        />
        Anthropic
      </label>
      <label>
        <input
          type="radio"
          name="provider"
          value="openai"
          [checked]="provider() === 'openai'"
          (change)="providerChange.emit('openai')"
        />
        OpenAI
      </label>
    </div>
  `,
})
export class ProviderSelectorComponent {
  readonly provider = input<Provider>('anthropic');
  readonly providerChange = output<Provider>();
}
