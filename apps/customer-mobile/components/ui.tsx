import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, minTouch, radius, space } from '../theme';

export function MustardButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled || props.loading || !props.onPress}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.primary,
        (pressed || props.disabled) && styles.primaryPressed,
        props.disabled && styles.disabled,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={colors.onMustard} />
      ) : (
        <Text style={styles.primaryLabel}>{props.label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton(props: {
  label: string;
  onPress?: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
    >
      <Text style={styles.secondaryLabel}>{props.label}</Text>
    </Pressable>
  );
}

export function LoadingBlock(props: { label?: string }): ReactElement {
  return (
    <View style={styles.block}>
      <ActivityIndicator color={colors.mustard} size="large" />
      {props.label ? <Text style={styles.blockText}>{props.label}</Text> : null}
    </View>
  );
}

export function ErrorBlock(props: {
  title: string;
  message: string;
  onRetry?: () => void;
}): ReactElement {
  return (
    <View style={styles.block}>
      <Text style={styles.errorTitle}>{props.title}</Text>
      <Text style={styles.blockText}>{props.message}</Text>
      {props.onRetry ? <SecondaryButton label="Yeniden dene" onPress={props.onRetry} /> : null}
    </View>
  );
}

export function EmptyBlock(props: { title: string; message: string }): ReactElement {
  return (
    <View style={styles.block}>
      <Text style={styles.errorTitle}>{props.title}</Text>
      <Text style={styles.blockText}>{props.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: colors.mustardPressed },
  primaryLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onMustard,
  },
  secondary: {
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: { borderColor: colors.mustard },
  secondaryLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.white,
  },
  disabled: { opacity: 0.4 },
  block: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
  },
  errorTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  blockText: {
    fontFamily: fonts.jakarta,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ash,
    textAlign: 'center',
  },
});
