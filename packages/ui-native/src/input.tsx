import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps {
  size?: InputSize;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  accessibilityLabel?: string;
  testID?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  children?: ReactNode;
  theme: NativeTheme;
}

export function Input(props: InputProps) {
  const {
    size = 'md',
    invalid = false,
    disabled = false,
    loading = false,
    value,
    onChangeText,
    placeholder,
    label,
    helperText,
    errorText,
    accessibilityLabel,
    testID,
    keyboardType = 'default',
    secureTextEntry = false,
    theme,
  } = props;
  const styles = createStyles(theme);
  const isDisabled = disabled || loading;
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={!isDisabled}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.input,
          styles[`size_${size}`],
          invalid ? styles.invalid : null,
          isDisabled ? styles.disabled : null,
        ]}
      />
      {errorText ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
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
    label: {
      fontSize: theme.fontSize.sm.size,
      color: theme.tokens.textPrimary,
      fontWeight: '600',
    },
    input: {
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
      paddingHorizontal: theme.space[3],
      color: theme.tokens.textPrimary,
    },
    size_sm: { height: 36, fontSize: theme.fontSize.sm.size },
    size_md: { height: 44, fontSize: theme.fontSize.md.size },
    size_lg: { height: 52, fontSize: theme.fontSize.lg.size },
    invalid: { borderColor: theme.tokens.actionDangerBackground },
    disabled: { opacity: 0.6 },
    helper: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    error: { fontSize: theme.fontSize.xs.size, color: theme.tokens.actionDangerBackground },
  });
}
