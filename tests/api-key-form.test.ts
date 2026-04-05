import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ApiKeyFormComponent } from '../entrypoints/options/components/api-key-form/api-key-form.component';
import { getSettings } from '../lib/storage';

vi.mock('../lib/apiClient', () => ({
  validateAnthropicKey: vi.fn(),
  validateOpenAIKey: vi.fn(),
}));

import { validateAnthropicKey, validateOpenAIKey } from '../lib/apiClient';
const mockValidateAnthropic = vi.mocked(validateAnthropicKey);
const mockValidateOpenAI = vi.mocked(validateOpenAIKey);

describe('ApiKeyFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.resetAllMocks();
  });

  async function mount(
    provider: 'anthropic' | 'openai' = 'anthropic',
    savedKey = '',
  ): Promise<ReturnType<typeof TestBed.createComponent<ApiKeyFormComponent>>> {
    await TestBed.configureTestingModule({
      imports: [ApiKeyFormComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ApiKeyFormComponent);
    fixture.componentRef.setInput('provider', provider);
    fixture.componentRef.setInput('apiKey', savedKey);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('pre-fills input with the provided apiKey on mount', async () => {
    const fixture = await mount('anthropic', 'sk-ant-saved-key');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('sk-ant-saved-key');
  });

  it('shows "Anthropic API Key" label when provider is anthropic', async () => {
    const fixture = await mount('anthropic');
    expect(fixture.nativeElement.querySelector('label').textContent).toContain('Anthropic API Key');
  });

  it('shows "OpenAI API Key" label when provider is openai', async () => {
    const fixture = await mount('openai');
    expect(fixture.nativeElement.querySelector('label').textContent).toContain('OpenAI API Key');
  });

  it('writes the current input value to storage when Validate Key is clicked', async () => {
    mockValidateAnthropic.mockResolvedValue(true);
    const fixture = await mount('anthropic', 'sk-ant-old-key');

    fixture.componentInstance.apiKeyControl.setValue('sk-ant-new-key');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    const saved = await getSettings();
    expect(saved.apiKey).toBe('sk-ant-new-key');
  });

  it('calls validateAnthropicKey when provider is anthropic', async () => {
    mockValidateAnthropic.mockResolvedValue(true);
    const fixture = await mount('anthropic');

    fixture.componentInstance.apiKeyControl.setValue('sk-ant-test');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    expect(mockValidateAnthropic).toHaveBeenCalledWith('sk-ant-test');
    expect(mockValidateOpenAI).not.toHaveBeenCalled();
  });

  it('calls validateOpenAIKey when provider is openai', async () => {
    mockValidateOpenAI.mockResolvedValue(true);
    const fixture = await mount('openai');

    fixture.componentInstance.apiKeyControl.setValue('sk-openai-test');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    expect(mockValidateOpenAI).toHaveBeenCalledWith('sk-openai-test');
    expect(mockValidateAnthropic).not.toHaveBeenCalled();
  });

  it('saves model claude-sonnet-4-6 when provider is anthropic', async () => {
    mockValidateAnthropic.mockResolvedValue(true);
    const fixture = await mount('anthropic');

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    const saved = await getSettings();
    expect(saved.model).toBe('claude-sonnet-4-6');
  });

  it('saves model gpt-4o when provider is openai', async () => {
    mockValidateOpenAI.mockResolvedValue(true);
    const fixture = await mount('openai');

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    const saved = await getSettings();
    expect(saved.model).toBe('gpt-4o');
  });

  it('emits saved output after successful validation', async () => {
    mockValidateAnthropic.mockResolvedValue(true);
    const fixture = await mount('anthropic');

    let savedEmitted = false;
    fixture.componentInstance.saved.subscribe(() => (savedEmitted = true));

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    expect(savedEmitted).toBe(true);
  });

  it('does not emit saved when validation fails', async () => {
    mockValidateAnthropic.mockResolvedValue(false);
    const fixture = await mount('anthropic');

    let savedEmitted = false;
    fixture.componentInstance.saved.subscribe(() => (savedEmitted = true));

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    expect(savedEmitted).toBe(false);
  });

  it('shows loading state and disables button while validating', async () => {
    let resolveValidation!: (v: boolean) => void;
    mockValidateAnthropic.mockReturnValue(new Promise<boolean>((r) => (resolveValidation = r)));

    const fixture = await mount('anthropic');
    fixture.nativeElement.querySelector('button').click();
    await Promise.resolve();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="status-loading"]')).not.toBeNull();

    resolveValidation(true);
    await fixture.whenStable();
  });

  it('shows success indicator when key is valid', async () => {
    mockValidateAnthropic.mockResolvedValue(true);
    const fixture = await mount('anthropic');

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="status-valid"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="status-invalid"]')).toBeNull();
  });

  it('shows error message when key is invalid', async () => {
    mockValidateAnthropic.mockResolvedValue(false);
    const fixture = await mount('anthropic');

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="status-invalid"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="status-valid"]')).toBeNull();
  });
});
