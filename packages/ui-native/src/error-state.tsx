import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface ErrorStateProps {
  title: string;
  description?: string;
  theme: NativeTheme;
}

export function ErrorState(props: ErrorStateProps) {
  const { title, description, theme } = props;
  const styles = createStyles(theme);
  return (
    <View accessibilityRole="alert" style={styles.base}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      padding: theme.space[6],
      alignItems: 'center',
      gap: theme.space[2],
      backgroundColor: theme.color.semantic.danger[50],
      borderRadius: theme.radius.md,
    },
    title: { fontSize: theme.fontSize.lg.size, fontWeight: '700', color: theme.tokens.textPrimary },
    desc: {
      fontSize: theme.fontSize.sm.size,
      color: theme.tokens.textSecondary,
      textAlign: 'center',
    },
  });
}
