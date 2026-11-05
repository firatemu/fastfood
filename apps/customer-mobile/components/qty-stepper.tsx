import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '../lib/haptics';
import { colors, fonts } from '../theme';

export function QtyStepper(props: {
  value: number;
  min?: number;
  onChange: (next: number) => void;
}): ReactElement {
  const min = props.min ?? 1;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Azalt"
        disabled={props.value <= min}
        onPress={() => {
          haptic.light();
          props.onChange(Math.max(min, props.value - 1));
        }}
        style={({ pressed }) => [
          styles.btn,
          pressed && styles.pressed,
          props.value <= min && styles.disabled,
        ]}
      >
        <MaterialCommunityIcons name="minus" size={18} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.value} accessibilityLabel={`Adet ${props.value}`}>
        {props.value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Artır"
        onPress={() => {
          haptic.light();
          props.onChange(props.value + 1);
        }}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="plus" size={18} color={colors.mustard} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 999,
    padding: 3,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceHigh, transform: [{ scale: 0.92 }] },
  disabled: { opacity: 0.3 },
  value: {
    minWidth: 32,
    textAlign: 'center',
    fontFamily: fonts.jakartaBold,
    fontSize: 15,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
});
