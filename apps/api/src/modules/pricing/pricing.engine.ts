/**
 * Canonical pricing engine (document 37).
 *
 * All monetary values are integer minor units (kuruş). No floating-point
 * arithmetic is permitted.
 */

export interface PricingLineInput {
  readonly baseUnitPriceMinor: bigint;
  readonly modifierUnitTotalMinor: bigint;
  readonly quantity: number;
  /** Absolute product/line discount allocated to this line (minor). */
  readonly productDiscountMinor?: bigint;
}

export interface PricingQuoteInput {
  readonly lines: readonly PricingLineInput[];
  readonly cartDiscountMinor?: bigint;
  readonly deliveryFeeMinor?: bigint;
  readonly minimumOrderMinor?: bigint;
  readonly loyaltyRequestedMinor?: bigint;
  readonly loyaltyAvailablePoints?: bigint;
  readonly loyaltyPointValueMinor?: bigint;
  readonly loyaltyMaxRedemptionBps?: number;
  readonly paymentMinChargeMinor?: bigint;
  readonly currency?: string;
  /** Pickup fulfillment discount in basis points of merchandise net (1000 = 10%). */
  readonly pickupDiscountBps?: number;
  readonly tipMinor?: bigint;
}

export interface PricingLineResult {
  readonly configuredUnitGrossMinor: bigint;
  readonly lineGrossMinor: bigint;
  readonly productDiscountMinor: bigint;
}

export interface PricingQuoteResult {
  readonly currency: string;
  readonly merchandiseGrossSubtotalMinor: bigint;
  readonly productDiscountTotalMinor: bigint;
  readonly afterProductDiscountMinor: bigint;
  readonly cartDiscountTotalMinor: bigint;
  readonly merchandiseNetSubtotalMinor: bigint;
  readonly minimumOrderEligible: boolean;
  readonly deliveryFeeMinor: bigint;
  readonly payableBeforeLoyaltyMinor: bigint;
  readonly loyaltyRedeemedMinor: bigint;
  readonly pickupDiscountMinor: bigint;
  readonly tipMinor: bigint;
  readonly finalPayableMinor: bigint;
  readonly lines: readonly PricingLineResult[];
}

/** Approved BURGER HOME pickup merchandise discount (Stitch −%10). */
export const PICKUP_DISCOUNT_BPS = 1000;

/** Half-up rounding for non-negative basis-point rates (document 37 §10). */
export function roundHalfUpBps(baseMinor: bigint, rateBps: number): bigint {
  if (baseMinor < 0n) {
    throw new Error('baseMinor must be non-negative');
  }
  if (rateBps < 0) {
    throw new Error('rateBps must be non-negative');
  }
  return (baseMinor * BigInt(rateBps) + 5000n) / 10000n;
}

const DEFAULT_LOYALTY_POINT_VALUE = 1n;
const DEFAULT_LOYALTY_MAX_BPS = 5000; // 50%
const DEFAULT_PAYMENT_MIN_CHARGE = 100n; // 1.00 TRY development baseline

/**
 * Compute a full checkout quote per document 37 §§2–9.
 */
export function computePricingQuote(input: PricingQuoteInput): PricingQuoteResult {
  const currency = input.currency ?? 'TRY';
  const lines: PricingLineResult[] = input.lines.map((line) => {
    if (line.quantity <= 0) {
      throw new Error('quantity must be positive');
    }
    const configuredUnitGrossMinor = line.baseUnitPriceMinor + line.modifierUnitTotalMinor;
    const lineGrossMinor = configuredUnitGrossMinor * BigInt(line.quantity);
    const productDiscountMinor = line.productDiscountMinor ?? 0n;
    if (productDiscountMinor < 0n) {
      throw new Error('productDiscountMinor must be non-negative');
    }
    return { configuredUnitGrossMinor, lineGrossMinor, productDiscountMinor };
  });

  const merchandiseGrossSubtotalMinor = lines.reduce((acc, l) => acc + l.lineGrossMinor, 0n);
  const productDiscountTotalMinor = lines.reduce((acc, l) => acc + l.productDiscountMinor, 0n);
  const afterProductDiscountMinor =
    merchandiseGrossSubtotalMinor - productDiscountTotalMinor < 0n
      ? 0n
      : merchandiseGrossSubtotalMinor - productDiscountTotalMinor;

  let cartDiscountTotalMinor = input.cartDiscountMinor ?? 0n;
  if (cartDiscountTotalMinor < 0n) {
    throw new Error('cartDiscountMinor must be non-negative');
  }
  if (cartDiscountTotalMinor > afterProductDiscountMinor) {
    cartDiscountTotalMinor = afterProductDiscountMinor;
  }
  const merchandiseNetSubtotalMinor = afterProductDiscountMinor - cartDiscountTotalMinor;

  const minimumOrderMinor = input.minimumOrderMinor ?? 0n;
  const minimumOrderEligible = merchandiseNetSubtotalMinor >= minimumOrderMinor;

  const deliveryFeeMinor = input.deliveryFeeMinor ?? 0n;
  if (deliveryFeeMinor < 0n) {
    throw new Error('deliveryFeeMinor must be non-negative');
  }

  const pickupDiscountBps = input.pickupDiscountBps ?? 0;
  if (pickupDiscountBps < 0) {
    throw new Error('pickupDiscountBps must be non-negative');
  }
  let pickupDiscountMinor =
    pickupDiscountBps > 0 ? roundHalfUpBps(merchandiseNetSubtotalMinor, pickupDiscountBps) : 0n;
  if (pickupDiscountMinor > merchandiseNetSubtotalMinor) {
    pickupDiscountMinor = merchandiseNetSubtotalMinor;
  }

  const tipMinor = input.tipMinor ?? 0n;
  if (tipMinor < 0n) {
    throw new Error('tipMinor must be non-negative');
  }

  const payableBeforeLoyaltyMinor =
    merchandiseNetSubtotalMinor - pickupDiscountMinor + deliveryFeeMinor;

  const loyaltyPointValueMinor = input.loyaltyPointValueMinor ?? DEFAULT_LOYALTY_POINT_VALUE;
  const loyaltyMaxRedemptionBps = input.loyaltyMaxRedemptionBps ?? DEFAULT_LOYALTY_MAX_BPS;
  const paymentMinChargeMinor = input.paymentMinChargeMinor ?? DEFAULT_PAYMENT_MIN_CHARGE;
  const loyaltyAvailablePoints = input.loyaltyAvailablePoints ?? 0n;
  let loyaltyRequestedMinor = input.loyaltyRequestedMinor ?? 0n;
  if (loyaltyRequestedMinor < 0n) {
    throw new Error('loyaltyRequestedMinor must be non-negative');
  }

  const maxLoyaltyByRate = (payableBeforeLoyaltyMinor * BigInt(loyaltyMaxRedemptionBps)) / 10000n;
  const maxLoyaltyByBalance = loyaltyAvailablePoints * loyaltyPointValueMinor;
  let maxLoyaltyRedeemableMinor =
    maxLoyaltyByRate < maxLoyaltyByBalance ? maxLoyaltyByRate : maxLoyaltyByBalance;
  if (maxLoyaltyRedeemableMinor < 0n) {
    maxLoyaltyRedeemableMinor = 0n;
  }

  // Normalize requested redemption down to a whole point value.
  if (loyaltyPointValueMinor > 0n) {
    const wholePoints = loyaltyRequestedMinor / loyaltyPointValueMinor;
    loyaltyRequestedMinor = wholePoints * loyaltyPointValueMinor;
  }

  let loyaltyRedeemedMinor =
    loyaltyRequestedMinor <= maxLoyaltyRedeemableMinor
      ? loyaltyRequestedMinor
      : maxLoyaltyRedeemableMinor;

  let payableAfterLoyaltyMinor = payableBeforeLoyaltyMinor - loyaltyRedeemedMinor;

  // Provider minimum: reduce loyalty until payable >= PAYMENT_MIN_CHARGE (or zero).
  if (payableAfterLoyaltyMinor > 0n && payableAfterLoyaltyMinor < paymentMinChargeMinor) {
    const deficit = paymentMinChargeMinor - payableAfterLoyaltyMinor;
    if (loyaltyRedeemedMinor >= deficit) {
      loyaltyRedeemedMinor -= deficit;
      payableAfterLoyaltyMinor = paymentMinChargeMinor;
    } else {
      // Cannot satisfy min charge via loyalty reduction alone — leave as-is;
      // callers treat this as payment-ineligible (document 37 §9).
      loyaltyRedeemedMinor = 0n;
      payableAfterLoyaltyMinor = payableBeforeLoyaltyMinor;
    }
  }

  const finalPayableMinor = payableAfterLoyaltyMinor + tipMinor;

  return {
    currency,
    merchandiseGrossSubtotalMinor,
    productDiscountTotalMinor,
    afterProductDiscountMinor,
    cartDiscountTotalMinor,
    merchandiseNetSubtotalMinor,
    minimumOrderEligible,
    deliveryFeeMinor,
    payableBeforeLoyaltyMinor,
    loyaltyRedeemedMinor,
    pickupDiscountMinor,
    tipMinor,
    finalPayableMinor,
    lines,
  };
}
