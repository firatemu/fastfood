import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface BreadcrumbItem {
  label: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  theme: NativeTheme;
}

export function Breadcrumb(props: BreadcrumbProps) {
  const { items, theme } = props;
  const styles = createStyles(theme);
  return (
    <View accessibilityRole="none" accessibilityLabel="Breadcrumb" style={styles.list}>
      {items.map((it, i) => (
        <View key={`${i}-${it.label}`} style={styles.item}>
          <Text style={i === items.length - 1 ? styles.current : styles.label}>{it.label}</Text>
          {i < items.length - 1 ? <Text style={styles.sep}> / </Text> : null}
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    list: { flexDirection: 'row', flexWrap: 'wrap' },
    item: { flexDirection: 'row', alignItems: 'center' },
    label: { color: theme.tokens.textSecondary, fontSize: theme.fontSize.sm.size },
    current: {
      color: theme.tokens.textPrimary,
      fontWeight: '700',
      fontSize: theme.fontSize.sm.size,
    },
    sep: { color: theme.tokens.textSecondary, fontSize: theme.fontSize.sm.size },
  });
}
