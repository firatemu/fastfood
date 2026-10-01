import { StyleSheet, Text } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface MoneyProps {
  amountMinor: string | number | bigint;
  currency?: string;
  theme: NativeTheme;
}

export function Money(props: MoneyProps) {
  const { amountMinor, currency = 'TRY', theme } = props;
  const styles = createStyles(theme);
  const minorBig = typeof amountMinor === 'bigint' ? amountMinor : BigInt(String(amountMinor));
  const major = minorBig / 100n;
  const remainder = minorBig % 100n;
  const formatted = `${major.toString()},${remainder.toString().padStart(2, '0')}`;
  return (
    <Text style={styles.label} accessibilityLabel={`${formatted} ${currency}`}>
      {formatted} {currency === 'TRY' ? '₺' : currency}
    </Text>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    label: { fontWeight: '600', color: theme.tokens.textPrimary },
  });
}
