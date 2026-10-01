# Cart, Checkout, and Pricing Overview

> The mathematical authority for all calculations is `37-PRICING_CALCULATION_CONTRACT.md`. If this overview and that contract differ, document 37 wins.

## 1. Cart behavior

A cart contains configured cart lines. Each line includes a product, chosen variant if required, selected modifiers, removals, quantity, and server-resolvable identity.

The cart may be stored locally for guest convenience, but every checkout quote is recreated/validated by the backend.

## 2. Server price authority

Frontend applications may calculate an estimated display total for responsiveness. The backend must independently resolve current product configuration and return an authoritative quote.

The client must never submit `finalTotal` and expect the backend to trust it.

## 3. Checkout quote

A quote is generated from:

- cart line configuration,
- resolved branch,
- current catalog prices,
- active promotions,
- delivery fee rules,
- loyalty eligibility,
- current business configuration.

A quote must have an expiry/validity period or a recalculation rule so stale prices are not silently charged.

## 4. Minimum order

For V1, minimum-order eligibility is checked against **merchandise net subtotal after eligible product/cart discounts but before delivery fee and before loyalty redemption**.

Delivery fee never helps satisfy minimum order.

Loyalty redemption never causes an otherwise valid cart to become below minimum order because the check occurs before loyalty redemption.

## 5. Delivery fee

Delivery fee is added after merchandise discount calculation. It is not discounted by product/cart percentage discounts unless a specific promotion explicitly targets delivery fee.

## 6. Loyalty position

Loyalty redemption is applied after discounts and delivery fee according to the exact eligibility cap in document 37.

## 7. Zero-payable orders

V1 does not allow loyalty redemption to reduce the provider payment amount below the configured minimum card-payment threshold. A full zero-value payment flow is not enabled by default.

## 8. Revalidation points

Cart pricing is revalidated at least when:

- opening checkout,
- selecting/changing delivery address,
- branch changes,
- loyalty amount changes,
- immediately before payment initialization.

## 9. Idempotency

Payment initialization and final order creation use idempotency keys to avoid duplicate orders/payment attempts caused by retries.
