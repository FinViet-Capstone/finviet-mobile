/**
 * ThemeProvider — resolves the active color palette (DARK_COLORS or
 * LIGHT_COLORS) from the customer's theme preference ('light'/'dark'/'system')
 * plus the OS setting for the 'system' case, and exposes it via useThemeColors().
 *
 * Components not yet migrated keep importing the theme-invariant `COLORS`
 * export directly (always dark) — this provider only affects components that
 * opt in to `useThemeColors()`. See context/fe-plan-2026-07-revamp.md item 2.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS, type ColorPalette } from '@/constants/theme';
import { useCustomer } from '@/hooks/useCustomer';

export type ThemeColors = ColorPalette;

const ThemeColorsContext = createContext<ThemeColors>(DARK_COLORS);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { data: user } = useCustomer();
  const themePref = user?.theme ?? 'system';

  const colors = useMemo<ThemeColors>(() => {
    const effective = themePref === 'system' ? (systemScheme ?? 'dark') : themePref;
    return effective === 'light' ? LIGHT_COLORS : DARK_COLORS;
  }, [themePref, systemScheme]);

  return <ThemeColorsContext.Provider value={colors}>{children}</ThemeColorsContext.Provider>;
}

export function useThemeColors(): ThemeColors {
  return useContext(ThemeColorsContext);
}
