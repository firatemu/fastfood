import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isRadioGroup, isRequiredGroup, type ModifierGroup } from '../lib/modifiers';
import { formatDeltaMinor, formatTryMinor } from '../lib/money';
import { colors, fonts, minTouch, radius, space } from '../theme';

export function ModifierGroupCard(props: {
  index: number;
  group: ModifierGroup;
  selectedIds: string[];
  currency: string;
  onToggle: (modifierId: string) => void;
}): ReactElement {
  const radio = isRadioGroup(props.group);
  const required = isRequiredGroup(props.group);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <View style={styles.num}>
            <Text style={styles.numText}>{props.index}</Text>
          </View>
          <Text style={styles.title}>{props.group.name}</Text>
        </View>
        <Text style={[styles.badge, required ? styles.badgeReq : styles.badgeOpt]}>
          {required ? 'Zorunlu' : 'İsteğe bağlı'}
        </Text>
      </View>
      {props.group.selectionMax > 1 ? (
        <Text style={styles.hint}>
          En fazla {props.group.selectionMax} seçim
          {props.group.selectionMin > 0 ? ` · en az ${props.group.selectionMin}` : ''}
        </Text>
      ) : null}
      <View style={styles.list}>
        {props.group.modifiers.map((mod) => {
          const on = props.selectedIds.includes(mod.id);
          return (
            <Pressable
              key={mod.id}
              accessibilityRole={radio ? 'radio' : 'checkbox'}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => props.onToggle(mod.id)}
              style={[styles.row, on && styles.rowOn]}
            >
              <View style={styles.rowLeft}>
                <View style={[radio ? styles.radio : styles.check, on && styles.controlOn]}>
                  {on ? <View style={radio ? styles.radioPip : styles.checkPip} /> : null}
                </View>
                <Text style={styles.rowName}>{mod.name}</Text>
              </View>
              <Text style={[styles.delta, on && styles.deltaOn]}>
                {formatDeltaMinor(mod.priceDeltaMinor, props.currency)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function VariantGroupCard(props: {
  variants: ReadonlyArray<{ id: string; name: string; priceMinor: string }>;
  selectedId: string | null;
  currency: string;
  onSelect: (id: string) => void;
}): ReactElement {
  if (props.variants.length === 0) return <View />;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <View style={styles.num}>
            <Text style={styles.numText}>1</Text>
          </View>
          <Text style={styles.title}>Boy / varyant</Text>
        </View>
        <Text style={[styles.badge, styles.badgeReq]}>Zorunlu</Text>
      </View>
      <View style={styles.list}>
        {props.variants.map((variant) => {
          const on = props.selectedId === variant.id;
          return (
            <Pressable
              key={variant.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => props.onSelect(variant.id)}
              style={[styles.row, on && styles.rowOn]}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.radio, on && styles.controlOn]}>
                  {on ? <View style={styles.radioPip} /> : null}
                </View>
                <Text style={styles.rowName}>{variant.name}</Text>
              </View>
              <Text style={[styles.delta, on && styles.deltaOn]}>
                {formatTryMinor(variant.priceMinor, props.currency)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RemovalChips(props: {
  options: ReadonlyArray<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}): ReactElement {
  if (props.options.length === 0) return <View />;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Çıkarılacaklar</Text>
      <Text style={styles.hint}>Fiyat değişmez</Text>
      <View style={styles.chips}>
        {props.options.map((option) => {
          const on = props.selectedIds.includes(option.id);
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => props.onToggle(option.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.onMustard },
  title: {
    fontFamily: fonts.jakartaBold,
    fontSize: 18,
    color: colors.onSurface,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  badge: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  badgeReq: { color: colors.mustard, backgroundColor: colors.mustardBloom },
  badgeOpt: { color: colors.ash, backgroundColor: colors.surfaceHigh },
  hint: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  list: { gap: 8 },
  row: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    gap: space.sm,
  },
  rowOn: { backgroundColor: colors.surfaceHigh },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlOn: { backgroundColor: colors.mustard },
  radioPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onMustard },
  checkPip: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.onMustard },
  rowName: {
    fontFamily: fonts.jakartaSemibold,
    fontSize: 14,
    color: colors.onSurface,
    flexShrink: 1,
  },
  delta: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.ash,
    fontVariant: ['tabular-nums'],
  },
  deltaOn: { color: colors.mustard },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: minTouch,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLow,
  },
  chipOn: { backgroundColor: colors.errorContainer },
  chipText: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.onSurfaceVariant },
  chipTextOn: { color: colors.onErrorContainer },
});
