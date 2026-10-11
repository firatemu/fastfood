# 15 — Admin surface redesign plan (from-scratch rebuild)

Status: `ACTIVE`
Authorization: explicit human-owner instruction, 2026-10-07 session
Scope lock: human owner selected **all 32 routes**, 2026-10-07 — purge the A2–A8
reference set of its residual legacy declarations first, then build the 11
uncovered routes from scratch.
Design system: ADR-019 (`docs/adrs/ADR-019-admin-visual-system-navy.md`)
Design authority: `03_ADMIN_DESIGN_FOUNDATION.md`
Status record: `PROJECT_STATUS.md`

## 1. Authorization and scope

The human owner instructed, in session, that every page whose design has **not**
been renewed must now be renewed, and stated four binding rules:

1. The menu's un-renewed pages **and every surface reachable from them** — detail
   routes, popups, drawers, dialogs — are in scope. A page is not done when only
   its list view is done.
2. **Before** a page is designed, the backend it reads must be studied: schema
   tables, relations, the service/DTO layer, the permission layer, and the money
   and timezone contracts. The frontend is then designed _for that structure_.
3. Existing pages are **deleted**. A renewed page may never keep an influence of
   the old design. Appended override blocks on a legacy stylesheet are a
   migration aid, not a finished page.
4. Renewed pages must match the design language of the pages already renewed in
   A2–A8, which are the reference set. Design integrity across all pages is
   mandatory.

## 2. Two modes of work — do not confuse them

| Mode                  | What it is                                                                                                                                        | Status                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Migration** (A1–A8) | A `[data-admin-theme='fastfood-navy']` block appended to the legacy stylesheet. The legacy cascade still supplies every un-overridden property.   | Complete. Serves as the reference set and as the fallback layer. |
| **Rebuild** (A9+)     | The page is deleted and written from scratch against the backend, with its own stylesheet authored in the Navy system from the first declaration. | This plan.                                                       |

Every A9 page is a rebuild. Rule 3 forbids finishing an A9 page by appending a
Navy block to the file being replaced.

## 3. Reference set — the design language to match

These are renewed and are the authority for look and feel. Read them before
authoring a new page.

- Frame sources (design set): `stitch_fastfood_admin_dashboard_prompts/*/screen.png`
  and `code.html`. Token values come from the `code.html` Tailwind `theme.extend`
  block only.
- Shell: `styles/admin-sidebar.css`, `styles/admin-ops.css`
- Tokens: `styles/admin-fastfood-tokens.css`
- List grammar (A7/A8 reference): `app/catalog/products/products.module.css`,
  `app/users/users.module.css`
- Detail grammar: `app/customers/[userId]/customer-detail.module.css`,
  `app/dashboard.module.css`
- High-density operational grammar: `app/kitchen/kitchen.module.css`

Binding conventions of the reference set:

- Panel = `surface-container-low` + `shadow-sm`, no heavy border.
- Table header is a **label role**, not a title — 11–12px, mono face, uppercase,
  muted. Rows are 48px, separated by `divide-y`, never zebra.
- Identifiers, order numbers, amounts and counts use the mono face.
- Status is a badge with a dot, in the palette's status ramp, never raw colour.
- Shape scale is 2/4/8/12px only. Spacing is `--ff-space-xs|sm|md|lg|xl`.
- No gradients, no glow, no decorative pseudo-elements, no invented controls.
  `ADR-019` §7 forbids fake data; a control that has no backend is not rendered.

## 4. Inventory

Menu authority: `src/lib/admin-nav.ts` — 23 entries in six sections.

### 4.1 Renewed (reference set)

`/` · `/orders` + `/orders/[orderId]` · `/kitchen` · `/couriers` ·
`/branches/availability` · `/catalog/products` · `/catalog/categories` ·
`/catalog/modifiers` · `/catalog/allergens` · `/catalog/home-slides` ·
`/branches` · `/customers` + `/customers/[userId]` · `/loyalty` · `/promotions` ·
`/payments` · `/users` · `/roles` · `/invite/confirm-email`

### 4.2 To rebuild — 11 routes, in execution order

| #   | Route                       | Own stylesheet     | Overlay layer            | State             |
| --- | --------------------------- | ------------------ | ------------------------ | ----------------- |
| 1   | `/login`                    | `login.module.css` | —                        | **done A9-1**     |
| 2   | `/access-denied`            | none               | —                        | **done A9-2**     |
| 3   | `/catalog`                  | none               | —                        | **redirect only** |
| 4   | `/branches/service-areas`   | none               | —                        |
| 5   | `/branches/[branchId]`      | none               | `ConfirmDialog` (shared) |
| 6   | `/payments/[paymentId]`     | none               | `ConfirmDialog` (shared) |
| 7   | `/promotions/[promotionId]` | none               | `ConfirmDialog` (shared) |
| 8   | `/refunds`                  | none               | `ConfirmDialog` (shared) |
| 9   | `/reports`                  | none               | —                        |
| 10  | `/audit`                    | none               | —                        |
| 11  | `/settings`                 | none               | `ConfirmDialog` (shared) |

### 4.3 Overlay layer — already renewed, verified

The shared and page-local overlays of the reference set are already inside the
Navy scope and are **not** in scope for this plan:

- Shared, scoped in `styles/admin-ops.css`: `.ops-dialog`, `.ops-drawer`
  (incl. `__scrim`, `__panel`, `__head`, `__eyebrow`, `__close`, `__body`),
  `.ops-receipt-modal`, `.orders-timeline-modal`, `.ops-confirm-overlay`,
  `.ops-confirm-panel`.
- Page-local, inside renewed modules: `ProductDrawer` (`catalog/products`),
  `CourierCreateDialog` (`couriers`), `PasswordDialog` (`couriers`), and the
  inline `<dialog>` surfaces in `users`, `branches/availability`,
  `catalog/allergens`.

Rule 1 still applies: a rebuilt page must use this overlay layer, not a private
one. If a rebuilt page needs a surface the layer lacks, the layer is extended —
once, for all callers.

## 5. Per-page protocol

Each route runs the same five steps. Step 1 is not optional and is not a code
change.

1. **Backend study.** Read, and record the findings in the page file's header
   comment:
   - `apps/api/prisma/schema.prisma` — every model the page reads, its relations,
     its unique keys, its state enums, and every FK that makes a list query a
     join or an N+1.
   - the API controller and service behind the page's requests, for the real
     filter, sort and pagination contract;
   - the permission layer — `adminPagePermission` keys the route resolves to,
     and the action codes the UI must gate;
   - `packages/contracts`, `packages/domain-types`, `packages/validation` — the
     response shape the page may rely on;
   - the money contract — minor units as `BigInt`, never a float; and the
     timezone contract — UTC storage, `Europe/Istanbul` business day.
     If the backend turns out not to support what the design wants, the design
     changes. The backend is not bent to fit a mockup.
2. **Design.** Decide the information hierarchy the backend actually supports,
   then author `*.module.css` from the first declaration in the Navy system. No
   property is inherited from the file being replaced.
3. **Implement.** Write the page against the studied contract.
4. **Delete.** Remove the replaced page and its stylesheet. Nothing from the old
   surface may survive, including class names that happen to look reusable.
5. **Verify.** Gates in §6, then record the route in `PROJECT_STATUS.md` and in
   the table in §4.2.

## 6. Verification gates

The build gate (`tsc`, `eslint`, `next build`) is **closed** — `package.json`
requires `pnpm >=12.4.0 <13`, the machine has 11.5.0 and the 12.4.0 store path is
absent, and the repo is on a `W:` mount where pnpm symlink targets do not
resolve. Installing 12.4.0 is a dependency change and needs owner approval
(`AGENTS.md` §6). Until it opens, every route runs this substitute set, and each
route is reported with the gap stated rather than claimed as type-checked:

| Gate            | Check                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Format          | `prettier --check` on every touched file                                                                    |
| Dead selectors  | every class in a Navy block exists in that file's own vocabulary                                            |
| Token integrity | every `var(--ff-*)` used is defined in `admin-fastfood-tokens.css`                                          |
| Comment balance | no orphaned `*/`, no unclosed `/*`                                                                          |
| Corruption      | no `[object Object]`, `undefined`, `NaN`; LF endings, no BOM                                                |
| Type syntax     | TypeScript `transpileModule` per touched `.tsx` — catches syntax and parse errors without module resolution |
| Contracts       | no `any`, no `@ts-ignore`, no invented field names; identifiers checked against the studied DTO             |

## 7. Design integrity rules for this plan

- One scale, one spacing ramp, one shape scale, one type system across all
  pages. A new page may not introduce a second value for any of them.
- New shared components are added to the shared layer with their consumers, not
  forked into a page.
- Light mode remains available as the derived layer defined in ADR-019 §5. A
  rebuilt page must work in both; no page may hard-code a mode.
- A rebuilt page states in a header comment which reference pages it follows, so
  later audits can verify consistency mechanically.
