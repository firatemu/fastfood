import { StyleSheet, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  testID?: string;
  theme: NativeTheme;
}

export function Spinner(props: SpinnerProps) {
  const { size = 'md', label = 'Yükleniyor', testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.base, styles[`size_${size}`]]}
    >
      <View style={styles.dot} />
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    size_sm: { width: 16, height: 16 },
    size_md: { width: 24, height: 24 },
    size_lg: { width: 32, height: 32 },
    dot: {
      width: '100%',
      height: '100%',
      borderRadius: 9999,
      borderWidth: 2,
      borderColor: theme.tokens.surfaceSubtle,
      borderTopColor: theme.tokens.actionPrimaryBackground,
    },
  });
}
