# Edge Cases, Failure Modes, and Recovery

## 1. Payment redirect received but provider says pending

Keep customer in pending/processing UI. Poll/refetch backend safely. Do not mark order paid.

## 2. Duplicate provider callback/webhook

Use provider reference/idempotency uniqueness. Reprocessing must not duplicate order, charge state, loyalty spend, or notifications.

## 3. Payment succeeded but client lost network

Backend/provider reconciliation must recover state. On return/reopen, client queries backend using checkout/order reference.

## 4. Loyalty reserved, payment failed

Release reservation exactly once. Balance becomes available again.

## 5. Loyalty reserved, client abandoned checkout

Reservation expires after configured TTL. Cleanup job releases stale reservation if no successful payment owns it.

## 6. Two devices attempt to spend same loyalty balance

Reservation transaction locks/checks available balance atomically. At most the allowed total can be reserved.

## 7. Branch closes between address selection and payment

Before payment initialization, revalidate branch. Re-route if deterministic eligible alternative exists; otherwise block checkout.

## 8. Branch unavailable after verified payment

Create operational exception. Do not charge again. Authorized staff can reassign; otherwise cancel/refund according to policy.

## 9. Two couriers scan same QR

Atomic claim. First valid transaction wins. Second receives `DELIVERY_ALREADY_ASSIGNED`.

## 10. Courier scans expired/tampered QR

Reject with generic claim-invalid response and audit/security metadata as appropriate. Do not reveal internal token details.

## 11. Courier loses connectivity after pickup

App retains current task view. Status changes retry with idempotency on reconnect. Customer tracking falls back to last known status/location.

## 12. GPS permission denied

Courier can continue manual workflow if business policy allows. UI explains live tracking unavailable; backend never fabricates location.

## 13. WebSocket disconnect

Client reconnects and then performs REST refetch. Socket replay is not relied upon as sole source of truth.

## 14. Product price changes while item is in cart

Checkout quote uses current server price. UI presents changed-price notice before payment when material.

## 15. Product becomes sold out while in cart

Checkout validation rejects affected line and tells customer which item/configuration is unavailable.

## 16. Modifier deleted/disabled while in cart

Server rejects or re-quotes line; never silently substitute a different modifier.

## 17. Duplicate order submit

Checkout/payment initialization uses idempotency key. Repeated request returns/reuses the same logical attempt where contract allows.

## 18. Refund callback/result uncertain

Persist refund attempt as pending and reconcile. Never claim refund completed without provider confirmation.

## 19. Admin concurrent status updates

Use state transition validation and record version/transaction semantics. Stale update receives conflict response rather than overwriting newer state.

## 20. Overlapping service polygons with equal priority

Treat as configuration error and block ambiguous automatic routing until corrected or explicitly overridden.

## 21. Redis outage

Canonical records remain intact. Queue/realtime/rate-limit capabilities may degrade. Critical synchronous business correctness relies on PostgreSQL transactions, not Redis-only state.

## 22. Object storage outage

Catalog metadata remains. Uploads fail safely/retry; existing signed/public media availability depends on storage/CDN. Order processing must not corrupt because an image is unavailable.

## 23. Notification provider outage

Persist order normally. Notification job retries according to policy and surfaces failure operationally. Do not roll back order/payment.

## 24. Unexpected provider payload

Map only known fields/statuses. Unknown status does not become success. Log sanitized diagnostic metadata and route to safe pending/error handling.
