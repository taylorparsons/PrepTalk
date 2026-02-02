import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAppConfig } from '../../app/static/js/config.js';

describe('config user id', () => {
  const originalCrypto = globalThis.crypto;
  const originalStorage = window.localStorage;

  function installStorage() {
    const store = new Map();
    const storage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: (key) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      }
    };
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  }

  beforeEach(() => {
    window.__APP_CONFIG__ = {};
    installStorage();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.__APP_CONFIG__ = {};
    window.localStorage.clear();
    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
    if (originalStorage) {
      Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true });
    }
  });

  it('generates and stores an anonymous user id when config is local', () => {
    window.__APP_CONFIG__ = { userId: 'local' };
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'test-uuid' },
      configurable: true
    });

    const config = getAppConfig();

    expect(config.userId).toBe('test-uuid');
    expect(window.localStorage.getItem('preptalk_user_id')).toBe('test-uuid');
  });

  it('preserves a provided non-local user id', () => {
    window.__APP_CONFIG__ = { userId: 'server-user' };
    const config = getAppConfig();
    expect(config.userId).toBe('server-user');
    expect(window.localStorage.getItem('preptalk_user_id')).toBe('server-user');
  });
});
