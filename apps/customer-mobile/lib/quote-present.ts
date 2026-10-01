export type QuoteMoney = {
  merchandiseGrossSubtotalMinor: string;
  cartDiscountTotalMinor: string;
  pickupDiscountMinor?: string;
  deliveryFeeMinor: string;
  tipMinor?: string;
  loyaltyRedeemedMinor?: string;
  finalPayableMinor: string;
  minimumOrderEligible: boolean;
};

export type QuoteRow = {
  key: string;
  label: string;
  amountMinor: string;
  kind: 'add' | 'subtract';
};

function positive(minor: string | undefined): boolean {
  return Boolean(minor && BigInt(minor) > 0n);
}

/** Server quote is the only payable source — this only chooses which rows to show. */
export function quotePresentationRows(quote: QuoteMoney): {
  rows: QuoteRow[];
  payable: string;
  payBlocked: boolean;
} {
  const rows: QuoteRow[] = [
    {
      key: 'subtotal',
      label: 'Ara toplam',
      amountMinor: quote.merchandiseGrossSubtotalMinor,
      kind: 'add',
    },
  ];
  if (positive(quote.cartDiscountTotalMinor)) {
    rows.push({
      key: 'coupon',
      label: 'Kupon',
      amountMinor: quote.cartDiscountTotalMinor,
      kind: 'subtract',
    });
  }
  if (positive(quote.pickupDiscountMinor)) {
    rows.push({
      key: 'pickup',
      label: 'Gel-al indirimi',
      amountMinor: quote.pickupDiscountMinor as string,
      kind: 'subtract',
    });
  }
  if (positive(quote.tipMinor)) {
    rows.push({
      key: 'tip',
      label: 'Bahşiş',
      amountMinor: quote.tipMinor as string,
      kind: 'add',
    });
  }
  if (positive(quote.loyaltyRedeemedMinor)) {
    rows.push({
      key: 'loyalty',
      label: 'Club puanı',
      amountMinor: quote.loyaltyRedeemedMinor as string,
      kind: 'subtract',
    });
  }
  rows.push({
    key: 'delivery',
    label: 'Teslimat',
    amountMinor: quote.deliveryFeeMinor,
    kind: 'add',
  });
  return {
    rows,
    payable: quote.finalPayableMinor,
    payBlocked: !quote.minimumOrderEligible,
  };
}

export function presentOrderItems(
  items: unknown[] | undefined,
): Array<{ title: string; quantity: number }> {
  if (!items) return [];
  const rows: Array<{ title: string; quantity: number }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.productName === 'string' && rec.productName.trim() ? rec.productName : 'Ürün';
    const quantity = typeof rec.quantity === 'number' && rec.quantity > 0 ? rec.quantity : 1;
    rows.push({ title, quantity });
  }
  return rows;
}
