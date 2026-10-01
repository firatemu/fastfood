import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface AddressSummaryProps {
  title: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  theme: NativeTheme;
}

export function AddressSummary(props: AddressSummaryProps) {
  const { title, line1, line2, city, postalCode, country, notes, theme } = props;
  const styles = createStyles(theme);
  return (
    <View style={styles.base}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>
        <Text style={styles.line}>{line1}</Text>
        {line2 ? <Text style={styles.line}>{line2}</Text> : null}
        <Text style={styles.line}>
          {city}
          {postalCode ? `, ${postalCode}` : ''}
        </Text>
        {country ? <Text style={styles.line}>{country}</Text> : null}
      </View>
      {notes ? <Text style={styles.notes}>{notes}</Text> : null}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      padding: theme.space[3],
      borderColor: theme.tokens.borderDefault,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      backgroundColor: theme.tokens.surfaceCard,
      gap: theme.space[1],
    },
    title: { fontWeight: '700', fontSize: theme.fontSize.sm.size, color: theme.tokens.textPrimary },
    body: { gap: theme.space[1] },
    line: { color: theme.tokens.textPrimary, fontSize: theme.fontSize.sm.size },
    notes: { color: theme.tokens.textSecondary, fontSize: theme.fontSize.xs.size },
  });
}
