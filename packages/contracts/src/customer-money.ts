/** TRY display used by Stitch HTML (`395 ₺`). Other currencies keep two decimals. */
export function formatTryMinor(minor: string | bigint, currency = 'TRY'): string {
  if (currency !== 'TRY') {
    const n = Number(minor) / 100;
    return `${n.toFixed(2)} ${currency}`;
  }
  const n = Number(minor) / 100;
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${rounded} ₺`;
}

/** Modifier/variant delta for PDP cards. Zero is “Dahil”. */
export function formatDeltaMinor(amountMinor: string | bigint, currency = 'TRY'): string {
  const minor = typeof amountMinor === 'bigint' ? amountMinor : BigInt(amountMinor);
  if (minor === 0n) return 'Dahil';
  const sign = minor > 0n ? '+' : '−';
  const abs = minor < 0n ? -minor : minor;
  return `${sign}${formatTryMinor(abs, currency)}`;
}

export function multiplyMinor(amountMinor: string, quantity: number): string {
  return (BigInt(amountMinor) * BigInt(Math.max(0, quantity))).toString();
}
