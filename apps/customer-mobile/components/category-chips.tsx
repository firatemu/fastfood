import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { StorefrontHome } from '../lib/schemas';
import { colors, fonts, radius, space } from '../theme';

export function CategoryChips(props: {
  categories: StorefrontHome['categories'];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}): ReactElement {
  const total = props.categories.reduce((n, category) => n + category.productCount, 0);
  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.headLabel}>Menü Kategorileri</Text>
        <Text style={styles.headCount}>Tümünü İncele ({total})</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          label={`Tüm Lezzetler (${total})`}
          selected={props.selectedId === null}
          onPress={() => props.onSelect(null)}
        />
        {props.categories.map((category) => (
          <Chip
            key={category.id}
            label={
              category.productCount > 0
                ? `${category.name} (${category.productCount})`
                : category.name
            }
            selected={props.selectedId === category.id}
            onPress={() => props.onSelect(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip(props: { label: string; selected: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: props.selected }}
      onPress={props.onPress}
      style={[styles.chip, props.selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, props.selected && styles.chipTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    marginBottom: space.sm,
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
  row: { paddingHorizontal: space.gutter, gap: space.sm, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.mustard },
  chipText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
  },
  chipTextOn: { color: colors.onMustard },
});
