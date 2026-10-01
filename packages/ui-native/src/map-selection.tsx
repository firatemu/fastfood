import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface MapSelectionProps {
  ariaLabel: string;
  theme: NativeTheme;
}

export function MapSelection(props: MapSelectionProps) {
  const { ariaLabel, theme } = props;
  const styles = createStyles(theme);
  return (
    <View accessibilityRole="none" accessibilityLabel={ariaLabel} style={styles.base}>
      <Text style={styles.placeholder}>Harita seçimi</Text>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      minHeight: 240,
      backgroundColor: theme.tokens.surfaceSubtle,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholder: { color: theme.tokens.textSecondary, fontSize: theme.fontSize.sm.size },
  });
}
