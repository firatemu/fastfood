import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface TableColumn<T> {
  key: keyof T & string;
  header: string;
  render?: (row: T) => ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  emptyText?: string;
  rowKey: (row: T) => string;
  ariaLabel: string;
  theme: NativeTheme;
}

export function Table<T>(props: TableProps<T>) {
  const { columns, rows, emptyText = 'Veri yok', rowKey, ariaLabel, theme } = props;
  const styles = createStyles(theme);
  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal accessibilityLabel={ariaLabel}>
      <View>
        <View style={styles.headerRow}>
          {columns.map((c) => (
            <Text key={`h-${c.key}`} style={[styles.cellHeader, styles.cell]}>
              {c.header}
            </Text>
          ))}
        </View>
        {rows.map((row) => (
          <View key={rowKey(row)} style={styles.row}>
            {columns.map((c) => (
              <View key={c.key} style={styles.cell}>
                {c.render ? c.render(row) : <Text>{String(row[c.key] ?? '')}</Text>}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      backgroundColor: theme.tokens.surfaceSubtle,
      borderBottomColor: theme.tokens.borderDefault,
      borderBottomWidth: 1,
    },
    row: {
      flexDirection: 'row',
      borderBottomColor: theme.tokens.borderDefault,
      borderBottomWidth: 1,
    },
    cell: {
      minWidth: 120,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      minHeight: 44,
      justifyContent: 'center',
    },
    cellHeader: { fontWeight: '700', color: theme.tokens.textSecondary },
    empty: { padding: theme.space[4], alignItems: 'center' },
    emptyText: { color: theme.tokens.textSecondary },
  });
}
