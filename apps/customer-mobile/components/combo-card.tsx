import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '../lib/haptics';
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
            <MaterialCommunityIcons name="tag-outline" size={13} color={colors.white} />
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
        onPress={() => {
          haptic.medium();
          props.onAdd?.();
        }}
        style={({ pressed }) => [styles.cta, (pressed || props.busy) && styles.ctaPressed]}
      >
        <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.onMustard} />
        <Text style={styles.ctaLabel}>
          {props.busy ? 'Ekleniyor…' : 'Tek Tıkla Komboyu Sepete Ekle'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairlineBright,
    overflow: 'hidden',
  },
  expired: {
    fontFamily: fonts.jakarta,
    fontSize: 14,
    color: colors.ash,
  },
  pills: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  savings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.flameDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  savingsText: {
    color: colors.white,
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  kicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.mustard,
  },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  copy: { flex: 1, gap: 4 },
  name: {
    fontFamily: fonts.jakartaBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  desc: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurfaceVariant,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  price: {
    fontFamily: fonts.anton,
    fontSize: 22,
    color: colors.mustard,
    fontVariant: ['tabular-nums'],
  },
  compare: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
  },
  imageFallback: { backgroundColor: colors.surfaceHigh },
  cta: {
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.mustard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: space.md,
  },
  ctaPressed: {
    backgroundColor: colors.mustardPressed,
    transform: [{ scale: 0.98 }],
  },
  ctaLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.onMustard,
  },
});
