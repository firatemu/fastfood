/**
 * Phase 5 cart pricing unit tests (document 37 §3 minimum).
 */
import { describe, expect, it } from 'vitest';

import { CartPricingService } from '../../src/modules/cart/cart-pricing.service.js';

describe('Phase 5 CartPricingService (additive-only minimum)', () => {
  const pricing = new CartPricingService();

  it('returns subtotal of zero for empty cart', async () => {
    const quote = pricing.quote([]);
    expect(quote.subtotalMinor).toBe(0n);
    expect(quote.lines.length).toBe(0);
    expect(quote.currency).toBe('TRY');
  });

  it('computes a single line subtotal as (unit + modifier) * quantity', async () => {
    const quote = pricing.quote([
      { unitPriceMinor: 12990n, modifierDeltaMinor: 500n, quantity: 2 },
    ]);
    expect(quote.subtotalMinor).toBe((12990n + 500n) * 2n);
    expect(quote.lines[0]?.lineSubtotalMinor).toBe((12990n + 500n) * 2n);
  });

  it('computes a multi-line subtotal', async () => {
    const quote = pricing.quote([
      { unitPriceMinor: 12990n, modifierDeltaMinor: 0n, quantity: 1 },
      { unitPriceMinor: 9990n, modifierDeltaMinor: 250n, quantity: 3 },
    ]);
    expect(quote.subtotalMinor).toBe(12990n + (9990n + 250n) * 3n);
    expect(quote.lines.length).toBe(2);
  });

  it('uses the provided currency in the quote', async () => {
    const quote = pricing.quote([], 'USD');
    expect(quote.currency).toBe('USD');
  });

  it('default currency is TRY', async () => {
    const quote = pricing.quote([]);
    expect(quote.currency).toBe('TRY');
  });
});
