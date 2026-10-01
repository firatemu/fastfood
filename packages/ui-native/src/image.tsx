import { StyleSheet, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface ImageProps {
  ratio?: '1:1' | '4:3' | '16:9';
  testID?: string;
  theme: NativeTheme;
}

export function Image(props: ImageProps) {
  const { ratio = '4:3', testID, theme } = props;
  const styles = createStyles(theme);
  const ratioStyle =
    ratio === '1:1' ? styles.ratio_1_1 : ratio === '16:9' ? styles.ratio_16_9 : styles.ratio_4_3;
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.base, ratioStyle]}
    />
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: { width: '100%', backgroundColor: theme.tokens.surfaceSubtle },
    ratio_1_1: { aspectRatio: 1 },
    ratio_4_3: { aspectRatio: 4 / 3 },
    ratio_16_9: { aspectRatio: 16 / 9 },
  });
}
