import { describe, expect, it } from 'vitest';

import {
  lineSubtotalMinor,
  merchandiseSubtotalMinor,
  payableMinor,
  previewCouponDiscount,
} from './pricing-preview';

describe('pricing preview', () => {
  it('adds modifier deltas then multiplies quantity', () => {
    expect(
      lineSubtotalMinor('29500', [{ priceDeltaMinorSnapshot: '3000' }, { priceDeltaMinorSnapshot: '2000' }], 2),
    ).toBe('69000');
  });

  it('sums cart merchandise from snapshots', () => {
    expect(
      merchandiseSubtotalMinor([
        { unitPriceMinorSnapshot: '29500', quantity: 1, modifiers: [{ priceDeltaMinorSnapshot: '3000' }] },
        { unitPriceMinorSnapshot: '16500', quantity: 2, modifiers: [] },
      ]),
    ).toBe('65500');
  });

  it('applies percent coupons with domain rounding after min is met', () => {
    const below = previewCouponDiscount({
      merchandiseMinor: '4000',
      kind: 'PERCENT_CART',
      discountPercentBps: 1000,
      minMerchandiseMinor: '5000',
    });
    expect(below).toEqual({ discountMinor: '0', minMet: false, deliveryWaived: false });

    const applied = previewCouponDiscount({
      merchandiseMinor: '54000',
      kind: 'PERCENT_CART',
      discountPercentBps: 1000,
      minMerchandiseMinor: '5000',
    });
    expect(applied).toEqual({ discountMinor: '5400', minMet: true, deliveryWaived: false });
  });

  it('caps fixed coupons at merchandise and flags delivery waivers', () => {
    expect(
      previewCouponDiscount({
        merchandiseMinor: '4000',
        kind: 'FIXED_CART_MINOR',
        discountMinor: '5000',
        minMerchandiseMinor: '0',
      }).discountMinor,
    ).toBe('4000');
    expect(
      previewCouponDiscount({
        merchandiseMinor: '54000',
        kind: 'DELIVERY_FEE_WAIVER',
        minMerchandiseMinor: '0',
      }),
    ).toEqual({ discountMinor: '0', minMet: true, deliveryWaived: true });
    expect(payableMinor('54000', '5000')).toBe('49000');
  });
});
