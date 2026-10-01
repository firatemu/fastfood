# ADR-013: Admin orders datagrid with inline FSM transitions

Status: Accepted
Date: 2026-09-23
Decision owners: Human owner (explicit instruction in chat on 2026-09-23)

## Context

`apps/admin-web/src/app/orders/page.tsx` renders the operational
orders list via `PremiumTable > OperationalTable` (in
`apps/admin-web/src/components/ops/ops-premium-table.tsx`). The chain
is intentionally minimal: it does not support sorting, column hiding,
or sticky headers, and it does not allow any state-machine action in
place. Operators walk the happy-path for every order by clicking the
row, opening the order detail page, locating the operations panel, and
selecting the next transition there.

A human-owner instruction on 2026-09-23 asked for two things:
1. replace the table with a datagrid tool that supports sorting and
   column manipulation,
2. surface the same state-machine transitions the detail page uses
   directly on the datagrid rows, so an operator can keep the list in
   view while moving an order from `PREPARING` to `READY_FOR_COURIER`
   to `COURIER_ASSIGNED` and so on.

The locked contracts (ADR-012 state-machine, document 32
implementation lock-in, document 39 authorization) all stay in force.
This ADR scopes an admin-frontend datagrid with FSM actions rendered
through the existing `POST /admin/orders/:id/transitions` endpoint.
Courier assignment, branch reassignment, and bulk operations are out
of scope here; each would warrant its own follow-up decision.

## Decision

1. Adopt `@tanstack/react-table ^8.20.0` as the table primitive. Add it
   to `apps/admin-web/package.json` and update the lockfile. The
   package is small (~20 kB gzipped, no React Native / DOM peer
   mismatch) and unblocks sorting, column hiding, sticky headers,
   and headless table logic that the existing `OperationalTable`
   cannot provide without rewriting.

2. Introduce `apps/admin-web/src/components/ops/orders-data-grid.tsx`
   as the datagrid component. It wraps `useReactTable` with
   `getCoreRowModel` and `getSortedRowModel` and renders a `<table>`
   directly. The component owns:
   - column definition (`Sipariş`, `Durum`, `Kanal`, `Müşteri`,
     `Kalem`, `Tutar`, `Ödeme`, `Yaş`, `SLA`, `Fiş`, `Aksiyon`),
   - sticky table header (`<thead>` `position: sticky; top: 0`),
   - row selection checkboxes (re-using the existing
     `ops-table-wrap` styling),
   - the inline FSM dropdown trigger inside the `Durum` cell, keyed
     off `allowedTransitions(order.status)` and rendered with the
     `ACTION_LABELS` map already maintained in the detail page.
   - a per-row SLA chip (age + SLA breach colouring).

3. Wire `apps/admin-web/src/app/orders/page.tsx` to use
   `OrdersDataGrid`. The existing helpers (`openReceipt`,
   `exportCsv`, `goPage`, `selectedIds`) stay; the inline transition
   callback reuses the same `POST /admin/orders/${id}/transitions`
   payload shape and triggers `useOpsSync.markStale()` so the list
   refreshes.

4. Server-side sorting is intentionally deferred — the current
   cursor-based pagination already loads 50 rows at a time and
   client-side sorting covers the operational viewport. The ADR
   records this as a follow-up if operators ask for cross-page
   sorting.

5. The detail page (`apps/admin-web/src/app/orders/[orderId]/page.tsx`)
   keeps its operations panel unchanged; the inline datagrid action
   is an additional surface, not a replacement.

6. `OperationalTable` and `PremiumTable` continue to ship in the
   admin bundle. They back the kitchen, reports, and shipments views
   and are not removed.

## Alternatives considered

1. Replace `OperationalTable` with a different home-grown table —
   rejected: it does not deliver sort/column-hide functionality
   without becoming its own grid library, which `OperationalTable`
   never aimed to be.
2. Adopt `@mui/x-data-grid` — rejected for now: enterprise-ready but
   the project ships a token-driven handcrafted design system
   (ADR-009). Wrapping MUI's theme would amount to building a parallel
   design system, which ADR-007 explicitly forbids for storefront
   and the operations design-token policy discourages for admin.
3. Adopt AG-Grid Enterprise — rejected: licence, weight, and the
   same design-system lock-out.
4. Add inline FSM actions only on a hover-revealed toolbar — rejected:
   the operator already opens the detail page; surfacing the actions
   inline is faster than a hover tooltip and easier to discover.

## Consequences

- Operators stay on the list page to advance an order through the
  happy-path. The detail page is reserved for slower flows
  (refunds, branch reassignment, courier assignment) where richer
  context is needed.
- Selection checkboxes and the existing bulk toolbar continue to work
  via the parent page; the datagrid's `select` column just provides
  the per-row checkbox.
- API load: each transition issues a single `POST .../transitions`
  call, identical to the detail-page flow. No new backend endpoints.
- Backwards compatibility: the existing detail-page path stays
  intact; no contract changes.
- Column hiding and explicit width controls live in the new component
  and follow ops design tokens; previous inline CSS at the call site
  goes away.

## Migration plan

Single release. Steps:

1. Add `@tanstack/react-table` to `apps/admin-web/package.json` and
   update the lockfile.
2. Create `apps/admin-web/src/components/ops/orders-data-grid.tsx`
   with the column set and the inline dropdown.
3. Add a unit test file
   `apps/admin-web/src/components/ops/orders-data-grid.test.tsx`
   that covers the helper layer (`computeAllowedTransitions`,
   `deriveSlaState`). RTL/JSDOM is not configured for admin-web;
   the test targets pure functions only.
4. Refactor `apps/admin-web/src/app/orders/page.tsx` to import and
   render `OrdersDataGrid` instead of `PremiumTable`. Move the
   transition callback into the parent and reuse the existing
   `outbox` / `markStale` plumbing.
5. Run verification gates (prettier, admin-web typecheck, admin-web
   vitest, `pnpm check:customer-platform` smoke).

## Documents/code affected

- `docs/adrs/ADR-013-admin-orders-data-grid.md` (this file)
- `apps/admin-web/package.json`
- `pnpm-lock.yaml`
- `apps/admin-web/src/components/ops/orders-data-grid.tsx`
- `apps/admin-web/src/components/ops/orders-data-grid.test.tsx`
- `apps/admin-web/src/app/orders/page.tsx`
