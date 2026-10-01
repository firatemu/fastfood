import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTryMinor } from '../lib/money';
import type { VitrineProduct } from '../lib/schemas';
import { colors, fonts, hitSlop, minTouch, radius, space } from '../theme';

export function HomeHeroCard(props: {
  product: VitrineProduct;
  busy?: boolean;
  onAdd?: () => void;
}): ReactElement {
  const image = props.product.heroImageUrl ?? props.product.imageUrl;
  const spec = props.product.heroSpecs[0];
  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel={props.product.imageAlt ?? props.product.name}
          />
        ) : (
          <View style={[styles.image, styles.fallback]} />
        )}
        <LinearGradient
          colors={['transparent', colors.surface]}
          style={StyleSheet.absoluteFill}
        />
        {spec ? (
          <View style={styles.specPill}>
            <MaterialCommunityIcons name="fire" size={14} color={colors.flame} />
            <Text style={styles.specText}>
              {spec.label} {spec.value}
            </Text>
          </View>
        ) : null}
        {props.product.badge ? (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{props.product.badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.eyebrow}>
              {props.product.eyebrow ?? 'Ayın Smash Yıldızı'}
            </Text>
            <Text style={styles.name}>{props.product.name}</Text>
          </View>
          <Text style={styles.price}>
            {formatTryMinor(props.product.basePriceMinor, props.product.currency)}
          </Text>
        </View>
        {props.product.heroDescription ?? props.product.description ? (
          <Text style={styles.desc} numberOfLines={3}>
            {props.product.heroDescription ?? props.product.description}
          </Text>
        ) : null}
        <View style={styles.ctaRow}>
          <Pressable
            accessibilityRole="button"
            disabled={!props.product.isAvailable || props.busy}
            onPress={props.onAdd}
            style={({ pressed }) => [
              styles.ctaWrap,
              (pressed || props.busy) && styles.ctaPressed,
              !props.product.isAvailable && styles.disabled,
            ]}
          >
            <LinearGradient
              colors={[colors.mustard, colors.mustardGlow]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <MaterialCommunityIcons name="cart-outline" size={18} color={colors.onMustard} />
              <Text style={styles.ctaLabel}>
                {props.busy ? 'Ekleniyor…' : 'Hemen Sepete Ekle'}
              </Text>
            </LinearGradient>
          </Pressable>
          <Link href={`/products/${props.product.id}`} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Burger detay"
              hitSlop={hitSlop}
              style={styles.tune}
            >
              <MaterialCommunityIcons name="tune" size={20} color={colors.onSurface} />
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  imageWrap: { height: 220, position: 'relative' },
  image: { width: '100%', height: '100%', backgroundColor: colors.surfaceLow },
  fallback: { backgroundColor: colors.surfaceHigh },
  specPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(18,19,22,0.85)',
  },
  specText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurface,
  },
  badgePill: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.flameDeep,
  },
  badgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.white,
    textTransform: 'uppercase',
  },
  body: { padding: space.md, gap: space.sm, marginTop: -8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  titleCol: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.mustard,
  },
  name: {
    fontFamily: fonts.anton,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.3,
    color: colors.onSurface,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  price: {
    fontFamily: fonts.anton,
    fontSize: 28,
    color: colors.mustard,
    fontVariant: ['tabular-nums'],
  },
  desc: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: 4 },
  ctaWrap: { flex: 1, borderRadius: radius.md, overflow: 'hidden' },
  ctaPressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  cta: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: space.md,
  },
  ctaLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onMustard,
  },
  tune: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
