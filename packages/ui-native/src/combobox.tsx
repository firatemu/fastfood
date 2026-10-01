import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  label: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  theme: NativeTheme;
}

export function Combobox(props: ComboboxProps) {
  const {
    options,
    value,
    onChange,
    label,
    placeholder = 'Ara…',
    invalid = false,
    disabled = false,
    theme,
  } = props;
  const styles = createStyles(theme);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={current?.label ?? ''}
        placeholder={placeholder}
        editable={!disabled}
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, disabled }}
        onFocus={() => setOpen(true)}
        style={[styles.input, invalid ? styles.invalid : null, disabled ? styles.disabled : null]}
      />
      {open ? (
        <ScrollView style={styles.list} accessibilityRole="none">
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                if (opt.disabled) return;
                onChange?.(opt.value);
                setOpen(false);
              }}
              disabled={opt.disabled}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: opt.value === value, disabled: !!opt.disabled }}
              style={({ pressed }) => [styles.option, pressed ? styles.pressed : null]}
            >
              <Text
                style={[styles.optionLabel, opt.value === value ? styles.optionLabelActive : null]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
      height: 44,
      color: theme.tokens.textPrimary,
      fontSize: theme.fontSize.md.size,
    },
    invalid: { borderColor: theme.tokens.actionDangerBackground },
    disabled: { opacity: 0.6 },
    list: {
      maxHeight: 240,
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
    },
    option: {
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      minHeight: 44,
      justifyContent: 'center',
    },
    pressed: { backgroundColor: theme.tokens.surfaceSubtle },
    optionLabel: { color: theme.tokens.textPrimary, fontSize: theme.fontSize.md.size },
    optionLabelActive: { fontWeight: '700' },
  });
}
