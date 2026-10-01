/**
 * Wave 0 — promotion discount computation + lifecycle.
 */
import { describe, expect, it } from 'vitest';

import { PromotionService } from '../../src/modules/promotion/promotion.service.js';

describe('Wave 0 promotions', () => {
  it('computes FIXED_CART_MINOR discount server-side', async () => {
    const svc = new PromotionService();
    const promo = await svc.create({
      code: 'SAVE10',
      name: 'Save 10',
      kind: 'FIXED_CART_MINOR',
      discountMinor: 1000n,
      minMerchandiseMinor: 5000n,
    });
    const applied = svc.computeDiscount(promo, {
      merchandiseGrossMinor: 20000n,
      deliveryFeeMinor: 1500n,
    });
    expect(applied.cartDiscountMinor).toBe(1000n);
    expect(applied.deliveryFeeMinor).toBe(1500n);
  });

  it('computes PERCENT_CART discount with half-up bps', async () => {
    const svc = new PromotionService();
    const promo = await svc.create({
      code: 'PCT10',
      name: '10 percent',
      kind: 'PERCENT_CART',
      discountPercentBps: 1000,
    });
    const applied = svc.computeDiscount(promo, {
      merchandiseGrossMinor: 10000n,
      deliveryFeeMinor: 1500n,
    });
    expect(applied.cartDiscountMinor).toBe(1000n);
  });

  it('waives delivery fee', async () => {
    const svc = new PromotionService();
    const promo = await svc.create({
      code: 'FREEDEL',
      name: 'Free delivery',
      kind: 'DELIVERY_FEE_WAIVER',
    });
    const applied = svc.computeDiscount(promo, {
      merchandiseGrossMinor: 10000n,
      deliveryFeeMinor: 1500n,
    });
    expect(applied.deliveryFeeMinor).toBe(0n);
  });

  it('validates coupon code case-insensitively', async () => {
    const svc = new PromotionService();
    await svc.create({
      code: 'HELLO',
      name: 'Hello',
      kind: 'FIXED_CART_MINOR',
      discountMinor: 100n,
    });
    const found = await svc.validateCode('hello');
    expect(found?.code).toBe('HELLO');
  });

  it('deactivates promotion', async () => {
    const svc = new PromotionService();
    const promo = await svc.create({
      code: 'OFF',
      name: 'Off',
      kind: 'FIXED_CART_MINOR',
      discountMinor: 100n,
    });
    await svc.setActive(promo.id, false);
    expect(await svc.validateCode('OFF')).toBeNull();
  });
});
