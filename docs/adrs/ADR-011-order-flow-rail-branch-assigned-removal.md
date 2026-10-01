# ADR-011: OrderFlowRail drops BRANCH_ASSIGNED as a visual step

Status: Accepted
Date: 2026-09-23
Decision owners: Human owner (explicit instruction in chat on 2026-09-23)

## Context

`fastfood-project-docs/12-ORDER_LIFECYCLE_STATE_MACHINE.md` §3 documents
the canonical happy path as
`PAID → BRANCH_ASSIGNED → BRANCH_ACCEPTED → PREPARING → ... →
DELIVERED`. The same section reserves the right to collapse intermediate
assignment timing when "some assignment timing may overlap preparation
operationally."

A `BRANCH_ASSIGNED` event remained visible in the admin OrderFlowRail
([apps/admin-web/src/components/ops/order-detail-v2/order-flow-rail.tsx](apps/admin-web/src/components/ops/order-detail-v2/order-flow-rail.tsx))
and ([apps/admin-web/src/components/ops/order-flow-rail.tsx](apps/admin-web/src/components/ops/order-flow-rail.tsx))
even though the customer already chose a branch at checkout — DELIVERY
auto-resolves the serviceable branch and PICKUP requires `pickupBranchId`
(`apps/api/src/modules/checkout/checkout.service.ts` L195-228). The
screenshot of SP00027 demonstrated the visible mismatch: status text
"Şubeye atandı" rendered alongside a fully green rail.

A human owner instruction on 2026-09-23 explicitly asked that the
"şubeye atandı" step be treated as auto-completed in the admin rail —
the customer already selected the branch, so the next meaningful step
the branch is responsible for is "Şube kabul etti".

## Decision

1. `BRANCH_ASSIGNED` is removed from the OrderFlowRail `PRIMARY_STEPS`
   in both admin rail components. The first visual step becomes
   `BRANCH_ACCEPTED`. Total steps go from 8 to 7.
2. `apps/admin-web/src/lib/order-status.ts` exports a new helper
   `railIndexForStatus(status: string): number` that maps every order
   state to a 0..6 index in the new rail. `BRANCH_ASSIGNED` and `PAID`
   both map to `0` (the "Şube kabul etti" step is the next active
   step). Terminal states (`DELIVERED`, `CANCELLED`, `REJECTED`,
   `REFUNDED`) map to `6` so the rail fills completely on completion.
3. The backend state-machine (`apps/api/src/modules/order/order-state-machine.ts`)
   is unchanged. `BRANCH_ASSIGNED` remains a valid transient state
   between `PAID` and `BRANCH_ACCEPTED`. Order events for it still flow
   into the timeline.
4. `KITCHEN_BOARD_STATUSES` and customer-order presentation keep
   treating `BRANCH_ASSIGNED` as a distinct step; admin rail is the
   only surface that drops the visual.
5. Re-enabling the visual step (in case operationally required) is a
   one-line change: re-add the BRANCH_ASSIGNED entry to PRIMARY_STEPS
   and restore the BRANCH_ASSIGNED branch in `railIndexForStatus`.
   No ADR supersedure needed.

## Alternatives considered

1. Drop `BRANCH_ASSIGNED` from the state-machine — rejected: the
   transient state carries domain meaning (branch receipt confirmation)
   that the timeline and outbox events rely on. Removing it would also
   shift the existing event payloads, breaking audit trails.
2. Keep BRANCH_ASSIGNED visible in the rail but mark it as
   auto-completed — rejected: with the customer choosing the branch at
   checkout there is no event-driven completion to display. The
   displayed step would be indistinguishable from "everything is done"
   for several minutes while the branch queue is filling up, which
   matches the bug the user observed.
3. Move `BRANCH_ASSIGNED` to the "alternative branches" lane — rejected:
   the rail uses the alternative lane only for cancellation / rejection /
   refund flows, not for happy-path intermediates.

## Consequences

- SP00027 (and any order stuck in `BRANCH_ASSIGNED`) now renders with
  the first dot active and labelled "Şube kabul etti — bekleniyor".
  The rail fill is no longer a misleading 100%.
- Customer tracker already collapses `BRANCH_ASSIGNED` into
  `BRANCH_ACCEPTED` ("Sipariş alındı") — no customer-visible
  regression.
- The order timeline, kitchen board, and reporting dashboards continue
  to use `BRANCH_ASSIGNED` as a distinct state. No data migration.
- Future scenario: if a fulfilment operator needs to distinguish
  "şubeye atandı" from "şube kabul etti" again, the visual step can
  be reinstated by re-adding the `PRIMARY_STEPS` entry and the
  `railIndexForStatus` branch.

## Migration plan

Single commit covering the ADR, the helper, both rail components, and
the helper unit test. No backend change, no data migration, no schema
change.

## Documents/code affected

- `docs/adrs/ADR-011-order-flow-rail-branch-assigned-removal.md` (this file)
- `apps/admin-web/src/lib/order-status.ts` (`railIndexForStatus` helper)
- `apps/admin-web/src/lib/order-status.test.ts` (helper tests)
- `apps/admin-web/src/components/ops/order-detail-v2/order-flow-rail.tsx`
- `apps/admin-web/src/components/ops/order-flow-rail.tsx`
