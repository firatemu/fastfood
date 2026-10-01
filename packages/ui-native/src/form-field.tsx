import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  children: ReactNode;
  hideLabel?: boolean;
  theme: NativeTheme;
}

export function FormField(props: FormFieldProps) {
  const { label, required, helperText, errorText, children, hideLabel = false, theme } = props;
  const styles = createStyles(theme);
  return (
    <View style={styles.wrapper}>
      <Text
        style={[styles.label, hideLabel ? styles.srOnly : null]}
        accessibilityElementsHidden={hideLabel ? true : undefined}
      >
        {label}
        {required ? ' *' : ''}
      </Text>
      <View>{children}</View>
      {errorText ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {errorText}
        </Text>
      ) : helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    wrapper: { gap: theme.space[1] },
    label: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textPrimary, fontWeight: '600' },
    srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
    helper: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    error: { fontSize: theme.fontSize.xs.size, color: theme.tokens.actionDangerBackground },
  });
}
