import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
  theme: NativeTheme;
}

export function Avatar(props: AvatarProps) {
  const { name, size = 'md', testID, theme } = props;
  const styles = createStyles(theme);
  const initials = name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[styles.base, styles[`size_${size}`]]}
    >
      <Text style={styles.initials}>{initials || '?'}</Text>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      backgroundColor: theme.tokens.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
    },
    size_sm: { width: 32, height: 32 },
    size_md: { width: 40, height: 40 },
    size_lg: { width: 56, height: 56 },
    initials: { color: theme.tokens.textPrimary, fontWeight: '700' },
  });
}
