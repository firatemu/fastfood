# Pricing Calculation Contract

## 1. Authority

This document is normative. The pricing engine, checkout UI, payment initialization, order snapshots, refunds, and tests must agree with these formulas.

All monetary calculations use integer minor units (kuruş). No floating-point arithmetic is permitted.

## 2. Per-line calculation

For each configured cart line:

```text
baseUnitPrice = selected variant/base purchasable price
modifierUnitTotal = sum(selected paid modifier unit prices)
configuredUnitGross = baseUnitPrice + modifierUnitTotal
lineGross = configuredUnitGross * quantity
```

Ingredient removals have zero negative price effect in V1 unless a future explicit rule says otherwise.

## 3. Merchandise subtotal

```text
merchandiseGrossSubtotal = sum(lineGross)
```

## 4. Product-level discounts

Eligible product/line discounts are allocated and rounded in integer minor units using deterministic largest-remainder allocation when a discount must be distributed across multiple lines.

```text
productDiscountTotal = sum(product/line discounts)
afterProductDiscount = merchandiseGrossSubtotal - productDiscountTotal
```

## 5. Cart-level discount

Apply eligible cart promotion to the post-product-discount merchandise amount.

```text
cartDiscountTotal = calculated cart discount
merchandiseNetSubtotal = afterProductDiscount - cartDiscountTotal
```

`merchandiseNetSubtotal` cannot be negative.

## 6. Minimum-order check

Minimum order is checked using:

```text
minimumOrderBase = merchandiseNetSubtotal
```

It occurs:

- after product/cart discounts,
- before delivery fee,
- before loyalty redemption.

Rule:

```text
if merchandiseNetSubtotal < branchOrAreaMinimumOrder:
    checkout is not eligible
```

## 7. Delivery fee

```text
deliveryFee = resolved branch/service-area fee after any explicit delivery-fee promotion
payableBeforeLoyalty = merchandiseNetSubtotal + deliveryFee
```

Normal product/cart percentage discounts do not discount delivery fee.

## 8. Loyalty redemption eligibility

V1 loyalty can reduce merchandise and delivery-fee payable amount, but cannot exceed the configured cap.

```text
maxLoyaltyByRate = floor(payableBeforeLoyalty * LOYALTY_MAX_REDEMPTION_BPS / 10000)
maxLoyaltyByBalance = availablePoints * LOYALTY_POINT_VALUE_MINOR
maxLoyaltyRedeemableMinor = min(maxLoyaltyByRate, maxLoyaltyByBalance)
```

Requested redemption is normalized down to a whole point value.

```text
loyaltyRedeemedMinor <= maxLoyaltyRedeemableMinor
finalPayableMinor = payableBeforeLoyalty - loyaltyRedeemedMinor
```

## 9. Provider minimum

If `finalPayableMinor` is greater than zero but below `PAYMENT_MIN_CHARGE_MINOR`, loyalty redemption is reduced until `finalPayableMinor >= PAYMENT_MIN_CHARGE_MINOR`. V1 does not create a zero-payment order through loyalty alone; a future zero-provider-payment path requires an explicit contract/ADR.

`PAYMENT_MIN_CHARGE_MINOR` has a deterministic development baseline of `100` (1.00 TRY). Before production, the payment integration owner must verify iyzico contractual/provider constraints and raise the configured value if necessary. Frontends never guess or independently enforce a different minimum.

## 10. Percentage calculation and rounding

Rates are represented in basis points where project-controlled.

```text
roundedAmount = floor((baseMinor * rateBps + 5000) / 10000)
```

This represents half-up rounding to the nearest minor unit for non-negative values.

If a provider/legal rule requires different rounding, it must be documented and isolated.

## 11. Loyalty earning

Eligible earning base is delivered merchandise net subtotal **excluding delivery fee and excluding the portion refunded**.

```text
earnBaseMinor = deliveredMerchandiseNetSubtotal - refundedEligibleMerchandiseMinor
earnValueMinor = roundHalfUp(earnBaseMinor * LOYALTY_EARN_RATE_BPS / 10000)
earnPoints = floor(earnValueMinor / LOYALTY_POINT_VALUE_MINOR)
```

Points finalize at `DELIVERED` and may later be reversed proportionally by refund.

Loyalty redemption itself does not reduce the earn base: the customer still purchased the merchandise; points are a payment/loyalty value mechanism, not a product discount.

## 12. Order snapshot fields

The order must persist sufficient values to reconstruct:

- merchandise gross subtotal,
- product discounts,
- cart discount,
- merchandise net subtotal,
- delivery fee,
- loyalty redeemed,
- final payable,
- line unit/base/modifier prices,
- promotion allocations where applicable.

## 13. Refund allocation

A refund request specifies an amount and, where product-level partial refund is supported, item allocations.

For full refund:

- provider refund = collected final payable,
- consumed loyalty value is restored according to the original purchase allocation,
- earned loyalty is reversed if it was confirmed.

For partial item refund, use deterministic proportional allocation from the original order snapshot. Do not recalculate the historical order using current catalog prices.

## 14. Tax/fiscal treatment

Customer catalog prices are treated as consumer-facing VAT-inclusive gross prices for V1 commerce calculations. Detailed fiscal invoice/VAT breakout is not implemented as an accounting authority until a fiscal integration specification is approved. Do not invent tax rates in the pricing engine.

## 15. Worked example

Assume:

- burger variant: 18,000 minor = 180.00 TRY
- modifier: 2,000 = 20.00 TRY
- quantity: 2
- product discount: 4,000 = 40.00 TRY
- cart discount: 3,000 = 30.00 TRY
- delivery fee: 2,500 = 25.00 TRY
- loyalty requested: 5,000 = 50.00 TRY

Then:

```text
configuredUnitGross = 18,000 + 2,000 = 20,000
lineGross = 20,000 * 2 = 40,000
merchandiseGrossSubtotal = 40,000
afterProductDiscount = 36,000
merchandiseNetSubtotal = 33,000
minimum order check uses 33,000
payableBeforeLoyalty = 33,000 + 2,500 = 35,500
loyalty cap at 50% = 17,750
requested 5,000 is allowed
finalPayable = 30,500 = 305.00 TRY
```
