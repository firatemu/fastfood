# iyzico Payment, Verification, Cancellation, and Refund

## 1. Provider strategy

iyzico is the V1 online payment provider.

Environment behavior:

- local/dev/test/staging: iyzico sandbox/test credentials,
- production: production credentials stored only in secure environment configuration.

Provider credentials must never be committed to source control.

## 2. Payment abstraction

Application code depends on `PaymentGateway`. The iyzico implementation is an infrastructure adapter.

Domain/order modules must not depend directly on iyzico response DTOs.

## 3. Payment attempt entity

Every attempt should record at least:

- payment attempt ID,
- checkout/order draft reference,
- customer/guest reference,
- amount in minor units,
- currency,
- provider,
- provider token/reference,
- status,
- idempotency key,
- created/updated timestamps,
- verified timestamp,
- sanitized failure code/message,
- provider payload metadata only where safe and required.

Card data must never be stored by FASTFOOD.

## 4. Canonical payment flow

1. Backend validates cart, address, branch, quote, and loyalty reservation.
2. Backend creates a payment attempt.
3. Backend initializes iyzico checkout with server-derived amount and approved return/callback information.
4. Customer completes provider flow.
5. FASTFOOD receives callback/return/webhook signals.
6. Backend verifies payment state with iyzico.
7. Only verified success can move payment to `SUCCEEDED` and the order to the paid/confirmed path.
8. Duplicate callbacks/webhooks must be idempotent.

Implementation note (2026-10-12): steps 3–8 are implemented with the iyzico
Checkout Form and server-side retrieve verification — see ADR-022.

## 5. Redirect rule

A browser or mobile redirect to a success URL is **not proof of payment**.

The customer confirmation UI must query FASTFOOD backend state. It must not mark an order paid based only on query parameters or redirect route.

## 6. Payment states

Canonical states include:

- `CREATED`
- `INITIALIZED`
- `PENDING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`
- `REFUND_PENDING`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

Provider-specific statuses are mapped into canonical project states.

## 7. Refund rules

Refund operations require explicit permission and audit logging.

A refund request must:

- identify the payment/order,
- validate refundable amount,
- use idempotency,
- record actor and reason,
- call provider,
- reconcile provider result,
- update payment/order/refund records,
- trigger loyalty compensation logic if applicable.

## 8. Partial refund

The data model must support partial refunds. V1 UI may limit available scenarios, but backend records cannot assume every refund equals the full payment.

## 9. Provider outage

If verification is temporarily unavailable, the payment/order must remain in a safe pending state. Do not guess success and do not release loyalty reservation until the payment attempt reaches a terminal or timeout-recovery state.

## 10. Reconciliation

A scheduled reconciliation job should identify stale/pending payment attempts and re-query the provider when safe. Manual operations tooling must expose unresolved attempts to authorized users.
