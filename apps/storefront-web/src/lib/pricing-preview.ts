/** UX preview helpers. Authoritative totals always come from cart snapshots / quote. */

export function lineSubtotalMinor(
  unitPriceMinor: string,
  modifiers: ReadonlyArray<{ priceDeltaMinorSnapshot: string }>,
  quantity: number,
): string {
  const delta = modifiers.reduce((acc, item) => acc + BigInt(item.priceDeltaMinorSnapshot), 0n);
  const qty = BigInt(Math.max(0, quantity));
  return ((BigInt(unitPriceMinor) + delta) * qty).toString();
}

export function merchandiseSubtotalMinor(
  lines: ReadonlyArray<{
    unitPriceMinorSnapshot: string;
    quantity: number;
    modifiers: ReadonlyArray<{ priceDeltaMinorSnapshot: string }>;
  }>,
): string {
  return lines
    .reduce(
      (acc, line) =>
        acc + BigInt(lineSubtotalMinor(line.unitPriceMinorSnapshot, line.modifiers, line.quantity)),
      0n,
    )
    .toString();
}

export function previewCouponDiscount(input: {
  merchandiseMinor: string;
  kind: string;
  discountMinor?: string | null;
  discountPercentBps?: number | null;
  minMerchandiseMinor: string;
}): { discountMinor: string; minMet: boolean; deliveryWaived: boolean } {
  const merch = BigInt(input.merchandiseMinor);
  const min = BigInt(input.minMerchandiseMinor);
  const minMet = merch >= min;
  if (!minMet) {
    return { discountMinor: '0', minMet: false, deliveryWaived: false };
  }
  if (input.kind === 'FIXED_CART_MINOR') {
    const amount = BigInt(input.discountMinor ?? '0');
    const discount = amount > merch ? merch : amount;
    return { discountMinor: discount.toString(), minMet: true, deliveryWaived: false };
  }
  if (input.kind === 'PERCENT_CART') {
    const bps = BigInt(input.discountPercentBps ?? 0);
    const discount = (merch * bps + 5000n) / 10000n;
    return { discountMinor: discount.toString(), minMet: true, deliveryWaived: false };
  }
  if (input.kind === 'DELIVERY_FEE_WAIVER') {
    return { discountMinor: '0', minMet: true, deliveryWaived: true };
  }
  return { discountMinor: '0', minMet: true, deliveryWaived: false };
}

export function payableMinor(merchandiseMinor: string, discountMinor: string): string {
  const next = BigInt(merchandiseMinor) - BigInt(discountMinor);
  return (next < 0n ? 0n : next).toString();
}
