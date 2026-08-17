// Color tokens. Import via `@/theme`, not this file directly.
//
// COLORS is theme-invariant (always DARK_COLORS) for the one legitimate case
// that needs it before ThemeProvider can mount (app/_layout.tsx's root
// ErrorBoundary). Everywhere else, use `useThemeColors()`
// (src/providers/ThemeProvider.tsx), which resolves to DARK_COLORS or
// LIGHT_COLORS based on the customer's theme preference + system setting.
//
// Keys shared by both palettes below (brand/gray/success/warning/danger/info/
// score/budget/calendar/chart/white/black/transparent) are flat semantic/utility
// colors, not M3 surface-elevation roles — they don't change between themes.

const SHARED_COLORS = {
  // Brand (Original green palette - kept for backward compatibility)
  brand: {
    50:  '#E8F5EF',
    100: '#C6E6D4',
    200: '#9DD4B5',
    300: '#6DC196',
    400: '#3DAE78',
    500: '#1A6B3C', // primary
    600: '#155A32',
    700: '#104827',
    800: '#0A371C',
    900: '#052511',
  },

  // Grays
  gray: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Semantic — flat status reds/greens for data (budget bars, score bands,
  // calendar cells). Use `danger` here, not the M3 `error`/`errorContainer`
  // role pair below (DARK_COLORS/LIGHT_COLORS) — that pair is for form
  // validation and destructive-action UI chrome (error banners, delete
  // buttons), themed per light/dark, and intentionally a different red.
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
  info:    '#3B82F6',

  // AI Spending Score
  score: {
    green: '#22C55E', // ≥70
    amber: '#F59E0B', // 40–69
    red:   '#EF4444', // <40
  },

  // Budget progress bars
  budget: {
    safe:    '#22C55E', // <60%
    warning: '#F59E0B', // 60–80%
    danger:  '#EF4444', // >80%
  },

  // Calendar day cells
  calendar: {
    withinBudget:   '#22C55E',
    overBudget:     '#EF4444',
    uncategorized:  '#F97316', // orange badge
    neutral:        '#CBD5E1',
  },

  // Charts (Victory Native palette)
  chart: [
    '#F97316', '#3B82F6', '#EC4899', '#EF4444',
    '#8B5CF6', '#14B8A6', '#F59E0B', '#D946EF',
    '#6366F1', '#0EA5E9', '#22C55E', '#1A6B3C', '#94A3B8',
  ],

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * The M3 surface/role keys that actually differ between light and dark —
 * widened to `string` (not the `as const` literal hexes) so DARK_COLORS and
 * LIGHT_COLORS structurally satisfy the same type despite different values.
 */
interface ColorRoles {
  primary: string; primaryContainer: string; onPrimary: string; onPrimaryContainer: string; inversePrimary: string;
  secondary: string; secondaryContainer: string; onSecondary: string; onSecondaryContainer: string;
  tertiary: string; tertiaryContainer: string; onTertiary: string; onTertiaryContainer: string;
  background: string; surface: string; surfaceDim: string; surfaceBright: string;
  surfaceContainerLowest: string; surfaceContainerLow: string; surfaceContainer: string;
  surfaceContainerHigh: string; surfaceContainerHighest: string;
  onBackground: string; onSurface: string; onSurfaceVariant: string; surfaceVariant: string;
  outline: string; outlineVariant: string;
  error: string; errorContainer: string; onError: string; onErrorContainer: string;
  inverseSurface: string; inverseOnSurface: string;
}

export type ColorPalette = typeof SHARED_COLORS & ColorRoles;

// New Design System - Purple/Dark Theme (the app's only palette until the
// theme switcher — kept byte-identical for every existing consumer of COLORS).
export const DARK_COLORS: ColorPalette = {
  ...SHARED_COLORS,

  primary: '#d0bcff',
  primaryContainer: '#a078ff',
  onPrimary: '#3c0091',
  onPrimaryContainer: '#340080',
  inversePrimary: '#6d3bd7',

  secondary: '#ffb690',
  secondaryContainer: '#ec6a06',
  onSecondary: '#552100',
  onSecondaryContainer: '#4a1c00',

  tertiary: '#4edea3',
  tertiaryContainer: '#00a572',
  onTertiary: '#003824',
  onTertiaryContainer: '#00311f',

  background: '#15121b',
  surface: '#15121b',
  surfaceDim: '#15121b',
  surfaceBright: '#3b3742',
  surfaceContainerLowest: '#0f0d15',
  surfaceContainerLow: '#1d1a23',
  surfaceContainer: '#211e27',
  surfaceContainerHigh: '#2c2832',
  surfaceContainerHighest: '#37333d',

  onBackground: '#e7e0ed',
  onSurface: '#e7e0ed',
  onSurfaceVariant: '#cbc3d7',
  surfaceVariant: '#37333d',

  outline: '#958ea0',
  outlineVariant: '#494454',

  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  onErrorContainer: '#ffdad6',

  inverseSurface: '#e7e0ed',
  inverseOnSurface: '#322f39',
} as const;

// Light counterpart, hue-matched to DARK_COLORS' purple/orange/green brand
// identity using Material Design 3 tonal-role conventions, contrast-checked
// pair-by-pair against DARK_COLORS (see the published token spec) so every
// text/container role clears WCAG AA in both themes.
export const LIGHT_COLORS: ColorPalette = {
  ...SHARED_COLORS,

  primary: '#6750A4',
  primaryContainer: '#EADDFF',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#21005D',
  inversePrimary: '#D0BCFF',

  secondary: '#8A5000',
  secondaryContainer: '#FFDCC2',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#2C1600',

  tertiary: '#006C48',
  tertiaryContainer: '#89F8C7',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#002114',

  background: '#FFFBFE',
  surface: '#FFFBFE',
  surfaceDim: '#DED8E1',
  surfaceBright: '#FFFBFE',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7',
  surfaceContainerHigh: '#ECE6F0',
  surfaceContainerHighest: '#E6E0E9',

  onBackground: '#1D1B20',
  onSurface: '#1D1B20',
  onSurfaceVariant: '#49454F',
  surfaceVariant: '#E7E0EC',

  outline: '#79747E',
  outlineVariant: '#CAC4D0',

  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onError: '#FFFFFF',
  onErrorContainer: '#410002',

  inverseSurface: '#322F35',
  inverseOnSurface: '#F5EFF7',
} as const;

export const COLORS = DARK_COLORS;

/**
 * Overlay a token color at `alpha` (0-1) as `rgba(...)`.
 *
 * Replaces the `` `${COLORS.x}20` `` string-concat pattern seen across the
 * codebase, which only produces a valid color for 6-digit hex tokens and
 * silently breaks for anything else (e.g. `COLORS.transparent`, or any
 * future non-hex token). Accepts `#RGB`/`#RRGGBB` hex strings only, since
 * that's the only shape every token in this file actually has.
 */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
