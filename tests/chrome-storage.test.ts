import { describe, it, expect } from 'vitest';

describe('chrome.storage.local mock', () => {
  it('round-trip: set then get returns the stored value', async () => {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set({ key: 'value' }, resolve),
    );
    const result = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('key', resolve),
    );
    expect(result).toEqual({ key: 'value' });
  });

  it('returns only requested keys', async () => {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set({ a: 1, b: 2, c: 3 }, resolve),
    );
    const result = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get(['a', 'c'], resolve),
    );
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('resets between tests — store is empty', async () => {
    const result = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get(null, resolve),
    );
    expect(result).toEqual({});
  });
});
