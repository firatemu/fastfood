/**
 * BURGER HOME Mobile account tokens.
 *
 * Independent of @fastfood/design-tokens (ADR-008): web and mobile share the
 * design *decisions*, never the code. These values mirror the `.ff-acct` scope
 * in `apps/storefront-web/src/app/globals.css` so the account area reads as one
 * product surface on both clients.
 *
 * The decisions encoded here:
 *   - A quieter surface ramp. Depth comes from surface steps and 1px hairlines,
 *     never from large rounded filled blocks.
 *   - Mustard (#feb300) means exactly one thing: the primary action. Status has
 *     its own hues, so "needs attention" can never read as "press here".
 *   - Anton is withdrawn from headings. It survives only as `display`, for one
 *     hero figure per screen.
 *   - A neutral grey text ramp, so the accent is the only warm thing on screen.
 *   - Tight radii (3/6/8/12) and a compact type scale.
 */

export const colors = {
  canvas: '#0d0e11',
  surfaceLowest: '#07080a',
  surfaceLow: '#131418',
  surface: '#191a1f',
  surfaceHigh: '#212229',
  surfaceHighest: '#2a2b33',
  surfaceVariant: '#212229',

  onSurface: '#e9e9ec',
  onBackground: '#e9e9ec',
  onSurfaceVariant: '#8b8c95',

  outline: '#3b3c45',
  outlineVariant: '#282931',

  /** The single accent. One meaning: the primary action. */
  mustard: '#feb300',
  mustardGlow: '#ffba38',
  mustardPressed: '#c08600',
  onMustard: '#241700',

  /** Brand fire: the product mark and destructive brand cues only. */
  flame: '#ff5722',
  ember: '#E64A19',
  flameDeep: '#fc5a29',
  onFlame: '#3a0d00',

  /** Status vocabulary. Its own hues, never the accent. */
  ok: '#5ddc9a',
  okContainer: 'rgba(93, 220, 154, 0.12)',
  okBorder: 'rgba(93, 220, 154, 0.34)',
  warn: '#f0c674',
  warnContainer: 'rgba(240, 198, 116, 0.12)',
  warnBorder: 'rgba(240, 198, 116, 0.34)',
  danger: '#ff8f85',
  dangerContainer: 'rgba(255, 143, 133, 0.12)',
  dangerBorder: 'rgba(255, 143, 133, 0.34)',
  info: '#8ab4f8',
  infoContainer: 'rgba(138, 180, 248, 0.12)',
  infoBorder: 'rgba(138, 180, 248, 0.34)',
  onDangerContainer: '#ffdad6',

  /**
   * Kept as aliases so screens outside the account area keep compiling while
   * still picking up the new neutral ramp. New code should use onSurfaceVariant
   * for text and the ok/warn/danger/info roles for state.
   */
  ash: '#8b8c95',
  error: '#ff8f85',

  /**
   * Same reason: screens outside the account area (auth, order detail, the
   * modifier group) still read these names. They keep compiling and keep the
   * account palette; new code should use the ok/warn/danger/info roles.
   */
  mustardBloom: 'rgba(255,179,0,0.18)',
  errorContainer: 'rgba(255, 143, 133, 0.12)',
  onErrorContainer: '#ffdad6',
  white: '#ffffff',
  hairline: 'rgba(255,255,255,0.08)',
  scrim: 'rgba(0,0,0,0.72)',
  shadowOverlay: '#000000',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  gutter: 16,
  margin: 20,
  /** Row rhythm for the ledger layout. */
  row: 12,
} as const;

export const radius = {
  /** 3px — pills, dots, the smallest marks. */
  xs: 3,
  /** 6px — controls. */
  sm: 6,
  /** 8px — the default box. */
  md: 8,
  /** 12px — large surfaces only. */
  lg: 12,
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
  /**
   * Anton lives here and only here: the single hero figure a screen may show.
   * Headings use Jakarta at the sizes below.
   */
  display: { fontFamily: fonts.anton, fontSize: 44, lineHeight: 40, letterSpacing: -0.4 },

  headlineXl: { fontFamily: fonts.jakartaBold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  headlineLg: { fontFamily: fonts.jakartaBold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  headlineMd: { fontFamily: fonts.jakartaBold, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  headlineSm: { fontFamily: fonts.jakartaSemibold, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },

  bodyLg: { fontFamily: fonts.jakarta, fontSize: 15, lineHeight: 24 },
  bodyMd: { fontFamily: fonts.jakarta, fontSize: 14, lineHeight: 21 },
  bodySm: { fontFamily: fonts.jakarta, fontSize: 13, lineHeight: 19 },
  /** The workhorse label: table keys, field labels, quiet metadata. */
  labelLg: { fontFamily: fonts.jakartaSemibold, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  labelMd: { fontFamily: fonts.jakartaSemibold, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  /** Section eyebrow and status tags. */
  labelSm: { fontFamily: fonts.jakartaBold, fontSize: 11, lineHeight: 15, letterSpacing: 0.8 },
  /** Buttons. */
  button: { fontFamily: fonts.jakartaSemibold, fontSize: 13, lineHeight: 16, letterSpacing: 0 },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouch = 44;