/**
 * React Native StyleSheet token helpers.
 * Document 32 §2 + document 38: no second independent native token system.
 */
import { color, fontFamily, fontSize, motion, radius, shadow, space } from './primitives.js';
import { getSemanticTokens, type ThemeName } from './semantic.js';

export interface NativeTheme {
  themeName: ThemeName;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  space: typeof space;
  radius: typeof radius;
  motion: typeof motion;
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
    shadow,
    color,
    tokens: getSemanticTokens(themeName),
  };
}
