import { StyleSheet, TextInput, View, Text } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface SearchInputProps {
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  label?: string;
  accessibilityLabel?: string;
  testID?: string;
  theme: NativeTheme;
}

export function SearchInput(props: SearchInputProps) {
  const {
    size = 'md',
    invalid = false,
    disabled = false,
    value,
    onChangeText,
    placeholder,
    label,
    accessibilityLabel,
    testID,
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
        accessibilityLabel={accessibilityLabel ?? label ?? 'Ara'}
        testID={testID}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityState={{ disabled }}
        style={[
          styles.input,
          styles[`size_${size}`],
          invalid ? styles.invalid : null,
          disabled ? styles.disabled : null,
        ]}
      />
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
      color: theme.tokens.textPrimary,
    },
    size_sm: { height: 36, fontSize: theme.fontSize.sm.size },
    size_md: { height: 44, fontSize: theme.fontSize.md.size },
    size_lg: { height: 52, fontSize: theme.fontSize.lg.size },
    invalid: { borderColor: theme.tokens.actionDangerBackground },
    disabled: { opacity: 0.6 },
  });
}
