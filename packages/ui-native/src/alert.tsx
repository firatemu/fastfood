import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  testID?: string;
  theme: NativeTheme;
}

export function Alert(props: AlertProps) {
  const { variant = 'info', title, children, testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[styles.base, styles[`variant_${variant}`]]}
    >
      {title ? (
        <Text style={[styles.title, styles[`variant_${variant}_title`]]}>{title}</Text>
      ) : null}
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      padding: theme.space[3],
      borderRadius: theme.radius.md,
      borderWidth: 1,
      gap: theme.space[1],
    },
    title: { fontWeight: '700', fontSize: theme.fontSize.md.size },
    body: { fontSize: theme.fontSize.sm.size },
    variant_info: {
      backgroundColor: theme.color.semantic.info[50],
      borderColor: theme.color.semantic.info[600],
    },
    variant_info_title: { color: theme.color.semantic.info[600] },
    variant_success: {
      backgroundColor: theme.color.semantic.success[50],
      borderColor: theme.color.semantic.success[700],
    },
    variant_success_title: { color: theme.color.semantic.success[700] },
    variant_warning: {
      backgroundColor: theme.color.semantic.warning[50],
      borderColor: theme.color.semantic.warning[600],
    },
    variant_warning_title: { color: theme.color.semantic.warning[600] },
    variant_danger: {
      backgroundColor: theme.color.semantic.danger[50],
      borderColor: theme.color.semantic.danger[700],
    },
    variant_danger_title: { color: theme.color.semantic.danger[700] },
  });
}
