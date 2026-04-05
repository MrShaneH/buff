import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProviderSelectorComponent } from '../entrypoints/options/components/provider-selector/provider-selector.component';

describe('ProviderSelectorComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  async function mount(
    provider: 'anthropic' | 'openai' = 'anthropic',
  ): Promise<ReturnType<typeof TestBed.createComponent<ProviderSelectorComponent>>> {
    await TestBed.configureTestingModule({
      imports: [ProviderSelectorComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProviderSelectorComponent);
    fixture.componentRef.setInput('provider', provider);
    fixture.detectChanges();
    return fixture;
  }

  it('renders radio inputs for both Anthropic and OpenAI', async () => {
    const fixture = await mount();
    const radios = fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeList;
    expect(radios.length).toBe(2);
    const values = Array.from(radios).map((r) => (r as HTMLInputElement).value);
    expect(values).toContain('anthropic');
    expect(values).toContain('openai');
  });

  it('checks the Anthropic radio when provider is anthropic', async () => {
    const fixture = await mount('anthropic');
    const anthropicRadio = fixture.nativeElement.querySelector(
      'input[value="anthropic"]',
    ) as HTMLInputElement;
    expect(anthropicRadio.checked).toBe(true);
  });

  it('checks the OpenAI radio when provider is openai', async () => {
    const fixture = await mount('openai');
    const openaiRadio = fixture.nativeElement.querySelector(
      'input[value="openai"]',
    ) as HTMLInputElement;
    expect(openaiRadio.checked).toBe(true);
  });

  it('emits providerChange with "openai" when OpenAI is selected', async () => {
    const fixture = await mount('anthropic');

    let emitted: string | undefined;
    fixture.componentInstance.providerChange.subscribe((v) => (emitted = v));

    const openaiRadio = fixture.nativeElement.querySelector(
      'input[value="openai"]',
    ) as HTMLInputElement;
    openaiRadio.dispatchEvent(new Event('change'));

    expect(emitted).toBe('openai');
  });

  it('emits providerChange with "anthropic" when Anthropic is selected', async () => {
    const fixture = await mount('openai');

    let emitted: string | undefined;
    fixture.componentInstance.providerChange.subscribe((v) => (emitted = v));

    const anthropicRadio = fixture.nativeElement.querySelector(
      'input[value="anthropic"]',
    ) as HTMLInputElement;
    anthropicRadio.dispatchEvent(new Event('change'));

    expect(emitted).toBe('anthropic');
  });
});
