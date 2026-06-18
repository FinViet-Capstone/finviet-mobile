/**
 * mmkv.ts — secure key-value storage for auth tokens.
 *
 * Backend: expo-secure-store (iOS Keychain / Android EncryptedSharedPreferences).
 * Reads are served from an in-memory cache (sync) so the Axios request
 * interceptor and other consumers keep their synchronous call-sites.
 * Writes update the cache immediately, then fire-and-forget the async persist.
 *
 * Call `hydrateTokenCache()` once at app boot (in useBootstrapSession) before
 * any `getAccessToken()` call to populate the cache from the secure store.
 *
 * The JWT access token here is read by the Axios request interceptor
 * (src/lib/api.ts); the refresh token drives the 401 rotation flow.
 */

import * as SecureStore from 'expo-secure-store';

// ─── In-memory cache (sync reads) ────────────────────────────────────────────

const cache = new Map<string, string>();

// ─── Auth token keys ──────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const ACCESS_EXPIRY_KEY = 'auth.accessTokenExpiry';

const ALL_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ACCESS_EXPIRY_KEY] as const;

// ─── Boot hydration ───────────────────────────────────────────────────────────

/**
 * Populate the in-memory cache from SecureStore on app launch.
 * Must be awaited before `getAccessToken()` is called.
 */
export async function hydrateTokenCache(): Promise<void> {
  await Promise.all(
    ALL_KEYS.map(async (key) => {
      const value = await SecureStore.getItemAsync(key);
      if (value != null) {
        cache.set(key, value);
      }
    }),
  );
}

// ─── Auth token helpers ───────────────────────────────────────────────────────

export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601 timestamp of access-token expiry. */
  accessTokenExpiry?: string;
}

export function getAccessToken(): string | undefined {
  return cache.get(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | undefined {
  return cache.get(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(tokens: StoredAuthTokens): void {
  // Sync: update cache immediately so subsequent reads see the new values.
  cache.set(ACCESS_TOKEN_KEY, tokens.accessToken);
  cache.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (tokens.accessTokenExpiry) {
    cache.set(ACCESS_EXPIRY_KEY, tokens.accessTokenExpiry);
  }

  // Async: persist to secure store in the background.
  SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (tokens.accessTokenExpiry) {
    SecureStore.setItemAsync(ACCESS_EXPIRY_KEY, tokens.accessTokenExpiry);
  }
}

export function clearAuthTokens(): void {
  // Sync: clear cache immediately.
  cache.delete(ACCESS_TOKEN_KEY);
  cache.delete(REFRESH_TOKEN_KEY);
  cache.delete(ACCESS_EXPIRY_KEY);

  // Async: remove from secure store in the background.
  SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  SecureStore.deleteItemAsync(ACCESS_EXPIRY_KEY);
}
