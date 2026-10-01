import { describe, expect, it } from 'vitest';

import { presentOrderItems, quotePresentationRows } from './quote-present';

describe('quotePresentationRows', () => {
  it('surfaces coupon, pickup, tip, and loyalty from the server quote', () => {
    const view = quotePresentationRows({
      merchandiseGrossSubtotalMinor: '10000',
      cartDiscountTotalMinor: '1000',
      pickupDiscountMinor: '500',
      deliveryFeeMinor: '0',
      tipMinor: '1500',
      loyaltyRedeemedMinor: '200',
      finalPayableMinor: '9800',
      minimumOrderEligible: true,
    });
    expect(view.payable).toBe('9800');
    expect(view.payBlocked).toBe(false);
    expect(view.rows.map((row) => row.key)).toEqual([
      'subtotal',
      'coupon',
      'pickup',
      'tip',
      'loyalty',
      'delivery',
    ]);
  });

  it('blocks payment when the server says minimum order is unmet', () => {
    const view = quotePresentationRows({
      merchandiseGrossSubtotalMinor: '100',
      cartDiscountTotalMinor: '0',
      deliveryFeeMinor: '2500',
      finalPayableMinor: '2600',
      minimumOrderEligible: false,
    });
    expect(view.payBlocked).toBe(true);
  });
});

describe('presentOrderItems', () => {
  it('reads productName/quantity from confirmation items without inventing lines', () => {
    expect(
      presentOrderItems([
        { productName: 'Double Smash', quantity: 2 },
        { productName: '', quantity: 0 },
      ]),
    ).toEqual([
      { title: 'Double Smash', quantity: 2 },
      { title: 'Ürün', quantity: 1 },
    ]);
  });
});
