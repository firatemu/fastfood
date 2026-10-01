/**
 * Primitive design tokens. Document 38 §2–§5.
 *
 * These are raw values. Components consume semantic tokens from ./semantic.ts,
 * never primitives directly.
 */

export const fontFamily = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

export const fontSize = {
  xs: { size: 12, lineHeight: 16 },
  sm: { size: 14, lineHeight: 20 },
  md: { size: 16, lineHeight: 24 },
  lg: { size: 18, lineHeight: 28 },
  xl: { size: 20, lineHeight: 28 },
  '2xl': { size: 24, lineHeight: 32 },
  '3xl': { size: 30, lineHeight: 38 },
  '4xl': { size: 36, lineHeight: 44 },
  '5xl': { size: 48, lineHeight: 56 },
} as const;

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const color = {
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  brand: {
    red: {
      50: '#FFF1F2',
      100: '#FFE4E6',
      500: '#E11D2E',
      600: '#C81424',
      700: '#A9101D',
    },
    orange: {
      500: '#F97316',
    },
    amber: {
      400: '#FBBF24',
    },
    cream: {
      50: '#FFF9F2',
    },
  },
  ops: {
    blue: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
    },
  },
  semantic: {
    success: {
      50: '#F0FDF4',
      600: '#16A34A',
      700: '#15803D',
    },
    warning: {
      50: '#FFFBEB',
      600: '#D97706',
    },
    danger: {
      50: '#FEF2F2',
      600: '#DC2626',
      700: '#B91C1C',
    },
    info: {
      50: '#EFF6FF',
      600: '#2563EB',
    },
  },
} as const;

export const shadow = {
  xs: '0 1px 1px rgba(0,0,0,.04)',
  sm: '0 1px 2px rgba(0,0,0,.06)',
  md: '0 6px 20px rgba(0,0,0,.08)',
  lg: '0 16px 40px rgba(0,0,0,.12)',
} as const;

export const motion = {
  fast: 120,
  normal: 180,
  slow: 260,
} as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

export const breakpoint = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;
