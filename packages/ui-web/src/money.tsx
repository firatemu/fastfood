import './styles.css';

export interface MoneyProps {
  /** Amount in minor units (kuruş for TRY). Always render as integer-string. */
  amountMinor: string | number | bigint;
  /** ISO 4217 currency code, default TRY. */
  currency?: string;
}

/**
 * Money — formats minor-unit integer amounts. Per document 34 §15,
 * canonical money is bigint-shaped at the JSON boundary; this component
 * never calls `Number(amount)` for the canonical value.
 */
export function Money(props: MoneyProps) {
  const { amountMinor, currency = 'TRY' } = props;
  const minorBig = typeof amountMinor === 'bigint' ? amountMinor : BigInt(String(amountMinor));
  const major = minorBig / 100n;
  const remainder = minorBig % 100n;
  const formatted = `${major.toString()},${remainder.toString().padStart(2, '0')}`;
  return (
    <span className="ff-money" data-currency={currency}>
      {formatted} {currency === 'TRY' ? '₺' : currency}
    </span>
  );
}
