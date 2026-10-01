import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  accessibilityLabel?: string;
  testID?: string;
  theme: NativeTheme;
}

export function Select(props: SelectProps) {
  const {
    options,
    value,
    onChange,
    size = 'md',
    invalid = false,
    disabled = false,
    label,
    placeholder = 'Seçiniz',
    accessibilityLabel,
    testID,
    theme,
  } = props;
  const styles = createStyles(theme);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => {
          if (disabled) return;
          // Real apps open a modal picker here. Demo: cycle options.
          const idx = options.findIndex((o) => o.value === value);
          const next = options[(idx + 1) % options.length];
          if (next && !next.disabled) onChange?.(next.value);
        }}
        disabled={disabled}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{
          disabled,
          expanded: false,
          selected: !!value,
          ...(invalid ? { busy: true } : {}),
        }}
        testID={testID}
        style={[
          styles.input,
          styles[`size_${size}`],
          invalid ? styles.invalid : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={[styles.value, !current ? styles.placeholder : null]}>
          {current ? current.label : placeholder}
        </Text>
        <Text style={styles.chev}>▾</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    wrapper: { gap: theme.space[1] },
    label: { fontSize: theme.fontSize.sm.size, fontWeight: '600', color: theme.tokens.textPrimary },
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
      paddingHorizontal: theme.space[3],
    },
    size_sm: { height: 36 },
    size_md: { height: 44 },
    size_lg: { height: 52 },
    invalid: { borderColor: theme.tokens.actionDangerBackground },
    disabled: { opacity: 0.6 },
    value: { color: theme.tokens.textPrimary, fontSize: theme.fontSize.md.size },
    placeholder: { color: theme.tokens.textMuted },
    chev: { color: theme.tokens.textSecondary, fontSize: theme.fontSize.md.size },
  });
}
