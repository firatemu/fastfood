import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface RadioProps {
  selected: boolean;
  onSelect: () => void;
  label: string;
  disabled?: boolean;
  testID?: string;
  theme: NativeTheme;
}

export function Radio(props: RadioProps) {
  const { selected, onSelect, label, disabled = false, testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <Pressable
      onPress={() => !disabled && onSelect()}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && !disabled ? styles.pressed : null]}
    >
      <View
        style={[
          styles.outer,
          selected ? styles.outerSelected : null,
          disabled ? styles.disabled : null,
        ]}
        accessibilityElementsHidden
      >
        {selected ? <View style={styles.inner} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2], minHeight: 44 },
    pressed: { opacity: 0.85 },
    outer: {
      width: 20,
      height: 20,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tokens.surfaceCard,
    },
    outerSelected: { borderColor: theme.tokens.actionPrimaryBackground },
    disabled: { opacity: 0.6 },
    inner: {
      width: 10,
      height: 10,
      borderRadius: 9999,
      backgroundColor: theme.tokens.actionPrimaryBackground,
    },
    label: { color: theme.tokens.textPrimary, fontSize: theme.fontSize.md.size },
  });
}
