import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  theme: NativeTheme;
}

export function Pagination(props: PaginationProps) {
  const { page, totalPages, onPageChange, theme } = props;
  const styles = createStyles(theme);
  if (totalPages <= 1) return null;
  const items: (number | 'ellipsis')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) items.push(p);
    else if (items[items.length - 1] !== 'ellipsis') items.push('ellipsis');
  }
  return (
    <View accessibilityRole="none" accessibilityLabel="Pagination" style={styles.row}>
      <Pressable
        onPress={() => onPageChange(page - 1)}
        disabled={page <= 1}
        accessibilityRole="button"
        accessibilityLabel="Önceki sayfa"
        style={({ pressed }) => [
          styles.btn,
          page <= 1 ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.btnLabel}>‹</Text>
      </Pressable>
      {items.map((it, i) =>
        it === 'ellipsis' ? (
          <Text key={`e-${i}`} style={styles.ellipsis}>
            …
          </Text>
        ) : (
          <Pressable
            key={it}
            onPress={() => onPageChange(it)}
            accessibilityRole="button"
            accessibilityState={{ selected: it === page }}
            style={({ pressed }) => [
              styles.btn,
              it === page ? styles.btnActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.btnLabel, it === page ? styles.btnLabelActive : null]}>{it}</Text>
          </Pressable>
        ),
      )}
      <Pressable
        onPress={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        accessibilityRole="button"
        accessibilityLabel="Sonraki sayfa"
        style={({ pressed }) => [
          styles.btn,
          page >= totalPages ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.btnLabel}>›</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
    btn: {
      minWidth: 44,
      minHeight: 44,
      paddingHorizontal: theme.space[2],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      borderColor: theme.tokens.borderDefault,
      borderWidth: 1,
      backgroundColor: theme.tokens.surfaceCard,
    },
    btnActive: {
      backgroundColor: theme.tokens.actionPrimaryBackground,
      borderColor: theme.tokens.actionPrimaryBackground,
    },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
    btnLabel: { color: theme.tokens.textPrimary, fontWeight: '600' },
    btnLabelActive: { color: theme.tokens.actionPrimaryText },
    ellipsis: { color: theme.tokens.textSecondary, paddingHorizontal: theme.space[1] },
  });
}
