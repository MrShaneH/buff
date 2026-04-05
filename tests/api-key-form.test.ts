import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ApiKeyFormComponent } from '../entrypoints/options/components/api-key-form/api-key-form.component';
import { getSettings } from '../lib/storage';

vi.mock('../lib/apiClient', () => ({
  validateAnthropicKey: vi.fn(),
}));

import { validateAnthropicKey } from '../lib/apiClient';
const mockValidate = vi.mocked(validateAnthropicKey);

describe('ApiKeyFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.resetAllMocks();
  });

  async function mount(savedKey = ''): Promise<ReturnType<typeof TestBed.createComponent<ApiKeyFormComponent>>> {
    if (savedKey) {
      await new Promise<void>((resolve) =>
        chrome.storage.local.set(
          { buff_settings: { anthropicApiKey: savedKey, openAiApiKey: '', model: '' } },
          resolve,
        ),
      );
    }
    await TestBed.configureTestingModule({
      imports: [ApiKeyFormComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ApiKeyFormComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('pre-fills input with the saved API key on mount', async () => {
    const fixture = await mount('sk-ant-saved-key');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('sk-ant-saved-key');
  });

  it('writes the current input value to storage when Validate Key is clicked', async () => {
    mockValidate.mockResolvedValue(true);
    const fixture = await mount('sk-ant-old-key');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'sk-ant-new-key';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    const saved = await getSettings();
    expect(saved.anthropicApiKey).toBe('sk-ant-new-key');
  });

  it('calls validateAnthropicKey after writing the key to storage', async () => {
    mockValidate.mockResolvedValue(true);
    const fixture = await mount();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'sk-ant-test';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    expect(mockValidate).toHaveBeenCalledWith('sk-ant-test');
  });

  it('shows loading state and disables button while validating', async () => {
    let resolveValidation!: (v: boolean) => void;
    mockValidate.mockReturnValue(new Promise<boolean>((r) => (resolveValidation = r)));

    const fixture = await mount();
    fixture.nativeElement.querySelector('button').click();
    // Flush microtasks up to (but not past) the pending validateAnthropicKey promise
    await Promise.resolve();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="status-loading"]')).not.toBeNull();

    resolveValidation(true);
    await fixture.whenStable();
  });

  it('shows success indicator when key is valid', async () => {
    mockValidate.mockResolvedValue(true);
    const fixture = await mount();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="status-valid"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="status-invalid"]')).toBeNull();
  });

  it('shows error message when key is invalid', async () => {
    mockValidate.mockResolvedValue(false);
    const fixture = await mount();

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="status-invalid"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="status-valid"]')).toBeNull();
  });
});
