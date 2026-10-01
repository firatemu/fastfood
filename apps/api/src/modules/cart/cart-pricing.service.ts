import { Injectable } from '@nestjs/common';

/**
 * Phase 5 cart pricing service (document 37 §3 minimum).
 *
 * Computes an additive-only minimum quote per cart line items:
 *   lineSubtotalMinor = (variantUnitPrice + Σ modifierDelta) * quantity
 *   subtotalMinor = Σ lineSubtotalMinor
 *
 * Phase 6 wires the full pricing formula (loyalty redemption,
 * discounts, delivery fee, minimum-order check, rounding).
 */

export interface CartPricingLine {
  unitPriceMinor: bigint;
  modifierDeltaMinor: bigint;
  quantity: number;
}

export interface CartPricingQuote {
  currency: string;
  subtotalMinor: bigint;
  lines: { lineSubtotalMinor: bigint }[];
}

@Injectable()
export class CartPricingService {
  /**
   * Compute the additive-only minimum quote for the given cart lines.
   * All values are returned as BigInt; the API layer serializes them
   * to base-10 integer strings per document 40 §2.
   */
  quote(lines: CartPricingLine[], currency: string = 'TRY'): CartPricingQuote {
    const lineSubtotals = lines.map((l) => {
      const perUnit = l.unitPriceMinor + l.modifierDeltaMinor;
      return perUnit * BigInt(l.quantity);
    });
    const subtotalMinor = lineSubtotals.reduce((acc, v) => acc + v, 0n);
    return {
      currency,
      subtotalMinor,
      lines: lineSubtotals.map((s) => ({ lineSubtotalMinor: s })),
    };
  }
}
