export {
  formatDeltaMinor,
  formatTryMinor,
  multiplyMinor,
} from '@fastfood/contracts';

/** Format money stored as minor units (kuruş) for the customer Storefront. */
export function formatPriceMinor(amountMinor: string | bigint, currency: string): string {
  const minor = typeof amountMinor === 'bigint' ? amountMinor : BigInt(amountMinor);
  const major = Number(minor) / 100;
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}
