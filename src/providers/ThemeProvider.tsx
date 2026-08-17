/**
 * ThemeProvider — resolves the active color palette (DARK_COLORS or
 * LIGHT_COLORS) from the customer's theme preference ('light'/'dark'/'system')
 * plus the OS setting for the 'system' case, and exposes it via useThemeColors().
 *
 * `useCustomer()` returns no data before login and after logout, which used to
 * mean pre-login/onboarding screens could never honor a previously-chosen
 * theme and always fell back to the OS scheme. `src/lib/themeCache.ts` bridges
 * that gap: this provider writes the customer's resolved `theme` into the
 * cache whenever one is available, and reads the cache as the fallback when
 * it isn't — `hydrateThemeCache()` (called from `useBootstrapSession`) has
 * already populated it by the time anything renders.
 *
 * Every screen/component reads colors through `useThemeColors()`. The one
 * exception is `app/_layout.tsx`'s root `ErrorBoundary`, which imports the
 * theme-invariant `COLORS` export directly (always dark) since it can render
 * before this provider mounts. See context/fe-plan-2026-07-revamp.md item 2.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS, type ColorPalette } from '@/theme';
import { useCustomer } from '@/hooks/useCustomer';
import { getCachedThemePref, setCachedThemePref, type ThemePref } from '@/lib/themeCache';

export type ThemeColors = ColorPalette;
export type ThemeScheme = 'light' | 'dark';

const ThemeColorsContext = createContext<ThemeColors>(DARK_COLORS);
const ThemeSchemeContext = createContext<ThemeScheme>('dark');

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { data: user } = useCustomer();
  const themePref: ThemePref = user?.theme ?? getCachedThemePref() ?? 'system';

  useEffect(() => {
    if (user?.theme) setCachedThemePref(user.theme);
  }, [user?.theme]);

  const scheme = useMemo<ThemeScheme>(() => {
    return themePref === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themePref;
  }, [themePref, systemScheme]);

  const colors = useMemo<ThemeColors>(
    () => (scheme === 'light' ? LIGHT_COLORS : DARK_COLORS),
    [scheme],
  );

  return (
    <ThemeSchemeContext.Provider value={scheme}>
      <ThemeColorsContext.Provider value={colors}>{children}</ThemeColorsContext.Provider>
    </ThemeSchemeContext.Provider>
  );
}

export function useThemeColors(): ThemeColors {
  return useContext(ThemeColorsContext);
}

/** The resolved 'light' | 'dark' scheme — for logic that can't key off a color value alone. */
export function useThemeScheme(): ThemeScheme {
  return useContext(ThemeSchemeContext);
}
