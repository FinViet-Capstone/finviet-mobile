// Design tokens — single import surface for the whole app.
// `import { COLORS, SPACING, ... } from '@/theme'` instead of reaching into
// the individual files below directly.
//
// Component styling reads these tokens (colors/spacing/radius/font/shadow) —
// never hardcoded hex or raw numbers. Prefer `useThemeColors()`
// (src/providers/ThemeProvider.tsx) over the theme-invariant `COLORS` export
// for anything that should repaint between light and dark.

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
