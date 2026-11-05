import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type Insets,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { customizeLabel } from '../lib/customize-label';
import { haptic } from '../lib/haptics';
import { formatTryMinor } from '../lib/money';
import type { VitrineProduct } from '../lib/schemas';
import { colors, fonts, hitSlop, radius, space } from '../theme';

import { FavoriteHeart } from './favorite-heart';

/**
 * Compact CTA height in dp.
 */
const CTA_MIN_HEIGHT = 30;

/**
 * Vitrine card. The product's only action is "open it and customize it", which
 * is what the web card does too: the CTA label says what the first tap decides
 * (`lib/customize-label.ts`) and the whole card stays tappable.
 *
 * There is deliberately no quick "+" add-to-cart here any more. Every path into
 * customization is the product route, and the cart is filled from there, so the
 * card no longer carries a second, narrower way to add a product without its
 * modifiers — the exact shortcut that made a customized order impossible.
 */
export function ProductCard(props: { product: VitrineProduct }): ReactElement {
  const image = props.product.imageUrl ?? props.product.heroImageUrl;
  const href: Href = `/products/${props.product.id}`;
  const label = customizeLabel(props.product);
  return (
    <View style={styles.card}>
      {/* The heart lives outside the card link on purpose: nested inside it,
          the tap would navigate to the product instead of toggling it. */}
      <View style={styles.media}>
        <CardLink href={href} accessibilityLabel={`${props.product.name} ürününü aç`}>
          <View style={styles.imageWrap}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.image}
                contentFit="cover"
                accessibilityLabel={props.product.imageAlt ?? props.product.name}
              />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}
            {props.product.badge ? <Text style={styles.badge}>{props.product.badge}</Text> : null}
          </View>
        </CardLink>
        <FavoriteHeart productId={props.product.id} name={props.product.name} />
      </View>
      <CardLink href={href} accessibilityLabel={`${props.product.name} detayları`}>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {props.product.name}
          </Text>
          {props.product.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {props.product.description}
            </Text>
          ) : null}
        </View>
      </CardLink>
      <View style={styles.footer}>
        <Text style={styles.price} numberOfLines={1}>
          {formatTryMinor(props.product.basePriceMinor, props.product.currency)}
        </Text>
        <CardLink
          href={href}
          accessibilityLabel={`${props.product.name} — ${label}`}
          hitSlop={hitSlop}
          style={({ pressed }) => [styles.customize, pressed && styles.customizePressed]}
        >
          <View style={styles.customizeContent}>
            <MaterialCommunityIcons name="plus" size={13} color={colors.onMustard} />
            <Text style={styles.customizeText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </CardLink>
      </View>
    </View>
  );
}

function CardLink(props: {
  href: Href;
  accessibilityLabel: string;
  hitSlop?: Insets;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  children: ReactNode;
}): ReactElement {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      hitSlop={props.hitSlop}
      onPress={() => {
        haptic.light();
        router.push(props.href);
      }}
      style={props.style}
    >
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  media: { position: 'relative' },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    height: 136,
    backgroundColor: colors.surfaceLow,
  },
  imageFallback: { backgroundColor: colors.surfaceHigh },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: colors.flame,
    fontFamily: fonts.jakartaBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.white,
  },
  customize: {
    flexShrink: 1,
    minHeight: CTA_MIN_HEIGHT,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizePressed: {
    backgroundColor: colors.mustardPressed,
    transform: [{ scale: 0.95 }],
  },
  customizeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  customizeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.1,
    color: colors.onMustard,
  },
  body: { padding: space.sm, gap: 4, minHeight: 74 },
  name: {
    fontFamily: fonts.jakartaBold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.onSurface,
  },
  desc: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ash,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
  },
  price: {
    flexShrink: 0,
    fontFamily: fonts.jakartaBold,
    fontSize: 15,
    color: colors.mustard,
    fontVariant: ['tabular-nums'],
  },
});
