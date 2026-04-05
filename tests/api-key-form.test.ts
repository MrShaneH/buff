import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ApiKeyFormComponent } from '../entrypoints/options/components/api-key-form/api-key-form.component';
import { saveSettings, getSettings } from '../lib/storage';

describe('ApiKeyFormComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  async function mountWithKey(key: string): Promise<{ fixture: ReturnType<typeof TestBed.createComponent<ApiKeyFormComponent>>; input: HTMLInputElement }> {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set({ buff_settings: { anthropicApiKey: key, openAiApiKey: '', model: '' } }, resolve),
    );

    await TestBed.configureTestingModule({
      imports: [ApiKeyFormComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ApiKeyFormComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    return { fixture, input };
  }

  it('pre-fills input with the saved API key on mount', async () => {
    const { input } = await mountWithKey('sk-ant-saved-key');
    expect(input.value).toBe('sk-ant-saved-key');
  });

  it('writes the current input value to storage when Validate Key is clicked', async () => {
    const { fixture, input } = await mountWithKey('sk-ant-old-key');

    input.value = 'sk-ant-new-key';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    const saved = await getSettings();
    expect(saved.anthropicApiKey).toBe('sk-ant-new-key');
  });
});
