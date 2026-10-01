/**
 * React Native StyleSheet token helpers.
 * Document 32 §2 + document 38: no second independent native token system.
 */
import {
  color,
  easing,
  fontFamily,
  fontSize,
  motion,
  radius,
  shadow,
  space,
} from '@fastfood/design-tokens';
import { getSemanticTokens, type ThemeName } from '@fastfood/design-tokens';

export interface NativeTheme {
  themeName: ThemeName;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  space: typeof space;
  radius: typeof radius;
  motion: typeof motion;
  easing: typeof easing;
  shadow: typeof shadow;
  color: typeof color;
  tokens: ReturnType<typeof getSemanticTokens>;
}

export function createNativeTheme(themeName: ThemeName): NativeTheme {
  return {
    themeName,
    fontFamily,
    fontSize,
    space,
    radius,
    motion,
    easing,
    shadow,
    color,
    tokens: getSemanticTokens(themeName),
  };
}

// Helper for callers that don't want to import createNativeTheme themselves.
export function defaultTheme(themeName: ThemeName = 'storefront') {
  return createNativeTheme(themeName);
}
