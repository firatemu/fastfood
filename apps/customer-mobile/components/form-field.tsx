import type { ReactElement } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, fonts, minTouch, radius, space } from '../theme';

export function FormField(
  props: TextInputProps & { label: string; error?: string },
): ReactElement {
  const { label, error, style, ...input } = props;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.ash}
        style={[styles.input, style]}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
  },
  input: {
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: space.md,
    color: colors.onSurface,
    fontFamily: fonts.jakarta,
    fontSize: 16,
  },
  error: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.error,
  },
});
