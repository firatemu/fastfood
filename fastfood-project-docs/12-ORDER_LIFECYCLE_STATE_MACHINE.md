# Order Lifecycle and State Machine

## 1. Principle

Order status is a state machine, not a free-form field. Transitions are validated by backend policy and produce timeline/audit events.

## 2. Canonical internal states

The V1 state set includes:

- `DRAFT`
- `PAYMENT_PENDING`
- `PAYMENT_FAILED`
- `PAID`
- `BRANCH_ASSIGNED`
- `BRANCH_ACCEPTED`
- `PREPARING`
- `READY_FOR_COURIER`
- `COURIER_ASSIGNED`
- `PICKED_UP`
- `ON_THE_WAY`
- `DELIVERED`
- `REJECTED`
- `CANCELLED`
- `REFUND_PENDING`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

Implementation may separate payment state and order state internally; the API may expose a composed view. An order must never use one ambiguous status to represent unrelated payment and fulfillment facts.

## 3. Typical successful path

```text
DRAFT
  -> PAYMENT_PENDING
  -> PAID
  -> BRANCH_ASSIGNED
  -> BRANCH_ACCEPTED
  -> PREPARING
  -> READY_FOR_COURIER
  -> COURIER_ASSIGNED
  -> PICKED_UP
  -> ON_THE_WAY
  -> DELIVERED
```

Some assignment timing may overlap preparation operationally, but transition rules must remain explicit.

## 4. Transition authorization

Examples:

- Customer cannot mark an order as delivered.
- Courier cannot mark an order as preparing.
- Branch operator cannot arbitrarily mark an unpaid order as paid.
- Finance users cannot change kitchen status unless separately permissioned.

## 5. Event timeline

Every material transition records:

- order ID,
- prior state,
- new state,
- event type,
- actor type/ID when applicable,
- branch ID when relevant,
- courier ID when relevant,
- timestamp,
- correlation/request ID,
- sanitized metadata/reason.

## 6. Cancellation

Cancellation policy depends on order progress and authorization. The backend decides whether cancellation is allowed and whether it requires refund workflow.

Cancellation after successful payment must not simply delete the order.

## 7. Reassignment

Branch reassignment must preserve history. The previous branch must remain visible in an assignment event/log.

Courier reassignment must likewise preserve prior assignment history.

## 8. Terminal states

Terminal or effectively terminal business outcomes include:

- `DELIVERED`
- `CANCELLED`
- `REJECTED`
- `REFUNDED` after applicable flow

Terminal-state changes require explicit compensating workflow rather than silent status rewrites.
