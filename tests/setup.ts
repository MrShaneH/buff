import { beforeEach } from 'vitest';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } },
);

const store = new Map<string, unknown>();

const chromeMock = {
  storage: {
    local: {
      set(items: Record<string, unknown>, callback?: () => void): void {
        for (const [key, value] of Object.entries(items)) {
          store.set(key, value);
        }
        callback?.();
      },
      get(
        keys: string | string[] | Record<string, unknown> | null,
        callback: (result: Record<string, unknown>) => void,
      ): void {
        const result: Record<string, unknown> = {};
        const keyList =
          keys === null
            ? [...store.keys()]
            : typeof keys === 'string'
              ? [keys]
              : Array.isArray(keys)
                ? keys
                : Object.keys(keys);
        for (const key of keyList) {
          if (store.has(key)) {
            result[key] = store.get(key);
          }
        }
        callback(result);
      },
      remove(keys: string | string[], callback?: () => void): void {
        const keyList = typeof keys === 'string' ? [keys] : keys;
        for (const key of keyList) {
          store.delete(key);
        }
        callback?.();
      },
      clear(callback?: () => void): void {
        store.clear();
        callback?.();
      },
    },
  },
};

(globalThis as unknown as Record<string, unknown>)['chrome'] = chromeMock;

beforeEach(() => {
  store.clear();
});
