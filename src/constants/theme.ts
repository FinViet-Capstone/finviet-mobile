// Design tokens — shared across all screens via StyleSheet.
// Import COLORS, SPACING, FONT_SIZE, etc. instead of hardcoding values.

export const COLORS = {
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

  // New Design System - Purple/Dark Theme
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

  // Semantic
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

export const SPACING = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
} as const;

export const BORDER_RADIUS = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 24,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs:   12,
  sm:   14,
  base: 16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const FONT_WEIGHT = {
  normal:   '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  extrabold:'800' as const,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;
