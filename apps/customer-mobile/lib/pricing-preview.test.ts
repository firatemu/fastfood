import { describe, expect, it } from 'vitest';

import {
  merchandiseSubtotalMinor,
  payableMinor,
  previewCouponDiscount,
} from './pricing-preview';

describe('merchandiseSubtotalMinor', () => {
  it('sums unit + modifier deltas × quantity', () => {
    const total = merchandiseSubtotalMinor([
      {
        unitPriceMinorSnapshot: '29500',
        quantity: 2,
        modifiers: [{ priceDeltaMinorSnapshot: '3000' }],
      },
    ]);
    expect(total).toBe('65000');
  });
});

describe('previewCouponDiscount', () => {
  it('applies a percent cart discount when min is met', () => {
    const next = previewCouponDiscount({
      merchandiseMinor: '10000',
      kind: 'PERCENT_CART',
      discountPercentBps: 1000,
      minMerchandiseMinor: '0',
    });
    expect(next).toEqual({ discountMinor: '1000', minMet: true, deliveryWaived: false });
  });

  it('rejects below minimum without inventing a discount', () => {
    const next = previewCouponDiscount({
      merchandiseMinor: '1000',
      kind: 'FIXED_CART_MINOR',
      discountMinor: '5000',
      minMerchandiseMinor: '5000',
    });
    expect(next.minMet).toBe(false);
    expect(next.discountMinor).toBe('0');
  });

  it('flags delivery waiver without changing merchandise', () => {
    const next = previewCouponDiscount({
      merchandiseMinor: '20000',
      kind: 'DELIVERY_FEE_WAIVER',
      minMerchandiseMinor: '0',
    });
    expect(next.deliveryWaived).toBe(true);
    expect(next.discountMinor).toBe('0');
  });
});

describe('payableMinor', () => {
  it('floors at zero', () => {
    expect(payableMinor('100', '500')).toBe('0');
  });
});
