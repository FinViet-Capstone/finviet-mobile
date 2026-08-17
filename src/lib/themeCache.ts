/**
 * themeCache.ts — device-local cache of the customer's last-known theme
 * preference, so screens that render before a customer is loaded (or after
 * logout) can still resolve the theme the person actually picked instead of
 * always falling back to the OS scheme.
 *
 * The backend (`PATCH /profile/settings`) remains the source of truth for a
 * logged-in customer's `theme` field — this cache only bridges the gap where
 * no `Customer` object is available yet: cold start before
 * `useBootstrapSession` finishes, and the (auth)/onboarding screens after
 * logout. `ThemeProvider` writes this cache whenever a real customer theme
 * resolves and reads it as its pre-customer fallback.
 *
 * Same sync-cache + async-persist shape as `src/lib/mmkv.ts`: reads are
 * synchronous off an in-memory cache; call `hydrateThemeCache()` once at
 * boot (in `useBootstrapSession`) before relying on `getCachedThemePref()`.
 */

import * as SecureStore from 'expo-secure-store';

export type ThemePref = 'light' | 'dark' | 'system';

const THEME_PREF_KEY = 'ui.themePref';

let cached: ThemePref | undefined;

function isThemePref(value: string | null): value is ThemePref {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Populate the in-memory cache from SecureStore on app launch. */
export async function hydrateThemeCache(): Promise<void> {
  const value = await SecureStore.getItemAsync(THEME_PREF_KEY);
  if (isThemePref(value)) {
    cached = value;
  }
}

/** Synchronous read of the last-known theme preference, if any. */
export function getCachedThemePref(): ThemePref | undefined {
  return cached;
}

/** Update the cache immediately; persist to SecureStore in the background. */
export function setCachedThemePref(pref: ThemePref): void {
  if (cached === pref) return;
  cached = pref;
  SecureStore.setItemAsync(THEME_PREF_KEY, pref);
}
