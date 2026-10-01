import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  configuredPreviewUnitMinor,
  defaultModifierSelection,
  incompleteRequiredGroupNames,
  requiredSelectionsMet,
  selectedConfigurationLabels,
  toggleModifierSelection,
} from '../lib/modifiers';
import { formatTryMinor, multiplyMinor } from '../lib/money';
import type { ProductDetail } from '../lib/schemas';
import { colors, fonts, hitSlop, radius, space } from '../theme';

import { ModifierGroupCard, RemovalChips, VariantGroupCard } from './modifier-group';
import { QtyStepper } from './qty-stepper';
import { StickyCta, stickyCtaReserve } from './sticky-cta';

export function ProductConfigure(props: {
  product: ProductDetail;
  eyebrow: string;
  ctaLabel: string;
  submitting?: boolean;
  feedback?: string | null;
  bottomLift?: number;
  favorited?: boolean;
  favoriteBusy?: boolean;
  onToggleFavorite?: () => void;
  onAdd: (input: {
    quantity: number;
    variantId: string | null;
    selectedByGroup: Record<string, string[]>;
    removals: string[];
    previewUnit: string;
  }) => void;
}): ReactElement {
  const groups = props.product.modifierGroups;
  const variants = props.product.variants;
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [selectedByGroup, setSelectedByGroup] = useState(() => defaultModifierSelection(groups));
  const [removals, setRemovals] = useState<string[]>([]);
  const [mediaIndex, setMediaIndex] = useState(0);

  const previewUnit = configuredPreviewUnitMinor(
    props.product.basePriceMinor,
    variants,
    variantId,
    groups,
    selectedByGroup,
  );
  const previewLine = multiplyMinor(previewUnit, quantity);
  const currency = props.product.currency;
  const canAdd =
    Boolean(props.product.isAvailable) &&
    requiredSelectionsMet(groups, selectedByGroup, variants, variantId) &&
    !props.submitting;
  const incomplete = incompleteRequiredGroupNames(groups, selectedByGroup, variants, variantId);
  const variantName = variants.find((item) => item.id === variantId)?.name ?? null;
  const removalNames = props.product.removalOptions
    .filter((item) => removals.includes(item.id))
    .map((item) => item.name);
  const chips = selectedConfigurationLabels(groups, selectedByGroup, variantName, removalNames);
  const media = props.product.media;
  const hero = media[mediaIndex] ?? media[0];
  const rating =
    props.product.averageRatingBps && props.product.averageRatingBps > 0
      ? (props.product.averageRatingBps / 100).toLocaleString('tr-TR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : null;
  const showNutrition =
    props.product.kcal != null ||
    props.product.proteinGrams != null ||
    props.product.weightGrams != null;
  const groupOffset = variants.length > 0 ? 2 : 1;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: stickyCtaReserve + 24 + (props.bottomLift ?? 0) }]}>
        <View style={styles.hero}>
          {hero ? (
            <Image
              source={{ uri: hero.url }}
              style={styles.heroImage}
              contentFit="cover"
              accessibilityLabel={hero.altText ?? hero.alt ?? props.product.name}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]} />
          )}
          <LinearGradient colors={['transparent', colors.canvas]} style={StyleSheet.absoluteFill} />
          {props.product.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{props.product.badge}</Text>
            </View>
          ) : null}
          {rating ? (
            <View style={styles.rating}>
              <Text style={styles.ratingText}>{rating}</Text>
              {props.product.ratingCount ? (
                <Text style={styles.ratingCount}>({props.product.ratingCount})</Text>
              ) : null}
            </View>
          ) : null}
        </View>
        {media.length > 1 ? (
          <View style={styles.dots}>
            {media.map((item, index) => (
              <Pressable
                key={`${item.url}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Görsel ${index + 1}`}
                onPress={() => setMediaIndex(index)}
                style={[styles.dot, index === mediaIndex && styles.dotOn]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.gutter}>
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.eyebrow}>{props.product.eyebrow ?? props.eyebrow}</Text>
              <Text style={styles.name}>{props.product.name}</Text>
            </View>
            <View style={styles.priceCol}>
              {props.onToggleFavorite ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={props.favorited ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                  accessibilityState={{ selected: Boolean(props.favorited), busy: Boolean(props.favoriteBusy) }}
                  disabled={props.favoriteBusy}
                  onPress={props.onToggleFavorite}
                  hitSlop={hitSlop}
                  style={styles.heart}
                >
                  <MaterialCommunityIcons
                    name={props.favorited ? 'heart' : 'heart-outline'}
                    size={24}
                    color={props.favorited ? colors.flame : colors.mustard}
                  />
                </Pressable>
              ) : null}
              <Text style={styles.price}>{formatTryMinor(previewUnit, currency)}</Text>
              <Text style={styles.kdv}>KDV Dahil</Text>
            </View>
          </View>
          {props.product.description ? (
            <Text style={styles.desc}>{props.product.description}</Text>
          ) : null}

          {showNutrition ? (
            <View style={styles.nutrition}>
              {props.product.kcal != null ? (
                <NutCell label="Enerji" value={`${props.product.kcal} kcal`} />
              ) : null}
              {props.product.proteinGrams != null ? (
                <NutCell label="Protein" value={`${props.product.proteinGrams}g`} />
              ) : null}
              {props.product.weightGrams != null ? (
                <NutCell label="Gramaj" value={`${props.product.weightGrams}g`} />
              ) : null}
            </View>
          ) : null}

          {props.product.allergens.length > 0 ? (
            <Text style={styles.allergens}>
              Alerjenler: {props.product.allergens.map((item) => item.name).join(', ')}
            </Text>
          ) : null}
          <Link href="/legal/allergens" asChild>
            <Pressable accessibilityRole="button" hitSlop={hitSlop} style={styles.allergenLink}>
              <Text style={styles.allergenLinkLabel}>Alerjen rehberi</Text>
            </Pressable>
          </Link>

          {!props.product.isAvailable ? (
            <Text style={styles.unavailable}>Bu ürün şu an siparişe kapalı.</Text>
          ) : null}

          {variants.length > 0 ? (
            <VariantGroupCard
              variants={variants}
              selectedId={variantId}
              currency={currency}
              onSelect={setVariantId}
            />
          ) : null}

          {groups.map((group, index) => (
            <ModifierGroupCard
              key={group.id}
              index={groupOffset + index}
              group={group}
              selectedIds={selectedByGroup[group.id] ?? []}
              currency={currency}
              onToggle={(modifierId) =>
                setSelectedByGroup((current) =>
                  toggleModifierSelection(groups, current, group.id, modifierId),
                )
              }
            />
          ))}

          <RemovalChips
            options={props.product.removalOptions}
            selectedIds={removals}
            onToggle={(id) =>
              setRemovals((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
          />

          {chips.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Seçimin</Text>
              <View style={styles.chipRow}>
                {chips.map((chip) => (
                  <Text key={chip.label} style={[styles.chip, chip.priced && styles.chipPriced]}>
                    {chip.label}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.qtyRow}>
            <Text style={styles.summaryLabel}>Adet</Text>
            <QtyStepper value={quantity} onChange={setQuantity} />
          </View>
        </View>
      </ScrollView>
      <StickyCta
        label={props.ctaLabel}
        priceLabel={formatTryMinor(previewLine, currency)}
        disabled={!canAdd}
        loading={props.submitting}
        lift={props.bottomLift}
        hint={
          !props.product.isAvailable
            ? 'Ürün şu an siparişe kapalı.'
            : incomplete.length > 0
              ? `Eksik: ${incomplete.join(', ')}`
              : (props.feedback ?? undefined)
        }
        onPress={
          canAdd
            ? () =>
                props.onAdd({
                  quantity,
                  variantId,
                  selectedByGroup,
                  removals,
                  previewUnit,
                })
            : undefined
        }
      />
    </View>
  );
}

function NutCell(props: { label: string; value: string }): ReactElement {
  return (
    <View style={styles.nut}>
      <Text style={styles.nutValue}>{props.value}</Text>
      <Text style={styles.nutLabel}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { gap: space.md },
  hero: { height: 280, position: 'relative', backgroundColor: colors.surfaceLowest },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { backgroundColor: colors.surfaceHigh },
  badge: {
    position: 'absolute',
    left: space.gutter,
    bottom: space.md,
    backgroundColor: colors.flameDeep,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.white,
    textTransform: 'uppercase',
  },
  rating: {
    position: 'absolute',
    right: space.gutter,
    bottom: space.md,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(41,42,45,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  ratingText: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.onSurface },
  ratingCount: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh },
  dotOn: { backgroundColor: colors.mustard },
  gutter: { paddingHorizontal: space.gutter, gap: space.md },
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
    fontSize: 32,
    lineHeight: 36,
    color: colors.onSurface,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  priceCol: { alignItems: 'flex-end' },
  heart: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  price: { fontFamily: fonts.anton, fontSize: 28, color: colors.mustard, fontVariant: ['tabular-nums'] },
  kdv: { fontFamily: fonts.jakarta, fontSize: 11, color: colors.ash },
  desc: { fontFamily: fonts.jakarta, fontSize: 15, lineHeight: 24, color: colors.onSurfaceVariant },
  nutrition: { flexDirection: 'row', gap: 8 },
  nut: {
    flex: 1,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'center',
  },
  nutValue: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.onSurface },
  nutLabel: { fontFamily: fonts.jakarta, fontSize: 11, color: colors.ash, marginTop: 2 },
  allergens: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.onSurfaceVariant },
  allergenLink: { minHeight: 44, justifyContent: 'center' },
  allergenLinkLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.mustard,
    textTransform: 'uppercase',
  },
  unavailable: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.error },
  summary: { gap: 8 },
  summaryLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.onSurface,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  chipPriced: { color: colors.mustard },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
