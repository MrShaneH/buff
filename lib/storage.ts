const STORAGE_KEY = 'buff_settings';

export interface Settings {
  anthropicApiKey: string;
  openAiApiKey: string;
  model: string;
}

const defaultSettings: Settings = {
  anthropicApiKey: '',
  openAiApiKey: '',
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
      resolve({ ...defaultSettings, ...(result[STORAGE_KEY] as Partial<Settings> ?? {}) });
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
