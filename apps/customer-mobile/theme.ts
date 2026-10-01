/** BURGER HOME Mobile Stitch tokens. Independent of @fastfood/design-tokens (ADR-008). */

export const colors = {
  canvas: '#121316',
  surfaceLowest: '#0d0e11',
  surfaceLow: '#1b1b1f',
  surface: '#1f1f23',
  surfaceHigh: '#292a2d',
  surfaceHighest: '#343538',
  onSurface: '#e3e2e6',
  onSurfaceVariant: '#e4beb4',
  outline: '#ab8980',
  outlineVariant: '#5b4039',
  mustard: '#feb300',
  mustardGlow: '#ffba38',
  mustardPressed: '#c08600',
  onMustard: '#281900',
  flame: '#ff5722',
  ember: '#E64A19',
  flameDeep: '#fc5a29',
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  ash: '#868c98',
  white: '#ffffff',
  hairline: 'rgba(255,255,255,0.08)',
  mustardBloom: 'rgba(255,179,0,0.18)',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  gutter: 16,
  margin: 20,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;

export const fonts = {
  anton: 'Anton_400Regular',
  jakarta: 'PlusJakartaSans_400Regular',
  jakartaMedium: 'PlusJakartaSans_500Medium',
  jakartaSemibold: 'PlusJakartaSans_600SemiBold',
  jakartaBold: 'PlusJakartaSans_700Bold',
} as const;

export const type = {
  headlineXl: { fontFamily: fonts.anton, fontSize: 40, lineHeight: 44, letterSpacing: 0.8 },
  headlineLg: { fontFamily: fonts.anton, fontSize: 32, lineHeight: 36, letterSpacing: 0.6 },
  headlineMd: { fontFamily: fonts.anton, fontSize: 28, lineHeight: 32, letterSpacing: 0.3 },
  headlineSm: { fontFamily: fonts.jakartaBold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  bodyLg: { fontFamily: fonts.jakarta, fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: fonts.jakarta, fontSize: 15, lineHeight: 24 },
  bodySm: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 20 },
  labelLg: { fontFamily: fonts.jakartaSemibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.6 },
  labelMd: { fontFamily: fonts.jakartaBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.7 },
  labelSm: { fontFamily: fonts.jakartaBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9 },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouch = 44;
