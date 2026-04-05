const STORAGE_KEY = 'buff_settings';

export type Provider = 'anthropic' | 'openai';

export interface Settings {
  apiKey: string;
  provider: Provider;
  model: string;
}

const defaultSettings: Settings = {
  apiKey: '',
  provider: 'anthropic',
  model: '',
};

class NotImplementedError extends Error {
  constructor(fn: string) {
    super(`${fn} is not implemented in Phase 1`);
    this.name = 'NotImplementedError';
  }
}

export function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY] as Record<string, unknown> | undefined;
      if (stored && 'anthropicApiKey' in stored) {
        // Migrate Phase 1 shape → Phase 2
        const migrated: Settings = {
          apiKey: (stored['anthropicApiKey'] as string) ?? '',
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
        };
        chrome.storage.local.set({ [STORAGE_KEY]: migrated }, () => resolve(migrated));
      } else {
        resolve({ ...defaultSettings, ...(stored as Partial<Settings> ?? {}) });
      }
    });
  });
}

export function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: settings }, resolve);
  });
}

export interface SavedSite {
  url: string;
  enabled: boolean;
}

// Stubbed — implemented in Phase 6
export function getSavedSites(): Promise<SavedSite[]> {
  throw new NotImplementedError('getSavedSites');
}

// Stubbed — implemented in Phase 6
export function saveSite(_site: SavedSite): Promise<void> {
  throw new NotImplementedError('saveSite');
}

// Stubbed — implemented in Phase 6
export function removeSite(_url: string): Promise<void> {
  throw new NotImplementedError('removeSite');
}
