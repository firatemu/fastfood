/**
 * Phase 6 pricing engine unit tests (document 37).
 *
 * Coverage includes the normative worked example from §15.
 */
import { describe, expect, it } from 'vitest';

import { computePricingQuote, roundHalfUpBps } from '../../src/modules/pricing/pricing.engine.js';

describe('Phase 6 pricing engine (document 37)', () => {
  it('roundHalfUpBps uses half-up to nearest minor unit', async () => {
    // floor((10000 * 5000 + 5000) / 10000) = floor(50005000/10000) = 5000
    expect(roundHalfUpBps(10000n, 5000)).toBe(5000n);
    // half-up boundary: floor((1 * 5000 + 5000) / 10000) = 1
    expect(roundHalfUpBps(1n, 5000)).toBe(1n);
  });

  it('computes the document 37 §15 worked example', async () => {
    const quote = computePricingQuote({
      lines: [
        {
          baseUnitPriceMinor: 18000n,
          modifierUnitTotalMinor: 2000n,
          quantity: 2,
          productDiscountMinor: 4000n,
        },
      ],
      cartDiscountMinor: 3000n,
      deliveryFeeMinor: 2500n,
      loyaltyRequestedMinor: 5000n,
      loyaltyAvailablePoints: 5000n,
      loyaltyPointValueMinor: 1n,
      loyaltyMaxRedemptionBps: 5000,
    });

    expect(quote.merchandiseGrossSubtotalMinor).toBe(40000n);
    expect(quote.afterProductDiscountMinor).toBe(36000n);
    expect(quote.merchandiseNetSubtotalMinor).toBe(33000n);
    expect(quote.payableBeforeLoyaltyMinor).toBe(35500n);
    expect(quote.loyaltyRedeemedMinor).toBe(5000n);
    expect(quote.finalPayableMinor).toBe(30500n);
    expect(quote.minimumOrderEligible).toBe(true);
  });

  it('rejects checkout when below minimum order', async () => {
    const quote = computePricingQuote({
      lines: [
        {
          baseUnitPriceMinor: 1000n,
          modifierUnitTotalMinor: 0n,
          quantity: 1,
        },
      ],
      minimumOrderMinor: 5000n,
    });
    expect(quote.merchandiseNetSubtotalMinor).toBe(1000n);
    expect(quote.minimumOrderEligible).toBe(false);
  });

  it('caps loyalty by rate and available balance', async () => {
    const quote = computePricingQuote({
      lines: [
        {
          baseUnitPriceMinor: 10000n,
          modifierUnitTotalMinor: 0n,
          quantity: 1,
        },
      ],
      loyaltyRequestedMinor: 9000n,
      loyaltyAvailablePoints: 2000n,
      loyaltyPointValueMinor: 1n,
      loyaltyMaxRedemptionBps: 5000, // 50% of 10000 = 5000
    });
    // min(5000 by rate, 2000 by balance) = 2000
    expect(quote.loyaltyRedeemedMinor).toBe(2000n);
    expect(quote.finalPayableMinor).toBe(8000n);
  });

  it('never allows negative merchandise net after oversized cart discount', async () => {
    const quote = computePricingQuote({
      lines: [
        {
          baseUnitPriceMinor: 1000n,
          modifierUnitTotalMinor: 0n,
          quantity: 1,
        },
      ],
      cartDiscountMinor: 5000n,
    });
    expect(quote.merchandiseNetSubtotalMinor).toBe(0n);
    expect(quote.cartDiscountTotalMinor).toBe(1000n);
  });

  it('applies pickup 10% after merchandise net and adds tip after loyalty', async () => {
    const quote = computePricingQuote({
      lines: [
        {
          baseUnitPriceMinor: 10000n,
          modifierUnitTotalMinor: 0n,
          quantity: 1,
        },
      ],
      pickupDiscountBps: 1000,
      tipMinor: 2500n,
      deliveryFeeMinor: 0n,
    });
    expect(quote.pickupDiscountMinor).toBe(1000n);
    expect(quote.payableBeforeLoyaltyMinor).toBe(9000n);
    expect(quote.tipMinor).toBe(2500n);
    expect(quote.finalPayableMinor).toBe(11500n);
  });
});
