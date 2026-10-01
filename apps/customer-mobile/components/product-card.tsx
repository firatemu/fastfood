import { Image } from 'expo-image';
import { Link } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTryMinor } from '../lib/money';
import type { VitrineProduct } from '../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../theme';

export function ProductCard(props: {
  product: VitrineProduct;
  busy?: boolean;
  onAdd?: () => void;
}): ReactElement {
  const image = props.product.imageUrl ?? props.product.heroImageUrl;
  return (
    <View style={styles.card}>
      <Link href={`/products/${props.product.id}`} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={props.product.name}>
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
            {props.product.badge ? (
              <Text style={styles.badge}>{props.product.badge}</Text>
            ) : null}
          </View>
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
        </Pressable>
      </Link>
      <View style={styles.footer}>
        <Text style={styles.price}>
          {formatTryMinor(props.product.basePriceMinor, props.product.currency)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sepete ekle"
          disabled={!props.product.isAvailable || props.busy}
          onPress={props.onAdd}
          style={({ pressed }) => [
            styles.add,
            pressed && styles.addPressed,
            (!props.product.isAvailable || props.busy) && styles.addDisabled,
          ]}
        >
          <Text style={styles.addLabel}>{props.busy ? '…' : '+'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    height: 132,
    backgroundColor: colors.surfaceLow,
  },
  imageFallback: { backgroundColor: colors.surfaceHigh },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.mustardPressed,
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onMustard,
  },
  body: { padding: space.sm, gap: 4, minHeight: 72 },
  name: {
    fontFamily: fonts.jakartaBold,
    fontSize: 14,
    lineHeight: 18,
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
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    minHeight: minTouch,
  },
  price: {
    fontFamily: fonts.jakartaBold,
    fontSize: 15,
    color: colors.mustard,
    fontVariant: ['tabular-nums'],
  },
  add: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPressed: { backgroundColor: colors.mustardPressed },
  addDisabled: { opacity: 0.4 },
  addLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 22,
    color: colors.onMustard,
    marginTop: -2,
  },
});
