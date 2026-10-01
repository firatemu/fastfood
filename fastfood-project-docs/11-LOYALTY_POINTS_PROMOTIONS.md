# Loyalty Points and Promotions

## 1. Loyalty model

Loyalty is ledger-based. The customer balance must be explainable from immutable ledger entries plus controlled correction entries. The system must not treat a single mutable `balance` field as the only source of truth.

## 2. Point value

Canonical monetary interpretation is defined in `36-SYSTEM_DEFAULTS_BUSINESS_CONFIG.md`.

V1 baseline:

- points are stored as integer units,
- `100 points = 1.00 TRY`,
- points are never represented as floating point,
- earn rate is configurable,
- redemption cap is configurable.

## 3. Loyalty ledger entry types

At minimum:

- `EARN_PENDING`
- `EARN_CONFIRMED`
- `EARN_REVERSED`
- `REDEMPTION_RESERVED`
- `REDEMPTION_RELEASED`
- `REDEMPTION_SPENT`
- `REDEMPTION_RESTORED`
- `ADJUSTMENT_CREDIT`
- `ADJUSTMENT_DEBIT`
- `EXPIRATION`

## 4. Redemption lifecycle

1. Customer chooses a redemption amount.
2. Backend validates available balance, cap, cart/quote, and minimum payment constraints.
3. Points move into a reservation state associated with the checkout/payment attempt.
4. If payment succeeds, reservation becomes spent.
5. If payment fails, expires, or is safely abandoned, reserved points are released.
6. The operation is idempotent.

The same point units cannot be reserved by two concurrent checkouts.

## 5. Earning lifecycle

Loyalty earning is calculated from the eligible delivered merchandise amount according to document 37.

Points become final only after the order reaches `DELIVERED`. If an order is cancelled before delivery, no earning is confirmed.

## 6. Refund effects

Full and partial refunds must reverse the loyalty value associated with the refunded eligible amount. If points previously used for the purchase are restored, restoration must be proportional and deterministic based on the refund allocation contract.

## 7. Expiration

Point expiration is supported. Expiration jobs must be deterministic, idempotent, and auditable.

## 8. Promotions

V1 architecture supports promotions, but advanced marketing rule composition may be incrementally delivered.

The promotion model may support:

- fixed cart discount,
- percentage cart discount,
- product/category discount,
- coupon code,
- minimum merchandise requirement,
- valid time window,
- branch eligibility,
- customer eligibility,
- usage limits,
- first-order rule,
- delivery-fee promotion.

## 9. Promotion constraints

Every promotion must define whether it can combine with other promotions. If combination is not explicitly allowed, the pricing engine must not stack it.

## 10. Administration

Manual loyalty adjustments require a reason and audit record. Privileged adjustment permissions are separate from ordinary customer-support read access.
