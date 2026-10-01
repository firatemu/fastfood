import { StyleSheet, TextInput, View, Text } from 'react-native';

import type { NativeTheme } from './theme.js';

export type TextareaSize = 'sm' | 'md' | 'lg';

export interface TextareaProps {
  size?: TextareaSize;
  invalid?: boolean;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  accessibilityLabel?: string;
  testID?: string;
  numberOfLines?: number;
  theme: NativeTheme;
}

export function Textarea(props: TextareaProps) {
  const {
    size = 'md',
    invalid = false,
    disabled = false,
    value,
    onChangeText,
    placeholder,
    label,
    helperText,
    errorText,
    accessibilityLabel,
    testID,
    numberOfLines = 4,
    theme,
  } = props;
  const styles = createStyles(theme);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={!disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
        accessibilityState={{ disabled }}
        multiline
        numberOfLines={numberOfLines}
        textAlignVertical="top"
        style={[
          styles.input,
          styles[`size_${size}`],
          invalid ? styles.invalid : null,
          disabled ? styles.disabled : null,
        ]}
      />
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    wrapper: { gap: theme.space[1] },
    label: { fontSize: theme.fontSize.sm.size, fontWeight: '600', color: theme.tokens.textPrimary },
    input: {
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      color: theme.tokens.textPrimary,
      minHeight: 96,
    },
    size_sm: { fontSize: theme.fontSize.sm.size },
    size_md: { fontSize: theme.fontSize.md.size },
    size_lg: { fontSize: theme.fontSize.lg.size },
    invalid: { borderColor: theme.tokens.actionDangerBackground },
    disabled: { opacity: 0.6 },
    helper: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    error: { fontSize: theme.fontSize.xs.size, color: theme.tokens.actionDangerBackground },
  });
}
