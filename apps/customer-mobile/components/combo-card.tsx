import { Image } from 'expo-image';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTryMinor } from '../lib/money';
import type { StorefrontHome } from '../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../theme';

export function ComboCard(props: {
  combo: NonNullable<StorefrontHome['combo']>;
  busy?: boolean;
  onAdd?: () => void;
}): ReactElement {
  if (props.combo.expired) {
    return (
      <View style={styles.card}>
        <Text style={styles.expired}>Günün kombo fırsatı şu an yayında değil.</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <View style={styles.pills}>
        {props.combo.savingsPercent !== null ? (
          <View style={styles.savings}>
            <Text style={styles.savingsText}>%{props.combo.savingsPercent} İndirim</Text>
          </View>
        ) : null}
        <Text style={styles.kicker}>Günün Pitmaster Kombosu</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.name}>{props.combo.name}</Text>
          {props.combo.description ? (
            <Text style={styles.desc} numberOfLines={3}>
              {props.combo.description}
            </Text>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatTryMinor(props.combo.bundlePriceMinor, props.combo.currency)}
            </Text>
            {props.combo.compareAtMinor ? (
              <Text style={styles.compare}>
                {formatTryMinor(props.combo.compareAtMinor, props.combo.currency)}
              </Text>
            ) : null}
          </View>
        </View>
        {props.combo.imageUrl ? (
          <Image
            source={{ uri: props.combo.imageUrl }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel={props.combo.name}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={props.busy}
        onPress={props.onAdd}
        style={({ pressed }) => [
          styles.cta,
          (pressed || props.busy) && styles.ctaPressed,
        ]}
      >
        <Text style={styles.ctaLabel}>
          {props.busy ? 'Ekleniyor…' : 'Tek Tıkla Komboyu Sepete Ekle'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  expired: {
    fontFamily: fonts.jakarta,
    fontSize: 14,
    color: colors.ash,
  },
  pills: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  savings: {
    backgroundColor: colors.flameDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  savingsText: {
    color: colors.white,
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.mustard,
  },
  row: { flexDirection: 'row', gap: space.md },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  name: {
    fontFamily: fonts.anton,
    fontSize: 20,
    lineHeight: 24,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  desc: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  price: {
    fontFamily: fonts.anton,
    fontSize: 28,
    color: colors.mustard,
    fontVariant: ['tabular-nums'],
  },
  compare: {
    fontFamily: fonts.jakarta,
    fontSize: 15,
    color: colors.outline,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  image: {
    width: 112,
    height: 112,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
  },
  imageFallback: { backgroundColor: colors.surface },
  cta: {
    minHeight: minTouch,
    marginTop: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { backgroundColor: colors.mustardPressed },
  ctaLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onMustard,
  },
});
