import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface PasswordInputProps {
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  label?: string;
  accessibilityLabel?: string;
  testID?: string;
  theme: NativeTheme;
}

export function PasswordInput(props: PasswordInputProps) {
  const {
    size = 'md',
    invalid = false,
    disabled = false,
    value,
    onChangeText,
    label,
    accessibilityLabel,
    testID,
    theme,
  } = props;
  const [visible, setVisible] = useState(false);
  const styles = createStyles(theme);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          secureTextEntry={!visible}
          autoComplete="password"
          accessibilityLabel={accessibilityLabel ?? label ?? 'Şifre'}
          testID={testID}
          style={[
            styles.input,
            styles[`size_${size}`],
            invalid ? styles.invalid : null,
            disabled ? styles.disabled : null,
          ]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: visible }}
          accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          style={({ pressed }) => [
            styles.toggle,
            pressed ? styles.pressed : null,
            disabled ? styles.disabled : null,
          ]}
        >
          <Text style={styles.toggleLabel}>{visible ? 'Gizle' : 'Göster'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    wrapper: { gap: theme.space[1] },
    label: { fontSize: theme.fontSize.sm.size, fontWeight: '600', color: theme.tokens.textPrimary },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
    input: {
      flex: 1,
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
    pressed: { opacity: 0.85 },
    toggle: {
      height: 44,
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.md,
      backgroundColor: theme.tokens.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleLabel: { color: theme.tokens.textSecondary, fontWeight: '600' },
  });
}
