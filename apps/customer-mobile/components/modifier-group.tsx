import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '../lib/haptics';
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
              onPress={() => {
                haptic.light();
                props.onToggle(mod.id);
              }}
              style={({ pressed }) => [
                styles.row,
                on && styles.rowOn,
                pressed && styles.rowPressed,
              ]}
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
          <Text style={styles.title}>Boy / Varyant</Text>
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
              onPress={() => {
                haptic.light();
                props.onSelect(variant.id);
              }}
              style={({ pressed }) => [
                styles.row,
                on && styles.rowOn,
                pressed && styles.rowPressed,
              ]}
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
      <Text style={styles.title}>Malzeme Çıkar</Text>
      <Text style={styles.hint}>İstemediğiniz malzemeleri seçerek çıkartabilirsiniz.</Text>
      <View style={styles.chips}>
        {props.options.map((option) => {
          const on = props.selectedIds.includes(option.id);
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptic.light();
                props.onToggle(option.id);
              }}
              style={({ pressed }) => [
                styles.chip,
                on && styles.chipOn,
                pressed && styles.chipPressed,
              ]}
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
    borderRadius: radius.xl,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairlineBright,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
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
    fontSize: 16,
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
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  badgeReq: { color: colors.onMustard, backgroundColor: colors.mustard },
  badgeOpt: { color: colors.onSurfaceVariant, backgroundColor: colors.surfaceHigh },
  hint: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.onSurfaceVariant },
  list: { gap: 8 },
  row: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: space.sm,
  },
  rowOn: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.mustardBloom,
  },
  rowPressed: {
    transform: [{ scale: 0.98 }],
  },
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
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipPressed: {
    transform: [{ scale: 0.95 }],
  },
  chipOn: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.danger,
  },
  chipText: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.onSurfaceVariant },
  chipTextOn: { color: colors.danger },
});