import type { Cart } from './cart';

const KEY = 'ff_payment_summary';

export type PaymentSummarySnapshot = {
  lines: Cart['lineItems'];
  currency: string;
  branchName?: string | null;
  merchandiseGrossSubtotalMinor: string;
  cartDiscountTotalMinor?: string;
  pickupDiscountMinor?: string;
  deliveryFeeMinor?: string;
  tipMinor?: string;
  loyaltyRedeemedMinor?: string;
  finalPayableMinor: string;
};

export function writePaymentSummary(snapshot: PaymentSummarySnapshot): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(KEY, JSON.stringify(snapshot));
}

export function readPaymentSummary(): PaymentSummarySnapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PaymentSummarySnapshot;
  } catch {
    return null;
  }
}
