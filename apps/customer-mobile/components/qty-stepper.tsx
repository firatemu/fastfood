import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, minTouch } from '../theme';

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
        onPress={() => props.onChange(Math.max(min, props.value - 1))}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, props.value <= min && styles.disabled]}
      >
        <MaterialCommunityIcons name="minus" size={18} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.value} accessibilityLabel={`Adet ${props.value}`}>
        {props.value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Artır"
        onPress={() => props.onChange(props.value + 1)}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="plus" size={18} color={colors.onSurface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 999,
    padding: 2,
  },
  btn: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceHighest },
  disabled: { opacity: 0.4 },
  value: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: fonts.jakartaBold,
    fontSize: 14,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
});
