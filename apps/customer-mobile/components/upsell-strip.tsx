import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { formatTryMinor } from '../lib/money';
import type { productRecommendationSchema } from '../lib/schemas';
import { colors, radius, space, type } from '../theme';

type Recommendation = z.infer<typeof productRecommendationSchema>;

export interface UpsellStripProps {
  items: Recommendation[];
  onAdd?: (productId: string) => void;
  onInspect?: (productId: string) => void;
  busyId?: string | null;
}

/**
 * "Bunlardan birini ister misin?" — recommended products.
 *
 * Parity with the storefront web product detail, which renders
 * `components/storefront/upsell-section.tsx` from `product.recommendations`.
 * Mobile parsed that array but never displayed it.
 *
 * Mirrors the web rule exactly: the first item is the offer (add-to-cart inline),
 * the remainder are browse-only links. Renders nothing when the API sends none.
 */
export function UpsellStrip({ items, onAdd, onInspect, busyId }: UpsellStripProps) {
  if (items.length === 0) return null;

  const primary = items[0];
  const rest = items.slice(1);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Şunları da ister misin?</Text>

      {primary ? (
        <View style={styles.primary}>
          <Thumbnail
            url={primary.imageUrl}
            alt={primary.imageAlt ?? primary.name}
            size={48}
          />
          <View style={styles.primaryText}>
            <Text style={styles.name} numberOfLines={1}>
              {primary.name}
            </Text>
            {primary.description ? (
              <Text style={styles.description} numberOfLines={1}>
                {primary.description}
              </Text>
            ) : null}
          </View>
          {onAdd ? (
            <Pressable
              onPress={() => onAdd(primary.id)}
              disabled={busyId === primary.id}
              accessibilityRole="button"
              accessibilityLabel={`${primary.name} sepete ekle`}
              accessibilityState={{ disabled: busyId === primary.id, busy: busyId === primary.id }}
              style={({ pressed }) => [
                styles.addButton,
                busyId === primary.id ? styles.disabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.addLabel}>
                +{formatTryMinor(primary.basePriceMinor, primary.currency)}
              </Text>
            </Pressable>
          ) : onInspect ? (
            <Pressable
              onPress={() => onInspect(primary.id)}
              accessibilityRole="button"
              accessibilityLabel={`${primary.name} incele`}
              style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.addLabel}>İncele</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {rest.length > 0 ? (
        <View style={styles.rest}>
          {rest.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onInspect?.(item.id)}
              disabled={!onInspect}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} incele`}
              style={({ pressed }) => [styles.restItem, pressed ? styles.pressed : null]}
            >
              <Thumbnail url={item.imageUrl} alt={item.imageAlt ?? item.name} size={40} />
              <View style={styles.restText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.price}>
                  {formatTryMinor(item.basePriceMinor, item.currency)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Thumbnail({ url, alt, size }: { url: string | null; alt: string; size: number }) {
  const box = { width: size, height: size, borderRadius: radius.sm };
  if (!url) {
    return <View style={[styles.placeholder, box]} accessibilityRole="image" accessibilityLabel={alt} />;
  }
  return (
    <Image
      source={{ uri: url }}
      style={box}
      resizeMode="cover"
      accessible
      accessibilityRole="image"
      accessibilityLabel={alt}
    />
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, paddingHorizontal: space.gutter, paddingTop: space.lg },
  heading: { ...type.headlineMd, color: colors.onSurface, textTransform: 'uppercase' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLow,
  },
  primaryText: { flex: 1, minWidth: 0 },
  name: { ...type.labelLg, color: colors.onSurface, textTransform: 'uppercase' },
  description: { ...type.bodySm, color: colors.onSurfaceVariant },
  addButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.mustard,
    backgroundColor: colors.mustard,
  },
  addLabel: { ...type.button, color: colors.onMustard },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  rest: { gap: space.sm },
  restItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
  },
  restText: { flex: 1, minWidth: 0 },
  price: { ...type.labelMd, color: colors.mustard },
  placeholder: { backgroundColor: colors.surfaceHigh },
});