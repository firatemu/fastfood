import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, minTouch, radius, space } from '../theme';

export function StickyCta(props: {
  label: string;
  priceLabel: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  hint?: string;
  lift?: number;
  onPress?: () => void;
  children?: ReactNode;
}): ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) + (props.lift ?? 0) }]}>
      {props.hint ? <Text style={styles.hint}>{props.hint}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(props.disabled || props.loading) }}
        disabled={props.disabled || props.loading || !props.onPress}
        onPress={props.onPress}
        style={({ pressed }) => [
          styles.btnWrap,
          (pressed || props.loading) && styles.pressed,
          props.disabled && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={[colors.mustard, colors.mustardPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          <Text style={styles.label}>
            {props.loading ? (props.loadingLabel ?? 'Ekleniyor…') : props.label}
          </Text>
          <Text style={styles.price}>{props.priceLabel}</Text>
        </LinearGradient>
      </Pressable>
      {props.children}
    </View>
  );
}

export const stickyCtaReserve = 108;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
    backgroundColor: 'rgba(18,19,22,0.94)',
    gap: 8,
  },
  hint: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
  },
  btnWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.4 },
  btn: {
    minHeight: minTouch + 8,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.jakartaBold,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.onMustard,
  },
  price: {
    fontFamily: fonts.anton,
    fontSize: 22,
    color: colors.onMustard,
    fontVariant: ['tabular-nums'],
  },
});
