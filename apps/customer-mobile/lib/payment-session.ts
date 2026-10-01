import type { CartLine, CheckoutQuote } from './schemas';

export type PaymentSummarySnapshot = {
  checkoutSessionId: string;
  lines: CartLine[];
  currency: string;
  branchName?: string | null;
  merchandiseGrossSubtotalMinor: string;
  cartDiscountTotalMinor?: string;
  pickupDiscountMinor?: string;
  deliveryFeeMinor?: string;
  tipMinor?: string;
  loyaltyRedeemedMinor?: string;
  finalPayableMinor: string;
  providerPaymentId?: string | null;
  redirectUrl?: string | null;
};

let snapshot: PaymentSummarySnapshot | null = null;

export function writePaymentSummary(next: PaymentSummarySnapshot): void {
  snapshot = next;
}

export function readPaymentSummary(): PaymentSummarySnapshot | null {
  return snapshot;
}

export function clearPaymentSummary(): void {
  snapshot = null;
}

export function rememberCheckoutSessionId(id: string): void {
  if (!snapshot) return;
  snapshot = { ...snapshot, checkoutSessionId: id };
}

export function snapshotFromQuote(quote: CheckoutQuote, lines: CartLine[]): PaymentSummarySnapshot {
  return {
    checkoutSessionId: quote.checkoutSessionId ?? '',
    lines,
    currency: quote.currency,
    branchName: quote.branchName,
    merchandiseGrossSubtotalMinor: quote.merchandiseGrossSubtotalMinor,
    cartDiscountTotalMinor: quote.cartDiscountTotalMinor,
    pickupDiscountMinor: quote.pickupDiscountMinor,
    deliveryFeeMinor: quote.deliveryFeeMinor,
    tipMinor: quote.tipMinor,
    loyaltyRedeemedMinor: quote.loyaltyRedeemedMinor,
    finalPayableMinor: quote.finalPayableMinor,
  };
}
