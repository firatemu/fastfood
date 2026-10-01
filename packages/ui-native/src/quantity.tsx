import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface QuantityProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label?: string;
  theme: NativeTheme;
}

export function Quantity(props: QuantityProps) {
  const { value, min = 0, max = 99, onChange, label = 'Adet', theme } = props;
  const styles = createStyles(theme);
  return (
    <View accessibilityRole="none" accessibilityLabel={label} style={styles.row}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Azalt"
        style={({ pressed }) => [
          styles.btn,
          value <= min ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.btnLabel}>−</Text>
      </Pressable>
      <TextInput
        accessibilityLabel={label}
        value={String(value)}
        keyboardType="numeric"
        onChangeText={(t) => {
          const n = Number(t);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        style={styles.input}
      />
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Arttır"
        style={({ pressed }) => [
          styles.btn,
          value >= max ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.btnLabel}>+</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
    btn: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      borderColor: theme.tokens.borderDefault,
      borderWidth: 1,
      backgroundColor: theme.tokens.surfaceCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    btnLabel: { fontSize: theme.fontSize.lg.size, color: theme.tokens.textPrimary },
    input: {
      width: 64,
      minHeight: 44,
      borderColor: theme.tokens.borderDefault,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      textAlign: 'center',
      fontSize: theme.fontSize.md.size,
      color: theme.tokens.textPrimary,
      backgroundColor: theme.tokens.surfaceCard,
    },
  });
}
