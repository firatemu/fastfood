# ADR-012: Drop BRANCH_ACCEPTED from the order flow

Status: Accepted
Supersedes: ADR-011
Date: 2026-09-23
Decision owners: Human owner (explicit instruction in chat on 2026-09-23)

## Context

ADR-011 collapsed the admin rail to seven steps by removing
`BRANCH_ASSIGNED` from the rail visual. The customer still had to wait
on the branch's "Kabul et" (BRANCH_ACCEPTED) action before the order
could enter PREPARING. A subsequent human-owner instruction made it
explicit that waiting on a separate "accept" step is not the desired
flow: when a customer places an order, branch and payment are already
chosen, the only meaningful next action the branch performs is to start
preparing the order.

The current canonical sequence
(PAID → BRANCH_ASSIGNED → BRANCH_ACCEPTED → PREPARING) inserts two
intermediate admin actions that, in practice, are now unnecessary:
- BRANCH_ASSIGNED is settled at checkout (customer-chosen branch).
- BRANCH_ACCEPTED is an explicit branch acknowledgment that delays
  PREPARING without changing the customer experience.

## Decision

1. BRANCH_ACCEPTED is removed from the canonical happy path. The new
   sequence becomes
   `PAID → BRANCH_ASSIGNED → PREPARING → READY_FOR_COURIER → COURIER_ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED`.

2. The admin OrderFlowRail drops from seven to six visual steps:
   `Ödeme alındı → Hazırlanıyor → Paketlendi → Kurye atandı → Yolda → Teslim edildi`.
   `BRANCH_ASSIGNED` remains a backend transient state but is collapsed
   onto the "Ödeme alındı" step (treated as auto-completed, same model
   ADR-011 used for it).

3. `apps/api/src/modules/order/order-state-machine.ts` updates
   accordingly: `PAID → BRANCH_ASSIGNED → PREPARING` (and from there
   the existing late chain). `BRANCH_ACCEPTED`'s outgoing edges and
   the `BRANCH_ACCEPTED` entry in `ORDER_STATUSES` are removed. The
   `REJECTED` edge from `BRANCH_ASSIGNED` stays for the legacy branch
   refusal path (kitchen discretion).

4. Customer presentation (`apps/api/src/modules/order/customer-order-presentation.ts`)
   must absorb the removal: `BRANCH_ACCEPTED` is no longer a state.
   `PAYMENT_PENDING → PREPARING` flows map to phase index 0 with the
   "Sipariş alındı" label until the order is PREPARING.

5. Admin action labels: the `BRANCH_ACCEPTED: 'Şubeyi kabul et'`
   action in `apps/admin-web/src/app/orders/[orderId]/page.tsx` and
   any other admin surface that surfaces it is removed. Branch refusal
   (REJECTED) and the rest of the transitions stay.

6. `KITCHEN_BOARD_STATUSES` keeps `BRANCH_ASSIGNED` and adds
   `PREPARING` only if it does not already include it. This is
   already true.

7. Event timeline: existing `OrderBranchAccepted` events continue to
   be tolerated in older rows for backward read compatibility; no new
   rows are written. Schema migration does not retroactively purge.

8. Rule is reversible by reintroducing `BRANCH_ACCEPTED` state and
   state-machine edges; no data migration of historical events is
   required for reinstatement.

## Alternatives considered

1. Keep BRANCH_ACCEPTED in the timeline, drop it only from the rail —
   rejected: leaves two parallel event sources (admin transition action
   AND automatic transition) for the same acceptance semantics.
2. Merge BRANCH_ACCEPTED into BRANCH_ASSIGNED altogether — rejected:
   the events carry distinct meaning (branch self-acknowledgment vs.
   system-side assignment); the new model accepts BRANCH_ASSIGNED
   alone.
3. Drop both BRANCH_ASSIGNED and BRANCH_ACCEPTED from the timeline —
   rejected: that contradicts ADR-011's per-step audit decision and
   removes the system-side assignment record used for downstream
   reporting.

## Consequences

- Customers and admins no longer see a separate "Şube kabul etti"
  step. Order flow feels like one continuous chain from payment to
  preparation.
- Branch refusal (REJECTED) remains the only branch-side negative
  flow. Branch operator can still reject the order during PREPARING if
  necessary; admin surfaces keep that path.
- Kitchen board continues to receive orders as soon as they are
  PREPARING; PREP-time SLA does not lose observable signal.
- Historical orders in BRANCH_ACCEPTED status still render in
  `railIndexForStatus` (mapped to index 2, "Hazırlanıyor") so the
  read-only timeline stays coherent.

## Migration plan

Single commit covering: ADR, helper update, state-machine removal, two
admin rail components, customer-presentation update, action labels
removal, kitchen board constant, integration / unit tests.

A subsequent migration to drop the `BRANCH_ACCEPTED` column is
**not** part of this ADR; schema stays intact for backward reads.

## Documents/code affected

- `docs/adrs/ADR-012-order-flow-drop-branch-accept.md` (this file)
- `apps/api/src/modules/order/order-state-machine.ts`
- `apps/api/src/modules/order/order.service.ts` (BRANCH_ACCEPTED,
  BRANCH_ACCEPTED label removal in transitions; historical record
  check)
- `apps/api/src/modules/order/customer-order-presentation.ts`
- `apps/admin-web/src/lib/order-status.ts` (`railIndexForStatus`
  remap, `ORDER_STATUS_LABEL` cleanup, `STATUS_GROUPS`, `KdsLaneId`)
- `apps/admin-web/src/components/ops/order-detail-v2/order-flow-rail.tsx`
- `apps/admin-web/src/components/ops/order-flow-rail.tsx`
- `apps/admin-web/src/app/orders/[orderId]/page.tsx` (ACTION_LABELS
  removal of `BRANCH_ACCEPTED`)
- `apps/admin-web/src/lib/order-status.test.ts`
