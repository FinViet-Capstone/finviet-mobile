/**
 * mmkv.ts — fast key-value storage for auth tokens (and future prefs).
 *
 * Primary backend is react-native-mmkv (needs a dev build). When the native
 * module is unavailable — Jest, or Expo Go without a dev build — we transparently
 * fall back to an in-memory Map so the app still runs (tokens just won't survive
 * a reload). Token persistence across reloads requires the dev build.
 *
 * The JWT access token here is read by the Axios request interceptor
 * (src/lib/api.ts); the refresh token drives the 401 rotation flow.
 */

interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

function createStore(): KeyValueStore {
  try {
    // Lazy require so bundlers/Jest that can't resolve the native module
    // don't crash at import time. v4 (nitro) uses a createMMKV factory, not a class.
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const mmkv = createMMKV({ id: 'finviet-auth' });
    return {
      getString: (k) => mmkv.getString(k),
      set: (k, v) => mmkv.set(k, v),
      delete: (k) => { mmkv.remove(k); },
    };
  } catch {
    // Fallback: process-lifetime in-memory store (no reload persistence).
    const mem = new Map<string, string>();
    return {
      getString: (k) => mem.get(k),
      set: (k, v) => { mem.set(k, v); },
      delete: (k) => { mem.delete(k); },
    };
  }
}

export const storage: KeyValueStore = createStore();

// ─── Auth token helpers ───────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const ACCESS_EXPIRY_KEY = 'auth.accessTokenExpiry';

export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601 timestamp of access-token expiry. */
  accessTokenExpiry?: string;
}

export function getAccessToken(): string | undefined {
  return storage.getString(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | undefined {
  return storage.getString(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(tokens: StoredAuthTokens): void {
  storage.set(ACCESS_TOKEN_KEY, tokens.accessToken);
  storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (tokens.accessTokenExpiry) {
    storage.set(ACCESS_EXPIRY_KEY, tokens.accessTokenExpiry);
  }
}

export function clearAuthTokens(): void {
  storage.delete(ACCESS_TOKEN_KEY);
  storage.delete(REFRESH_TOKEN_KEY);
  storage.delete(ACCESS_EXPIRY_KEY);
}
