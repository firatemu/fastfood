# API, Domain Events, Queues, and Realtime

## 1. REST API

Canonical prefix:

```text
/api/v1
```

OpenAPI documentation is generated from backend definitions and must remain synchronized with implementation.

## 2. API contract rules

- request bodies are validated,
- unknown/invalid values are rejected according to validation policy,
- response envelopes follow document 40,
- timestamps are ISO 8601 UTC,
- canonical money fields use **base-10 integer strings representing minor units** (example: `"12990"` = 129.90 TRY); display strings are presentation-only and never canonical,
- IDs use UUID strings,
- mutations that can safely be retried support idempotency where required.

## 3. Domain events

Domain/application events communicate meaningful business outcomes such as:

- `OrderPaid`
- `OrderBranchAssigned`
- `OrderAccepted`
- `OrderReadyForCourier`
- `CourierAssigned`
- `OrderPickedUp`
- `OrderDelivered`
- `PaymentFailed`
- `RefundCompleted`
- `LoyaltyReservationReleased`

Events use past-tense business language.

## 4. Transactional consistency

When a database mutation and asynchronous side effect must remain consistent, use a transactional outbox pattern or equivalent durable mechanism. Do not publish a critical external event before the transaction is committed.

## 5. BullMQ

BullMQ handles background jobs such as:

- notifications,
- media processing,
- payment reconciliation,
- loyalty expiration,
- stale reservation cleanup,
- report exports,
- non-critical provider retries.

Jobs must define retry policy and idempotency behavior.

## 6. Socket.IO

Realtime channels may include:

- customer order tracking room,
- branch order/kitchen room,
- courier assignment room,
- admin monitoring room.

Joining a room requires server-side authorization. A client must not join arbitrary order rooms by guessing IDs.

## 7. Realtime is not source of truth

On reconnect, clients refetch authoritative state through REST. Missing one WebSocket message must not permanently desynchronize the UI.

## 8. Event versioning

Externally consumed event payloads should include a schema/event version when future compatibility matters. Internal transient events may be simpler but should remain typed.
