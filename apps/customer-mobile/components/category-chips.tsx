import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { haptic } from '../lib/haptics';
import type { StorefrontHome } from '../lib/schemas';
import { colors, fonts, radius, space } from '../theme';

export function CategoryChips(props: {
  categories: StorefrontHome['categories'];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}): ReactElement {
  const total = props.categories.reduce((n, category) => n + category.productCount, 0);
  return (
    // This bar is a sticky header inside the home ScrollView, so it needs its own
    // opaque background — without one, product cards show through it while pinned,
    // and `zIndex` keeps it above them.
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.headTitleRow}>
          <MaterialCommunityIcons name="silverware-clean" size={14} color={colors.mustard} />
          <Text style={styles.headLabel}>Menü Kategorileri</Text>
        </View>
        <Text style={styles.headCount}>{total} Ürün</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          label="Tümü"
          count={total}
          icon="fire"
          selected={props.selectedId === null}
          onPress={() => props.onSelect(null)}
        />
        {props.categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            count={category.productCount}
            selected={props.selectedId === category.id}
            onPress={() => props.onSelect(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip(props: {
  label: string;
  count?: number;
  icon?: 'fire';
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: props.selected }}
      onPress={() => {
        haptic.light();
        props.onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        props.selected && styles.chipOn,
        pressed && styles.chipPressed,
      ]}
    >
      {props.icon === 'fire' ? (
        <MaterialCommunityIcons
          name="fire"
          size={14}
          color={props.selected ? colors.onMustard : colors.flame}
        />
      ) : null}
      <Text style={[styles.chipText, props.selected && styles.chipTextOn]}>{props.label}</Text>
      {props.count !== undefined && props.count > 0 ? (
        <View style={[styles.chipCountPill, props.selected && styles.chipCountPillOn]}>
          <Text style={[styles.chipCountText, props.selected && styles.chipCountTextOn]}>
            {props.count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.canvas, zIndex: 1, paddingVertical: 4 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    marginBottom: space.sm,
  },
  headTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.onSurface,
  },
  headCount: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.mustard,
  },
  row: { paddingHorizontal: space.gutter, gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
  },
  chipOn: {
    backgroundColor: colors.mustard,
    borderColor: colors.mustardGlow,
  },
  chipText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.onSurface,
  },
  chipTextOn: { color: colors.onMustard },
  chipCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
  },
  chipCountPillOn: {
    backgroundColor: colors.mustardPressed,
  },
  chipCountText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  chipCountTextOn: {
    color: colors.onMustard,
  },
});
