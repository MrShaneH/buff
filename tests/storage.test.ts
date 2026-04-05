import { describe, it, expect } from 'vitest';
import { getSettings } from '../lib/storage';

describe('getSettings migration', () => {
  it('migrates Phase 1 shape to Phase 2 shape', async () => {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set(
        { buff_settings: { anthropicApiKey: 'sk-ant-test', openAiApiKey: '', model: '' } },
        resolve,
      ),
    );

    const settings = await getSettings();

    expect(settings).toEqual({
      apiKey: 'sk-ant-test',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
    });
  });

  it('writes migrated shape back to storage', async () => {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set(
        { buff_settings: { anthropicApiKey: 'sk-ant-test', openAiApiKey: '', model: '' } },
        resolve,
      ),
    );

    await getSettings();

    const result = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('buff_settings', resolve),
    );

    expect(result['buff_settings']).toEqual({
      apiKey: 'sk-ant-test',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
    });
  });

  it('returns Phase 2 shape directly on second call without re-migrating', async () => {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set(
        { buff_settings: { anthropicApiKey: 'sk-ant-test', openAiApiKey: '', model: '' } },
        resolve,
      ),
    );

    // First call migrates
    await getSettings();

    // Second call should use the already-migrated shape
    const settings = await getSettings();

    expect(settings).toEqual({
      apiKey: 'sk-ant-test',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
    });
  });
});
