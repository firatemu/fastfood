import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  testID?: string;
  theme: NativeTheme;
}

export function Badge(props: BadgeProps) {
  const { variant = 'neutral', children, testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <View
      testID={testID}
      style={[styles.base, styles[`variant_${variant}`]]}
      accessibilityRole="text"
    >
      <Text style={[styles.label, styles[`variant_${variant}_label`]]}>{children}</Text>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      alignSelf: 'flex-start',
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[1],
      borderRadius: 9999,
    },
    label: { fontSize: theme.fontSize.xs.size, fontWeight: '600' },
    variant_neutral: { backgroundColor: theme.tokens.surfaceSubtle },
    variant_neutral_label: { color: theme.tokens.textPrimary },
    variant_info: { backgroundColor: theme.color.semantic.info[50] },
    variant_info_label: { color: theme.color.semantic.info[600] },
    variant_success: { backgroundColor: theme.color.semantic.success[50] },
    variant_success_label: { color: theme.color.semantic.success[700] },
    variant_warning: { backgroundColor: theme.color.semantic.warning[50] },
    variant_warning_label: { color: theme.color.semantic.warning[600] },
    variant_danger: { backgroundColor: theme.color.semantic.danger[50] },
    variant_danger_label: { color: theme.color.semantic.danger[700] },
    variant_primary: { backgroundColor: theme.color.brand.red[50] },
    variant_primary_label: { color: theme.color.brand.red[700] },
  });
}
