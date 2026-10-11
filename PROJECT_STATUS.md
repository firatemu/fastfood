# FASTFOOD Project Status

This file is the concise, current status source for humans, AI agents, and the
Autonomous Development Controller. Historical phase-by-phase narration was
removed from the active repository after technical completion; the surviving
final reports are linked below.

Canonical phase numbering follows
`fastfood-project-docs/23-ROADMAP_PHASES_DEFINITION_OF_DONE.md` and ADR-003:

- Phase 0: documentation and implementation lock.
- Phase 1: repository foundation.
- Phases 2–10: the canonical implementation roadmap.

## Current state

| Field                                        | Value                                    |
| -------------------------------------------- | ---------------------------------------- |
| **Current mode**                             | `FULL_PROJECT_AUTONOMOUS_DEVELOPMENT`    |
| **Deployment**                               | `PROHIBITED / DEFERRED`                  |
| **Production**                               | `NOT ACTIVE`                             |
| **Owner VPS environment (ADR-021)**          | `AUTHORIZED / SANDBOX PROVIDERS`         |
| **Project autonomous execution**             | `AUTHORIZED`                             |
| **Human acceptance deferred to final gate**  | `NO`                                     |
| **Autonomous execution**                     | `ARMED`                                  |
| **Autonomous controller**                    | `INSTALLED / VALIDATED / HUMAN ACCEPTED` |
| **Phase 0 status**                           | `ACCEPTED / CLOSED`                      |
| **Phase 0 human acceptance**                 | `PASS`                                   |
| **Phase 1 status**                           | `ACCEPTED / CLOSED`                      |
| **Phase 1 authorization**                    | `NOT AUTHORIZED`                         |
| **Phase 1 human acceptance**                 | `PASS`                                   |
| **Phase 2**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 2 authorization**                    | `AUTHORIZED`                             |
| **Phase 2 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 2 ready for next phase**             | `YES`                                    |
| **Phase 3**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 3 authorization**                    | `AUTHORIZED`                             |
| **Phase 3 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 3 ready for next phase**             | `YES`                                    |
| **Phase 4**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 4 authorization**                    | `AUTHORIZED`                             |
| **Phase 4 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 4 ready for next phase**             | `YES`                                    |
| **Phase 5**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 5 authorization**                    | `AUTHORIZED`                             |
| **Phase 5 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 5 ready for next phase**             | `YES`                                    |
| **Phase 6**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 6 authorization**                    | `AUTHORIZED`                             |
| **Phase 6 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 6 ready for next phase**             | `YES`                                    |
| **Phase 7**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 7 authorization**                    | `AUTHORIZED`                             |
| **Phase 7 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 7 ready for next phase**             | `YES`                                    |
| **Phase 8**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 8 authorization**                    | `AUTHORIZED`                             |
| **Phase 8 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 8 ready for next phase**             | `YES`                                    |
| **Phase 9**                                  | `TECHNICALLY COMPLETE`                   |
| **Phase 9 authorization**                    | `AUTHORIZED`                             |
| **Phase 9 human acceptance**                 | `DEFERRED_UNTIL_PROJECT_COMPLETION`      |
| **Phase 9 ready for next phase**             | `YES`                                    |
| **Phase 10**                                 | `TECHNICALLY COMPLETE`                   |
| **Phase 10 authorization**                   | `AUTHORIZED`                             |
| **Phase 10 human acceptance**                | `REQUIRED - FINAL PROJECT HUMAN GATE`    |
| **Full project technically complete**        | `YES`                                    |
| **Autonomous development complete**          | `YES`                                    |
| **Human test required**                      | `YES`                                    |
| **Human acceptance required**                | `YES`                                    |
| **Human acceptance**                         | `NOT GRANTED`                            |
| **Controller gate**                          | `FINAL_PROJECT_HUMAN_GATE`               |
| **Controller work-item state**               | `HUMAN_REVIEW_REQUIRED`                  |
| **FINAL_HUMAN_TEST**                         | `PAUSED_FOR_UI_MATURATION`               |
| **ADR-010** (Phone OTP askıda — register)    | `ACCEPTED / ACTIVE`                      |
| **ADR-019** (Admin visual — Navy design set) | `ACCEPTED / A1_PUBLISHED`                |
| **ADMIN_VISUAL_NAVY_MIGRATION**              | `A9_GATE_GREEN / HUMAN_GO_PENDING`       |
| **OPERATIONS_DESIGN_SYSTEM**                 | `TECHNICALLY_COMPLETE`                   |
| **ADMIN_UI_TRANSFORMATION**                  | `TECHNICALLY_READY_FOR_HUMAN_QA`         |
| **STOREFRONT_UI_TRANSFORM**                  | `TECHNICALLY_READY_FOR_HUMAN_QA`         |
| **MOBILE_UI_TRANSFORM**                      | `TECHNICALLY_READY_FOR_HUMAN_QA`         |
| **CUSTOMER_CROSS_PLATFORM_SYNC**             | `TECHNICALLY_COMPLETE`                   |
| **Next authorized repository task**          | `ADMIN_VISUAL_NAVY_A9_COMPLETE`          |

## Active objective

Canonical Phases 0–10 are technically complete. The repository is stopped at
the final human gate. The next work is human visual/functional QA of the local
development surfaces, beginning with the Admin / Operations surface. Only the
human owner may record final acceptance.

Current QA packs:

- Admin: `docs/admin-rebuild/12_ADMIN_HUMAN_QA_CHECKLIST.md`
- Storefront: `docs/storefront-rebuild/15_HUMAN_QA_CHECKLIST.md`
- Customer mobile: `docs/mobile-rebuild/12_HUMAN_QA_CHECKLIST.md`
- Cross-surface plan: `project-reports/final/FULL_PROJECT_HUMAN_TEST_PLAN.md`

Current technical summary:

- `project-reports/final/FULL_PROJECT_AUTONOMOUS_COMPLETION_REPORT.md`

## Admin visual migration (ADR-019)

The human owner authorized replacing the Admin visual design set with the
`stitch_fastfood_admin_dashboard_prompts/` design set on 2026-10-06. ADR-009 is
superseded by ADR-019; both records are retained.

Completed in A1 (design foundation only, no page changed):

- `docs/adrs/ADR-019-admin-visual-system-navy.md` — accepted
- `docs/admin-rebuild/03_ADMIN_DESIGN_FOUNDATION.md` — rewritten for the Navy system
- `apps/admin-web/src/styles/admin-fastfood-tokens.css` — new `fastfood-navy` scope
- `apps/admin-web/src/app/layout.tsx` — Plus Jakarta Sans added, token file imported
- `stitch_fastfood_admin_dashboard_prompts/*/DESIGN.md` — marked deprecated

A2 complete on 2026-10-06. The application shell was rebuilt to the Navy metrics
and the whole Admin surface now resolves tokens from the `fastfood-navy` scope:

- `admin-sidebar.css` / `admin-ops.css` selectors widened to
  `:is(kitchen-fleet, fastfood-navy)`
- Navy overrides appended to `admin-sidebar.css` (imported last, so they win)
- `data-admin-theme` moved to `fastfood-navy` at all four call sites
- collapsible rail retired: `NAV_COLLAPSE_*`, `toggleNavCollapse`,
  `data-nav-collapsed` and the collapse button were removed
- sidebar is now a fixed 288px column, header 56px, sub-bar 40px

The retired `stitch_burger_admin/` package was copied to
`backups/2026-10-06-adr019/stitch_burger_admin.bak` and removed from the repo.

A3 complete on 2026-10-06. The Siparişler golden route was migrated against
`stitch_fastfood_admin_dashboard_prompts/sipari_ler_fastfood/code.html`:

- `orders-data-grid.module.css` — Navy override block appended (60 rules). The
  design uses `divide-y` row separation instead of zebra striping, a 36px
  monospaced header, and a solid `primary-container` accent on the order
  number. 26 targeted selectors, all verified to exist in the module.
- `admin-ops.css` — orders page chrome: context bar, 6-column KPI grid, filter
  toolbar, and the global action-menu eyebrow class.
- all 26 targeted classes verified present; no dead selectors introduced

Human-owner decisions recorded 2026-10-07:

- **The dark/light toggle stays.** Navy therefore ships a light mode. The
  design set is dark-only, so the light ramp is **derived** (surface ramp
  inverted, Navy hues kept) and is marked as such in the token file, the
  foundation document and ADR-019 decision 5. ADR-019 was amended, not
  replaced.
- **The sidebar bottom card was removed.** No shift data exists, and ADR-019
  decision 7 forbids faking unsupported controls. The collapse footer DOM was
  already gone from A2; the six remaining CSS rules scoped to
  `data-nav-collapsed`, `.ops-side__footer` and `.ops-side__collapse` were
  purged as dead. `admin-sidebar.css` shrank from 1073 to 896 lines.

Accessibility: measured WCAG contrast before shipping the derived palette.
Light mode passes 9/9 pairs. Dark mode shipped as-designed passed 8/9 —
`secondary-container` `#bb0112` reaches only 2.55:1 against
`surface-container-low` and must not be used as a foreground. Text-safe
`--ff-status-*-text` variants were added and the legacy `--ops-*` aliases
re-pointed at them; all five status colours now measure 5.2:1 or better in
both modes.

A4, A5 and A6 complete on 2026-10-07. All four golden routes now resolve from
the Navy design:

- **A4 Sipariş Detayı** (`/orders/[orderId]`) — 49 Navy rules appended to
  `admin-ops.css`. Panels moved from `minmax(280px, 360px) 1fr` to the design's
  12-column grid (side 5 / main 7), cards lost their border in favour of
  `shadow-sm`, avatar shrank 56px → 36px, and `order-detail-v2__column--side`
  / `--main` were given their first grid placement rules.
- **A5 Mutfak Ekranı (KDS)** (`/kitchen`) — 47 Navy rules appended to
  `kitchen.module.css`. The design removes the 3px stage bars from the lane
  head and ticket; stage identity moved to the lane icon and quantity chip.
- **A6 Bugünün Operasyonu** (`/`) — 71 Navy rules appended to
  `dashboard.module.css`. Legacy hero gradient wash and KPI accent bars are
  suppressed; the KPI grid follows the design's 2/3/6 responsive columns.

Every appended block was checked against its stylesheet before commit; no dead
selectors were introduced.

Remaining scope (A7+), measured not guessed — 18 CSS modules still carry ~2,190
`light-dark()` calls bound to the retired palette:

`products` (317), `branches` (236), `users` (233), `modifiers` (187),
`categories` (176), `customers` (168), `loyalty` (147), `promotions` (137),
`allergens` (122), `availability` (102), `customer-detail` (84), `payments`
(71), `order-items-dialog` (54), `roles` (47), `couriers` (39),
`column-visibility-menu` (31), `invite` (27), `home-slides` (10).

A7 catalog group complete on 2026-10-07 — 313 additional Navy rules, zero dead
selectors:

- `/catalog/products` — 62 rules against `r_nler_fastfood`. The legacy bordered
  summary strip became four independent `surface-container-low` cards on a gap
  grid, table gradients and zebra were dropped for `divide-y`, and KPI values
  moved to the mono face as the design specifies.
- `/catalog/categories` — 48 rules against `kategoriler_fastfood`. Production keeps
  a table because the hierarchy needs sortable columns; the design language is
  applied to the existing structure rather than reshaping the DOM, which is
  outside A7. The segmented view control, search well, mono slug/count columns
  and status badges carry over directly.
- `/catalog/modifiers`, `/catalog/allergens`, `/catalog/home-slides` — no
  dedicated frame exists for these. They inherit the catalog language from the
  Ürünler design, applied through a shared block that is pruned **per selector**
  so each file only receives rules for classes it actually defines.

A8 identity/finance group complete on 2026-10-07 — 454 additional Navy
rules across 13 modules, zero dead selectors and zero undefined `--ff-*` token
references:

- Shared block `navy-a8-shared` applied to all 13 modules (`users`, `branches`,
  `availability`, `customers`, `customer-detail`, `loyalty`, `promotions`,
  `payments`, `couriers`, `roles`, `invite`, `order-items-dialog`,
  `column-visibility-menu`). None of these screens has a frame in the design set,
  so they inherit the list-page grammar established by the catalog screens in A7:
  label-role headers, `divide-y` rows instead of zebra, mono identifiers,
  `surface-container-low` panels with `shadow-sm`, 2/4/8/12px shape scale.
- Domain blocks applied to `roles`, `invite`, `order-items-dialog`,
  `column-visibility-menu` and `customer-detail`, where the surface is a
  permission matrix, a form, a dialog or a detail record rather than a list.
- Both blocks are marker-delimited (`/* @block:navy-a8-shared */`,
  `/* @block:navy-a8-domain */`) so a re-application replaces only its own section
  instead of the whole Navy area.

CSS integrity defect found and repaired during A8. The first application pass left
an orphaned `*/` comment tail in 10 of the 13 modules: the pruner treated each
block's leading comment as part of the first selector, so class names quoted in
comment prose (`gridPanel`, `sortMark`, ...) were checked against the target
stylesheet, the rule carrying that comment was dropped, and it took the comment's
`/*` with it. The modules were cut back to a navy-free baseline and re-applied
with a comment-aware pruner; all 13 files now report balanced comments and every
marker is present exactly once.

Every one of the 21 CSS modules in `apps/admin-web/src` carries a Navy block.
Eleven routes import no CSS module of their own: `login`, `access-denied`,
`reports`, `audit`, `settings`, `refunds`, `payments/[paymentId]`,
`promotions/[promotionId]`, `branches/[branchId]`, `branches/service-areas`,
`catalog`. That fact was initially read as "no Navy styling", which was wrong — see
the A9-4 … A9-8 entry below for the corrected measurement and what it changed. The
valid scope test is whether a route's classes fall outside the shared Navy layer in
`styles/admin-ops.css`, not whether it owns a module. Note also that `light-dark()`
call counts are no longer a progress metric: the Navy blocks override the retired
palette by scope, they do not replace it.

Scope locked by the human owner on 2026-10-07. The instruction carries four
binding rules: menu pages and every surface reachable from them are in scope; the
backend must be studied before a page is designed and the frontend written from
scratch for that structure; the replaced page is deleted and may keep no
influence of the old design; the renewed pages are the reference for look.

Measurement found the reference set is not yet free of the old design: **318
legacy declarations survive outside the Navy scope** across 20 modules. The first count
used a narrow colour list and missed transposed variants such as `#a0750d`;
the corrected detector matches the amber/gold family, the old blue text family,
the Anton display face and any gradient. Heaviest: `dashboard` (60),
`branches` (25), `catalog/products` (24), `users` (21), `catalog/categories`
(19). This is an upper bound — part of it is already overridden by a Navy rule
on the same selector and property, and is deleted rather than re-authored. Building the 11 uncovered routes on that basis would have
propagated the old design into the new pages, contradicting the instruction. The
owner therefore chose the full scope: purge the reference set first, then build
the remaining routes.

Phase B0 — purge, then rebuild. For every stylesheet, a legacy declaration is
either **dead** (the Navy block already overrides that property on that selector,
so the legacy line is deleted outright) or **live** (no Navy rule covers it, so a
Navy token value is authored for it). Nothing is patched by appending another
override. Additionally, renewed pages do not import `@fastfood/ui-web` primitives:
that package is the retired design system (`ff-btn`, `--space-*`,
`@fastfood/design-tokens`, zero Navy), so importing it would reintroduce the old
design by the back door. Form and button primitives for renewed pages are
authored on `--ff-*` tokens; the shared overlay layer in `admin-ops.css`
(`.ops-dialog`, `.ops-drawer`, `.ops-receipt-modal`,
`.orders-timeline-modal`) is already Navy-scoped and is reused rather than forked.

Plan of record: `docs/admin-rebuild/15_ADMIN_REDESIGN_PLAN.md`.

B0 first pass, 2026-10-07 — legacy residue **318 → 119**.

Two structural defects were found and fixed:

- **The A8 invite block never rendered.** `invite.module.css` scoped its Navy block
  to `[data-admin-theme='fastfood-navy']`, but `components/admin-shell.tsx` renders
  `/invite/*` **outside** `OpsShell`, and that attribute is only set inside
  `OpsShell`. Every rule on the route was unreachable, so
  `/invite/confirm-email` was still 100% retired design — Anton face, gold
  gradients, old blue text. The route was rebuilt from scratch in plain class
  selectors and is now clean.
- **Orphaned comment tails** in `catalog/modifiers` and `catalog/allergens`,
  left by the A7 application: the block's leading comment had lost its `/*` and
  only its `*/` remained. Prettier passed these files; a browser would have
  discarded the stylesheet from that point.

Work applied: `dashboard.module.css` authored out declaration by declaration
(38 edits, 60 hits cleared); a 36-entry value table substituted across all
modules (104 substitutions — local `--amber` / `--muted` / `--green` variable
definitions, the `--ops-font-anton` display face, old blue text, amber borders and
focus rings); 38 dead rules removed from `users` and `branches`, where 19 classes
(`categoryLink`, `relationRow`, `parentChild`, `dataHint`…) had leaked in from
the categories page and were unreachable because CSS Modules scope names per
file.

One self-inflicted corruption was caught and reversed: the first value-purge run
masked the Navy blocks with NUL bytes and wrote the masked text to disk, blanking
19 stylesheets. All 21 modules were restored from
`backups/2026-10-06-adr019/b0-pre-valuepurge` and the purge was re-run with the
Navy blocks held aside as text instead.

Gates after this pass: `prettier --check` exit 0 across all 21 modules, comment
balance 21/21, no NUL bytes, LF endings, no BOM.

Measurement caveat that shaped the tooling: dead-rule detection must treat a CSS
class as used when it appears as a **word** anywhere in the module's consumers.
`app/couriers/page.tsx` binds `metricReady` through a string table and applies
it via a computed `styles[...]` access, so a `styles.metricReady` text search
misses it and prunes a live rule. Consumers also live outside the module's own
directory — `catalog/products/products.module.css` is consumed by
`components/ops/products-data-grid.tsx` — so directory-scoped discovery is wrong.

B0 second pass, 2026-10-07 — legacy residue **318 → 78**. Fourteen modules now
pass every gate outright; the remaining 78 sit in 14 files at one to fifteen
declarations each and are almost entirely `background` gradients that each need
a per-selector decision (panel wash vs. active-segment fill vs. decorative
pseudo-element). They are deliberately not table-driven: a mechanical mapping
would guess at the role, and the plan requires an authored Navy value.

One deliberate exception is recorded: `home-slides` keeps `.previewShade`, a
scrim over the slide preview image. It is a legibility device, not decoration,
and removing it would put body copy on an unreadable photograph.

A second self-inflicted defect was caught and reversed here. The round-two
substitution table converted `font: 400` to `font: 800` by pattern, intending to
fix the retired Anton display face — but the pattern was not anchored to the
Anton variable, so it also re-weighted four unrelated declarations, including the
body text of the freshly rebuilt `invite` module and a mono label in
`payments`. Those four were restored by hand; the one declaration that really
was a display heading (`home-slides`, `font: 800 22px/1.05 var(--ops-font-anton,
Inter, sans-serif)`) was converted to `var(--ff-font-headline)` instead. The
lesson is the same one the CSS-tooling memory already carries: a value
substitution must be anchored to the construct it targets, never applied as a
bare textual pattern.

Gate status after this pass: `prettier --check` exit 0, comment balance 21/21, no
NUL bytes, no BOM, LF endings, no `[object Object]` / `undefined` / `NaN`.
Passing modules: `dashboard`, `invite`, `couriers`, `payments`,
`customer-detail`, `allergens`, `column-visibility-menu`.

B0 third pass, 2026-10-07 — legacy residue **318 → 1**, and **all 21 CSS modules
now pass every gate**. The single remaining item is the documented
`.previewShade` exception in `catalog/home-slides`.

This pass cleared what the table-driven passes could not. Every gradient was
authored by hand against the surface it belongs to — panel wash
(`--ff-surface-container-low`), section strip and dialog header
(`--ff-surface-container-high`), selected card and editor chrome
(`--ff-surface-container-highest`), active segment and action button
(`--ff-primary-container` / `--ff-primary`), decorative top accent
(`none`). The `select` chevron in `catalog/products` keeps its two-gradient
technique but is recoloured to `--ff-on-surface-variant`; that is a control
affordance, not decoration, and the detector now excludes `background-image`
gradients from the legacy count for that reason.

Two tooling defects surfaced here and are recorded because they changed results:

- **The dead-rule pruner never looked inside `@media` blocks.** It scanned only
  the top level, so dead rules inside media queries survived and were reported
  as live. It is now recursive.
- **It also mis-parsed rules whose preceding comment contains a brace.** The
  block header comments quote selectors like `({chartPanel}, ...)`, so scanning
  raw text put rule boundaries inside comments. A navy-only pass now masks
  comments to equal-length whitespace before locating rules, applies deletions to
  the original text, and so leaves every comment intact. That pass removed the
  last four dead Navy rules (`statusInactive` in `branches`, `liveMark` in
  `catalog/products`).
- The unused-selector gate was also too strict: it failed a module when any dead
  class name appeared inside a _partially_ used selector such as
  `.liveMark, .viewLabel`. Such a rule is carried by its live alternative and
  its dead half can never match, so it is not actionable. The gate now measures
  **dead rules** — rules all of whose classes are unused — which is exactly what
  the pruner can safely remove.

Full suite after this pass: 21/21 gates PASS, `prettier --check` exit 0, comment
balance 21/21, no NUL bytes, no BOM, LF endings, no `[object Object]` /
`undefined` / `NaN`.

A9-1 complete, 2026-10-07 — **`/login` rebuilt from scratch**, and its wrapper.

Backend study first, then design, then delete, per plan §5. `StaffAuthService`
resolves `User.primaryIdentifier`, accepts only actorType STAFF or COURIER,
requires `status = ACTIVE`, requires a scrypt hash, and for a courier requires
`courierProfile.isActive` — collapsing all of it into the single reason
`USER_NOT_FOUND`, with `PASSWORD_MISMATCH` as the only other. That collapse is
deliberate, so the new page never branches on `details.reason` and shows one
failure state. It _does_ act on `AUTH_SESSION_EXPIRED`, which is returned as an
envelope code carrying no account state.

Three defects in the retired page are gone: credentials are no longer pre-filled
with the seeded values; the `totp: '000000'` fabrication (the page silently
auto-submitted an invented code whenever MFA was disabled) is gone; and
`@fastfood/ui-web` primitives are gone. That package is the retired design
system and `app/layout.tsx` imports its stylesheet globally, so using it would
have imported the old design by the back door — the whole form, button and notice
grammar is now authored on `--ff-*` tokens.

Because MFA is disabled locally but the endpoint still validates the shape of
the code, the second step is shown with an explanation instead of submitting an
invented one.

The `.ff-admin-login` / `.ff-admin-standalone` wrapper in `globals.css` was the
old palette and would have shown around the new card, so it was rewritten to Navy
tokens too; its now-dead `.ff-admin-login-card` / `-title` / `-sub` rules were
deleted. This wrapper is shared with `/invite/*` and `/access-denied`, which are
also being rebuilt.

Substitute type gate in place while the build gate is closed: `transpileModule`
over all 96 admin-web TSX files, **0 syntax errors**. It does not resolve modules
or check types — the type gap is still open.

A9-2 complete, 2026-10-07 — **`/access-denied` rebuilt**, plus a shell fix it
depended on. Gates: PASS, prettier exit 0, 96 TSX / 0 syntax errors.

The retired page rendered a **placeholder permission code**, `required.permission`,
because `ops-shell.tsx` redirected here with no query string — the page had no way
to know which permission was missing. Invented data on a state screen is exactly
what ADR-019 §7 forbids, so the shell now carries the real code:
`/access-denied?code=${encodeURIComponent(pagePermission)}`. The page renders it
as a mono value when present and says nothing when it is absent.

Backend, read first: `packages/domain-types` builds every page permission as
`admin.page.<slug>.<action>`; `ops-shell` derives the current one via
`adminPagePermissionForPath(pathname, 'view')` and computes
`pageDenied = Boolean(pagePermission && !hasStaffPermission(access, pagePermission))`.
Server-side enforcement is independent — `RbacGuard` / `@RequirePermissions` —
so this route is presentation, never the control point.

A7 note on `/catalog`: it is a bare `redirect('/catalog/products')` with no markup
and no stylesheet, so it needs no redesign. It is listed as done for that reason.

A9-3 complete — `/catalog` is a bare `redirect('/catalog/products')` with
no markup and no stylesheet, so it needs no redesign. It is listed as done for that
reason.

### A9-4 … A9-8 — remaining routes re-measured, then rebuilt

The previous status treated eight routes as unstyled because they have no CSS
module of their own. That measurement was wrong, and the corrected one changes the
plan. `service-areas`, `branches/[branchId]`, `payments/[paymentId]`,
`promotions/[promotionId]`, `refunds`, `reports`, `audit` and `settings` use
only `ops-*` primitives from `styles/admin-ops.css`, and every class they use is
already inside the Navy scope — including the ones their shared components
(`ops-ui`, `ops-table`, `ops-boundary`, `confirm-dialog`, `ops-premium-table`)
emit. They were rendering in the new system all along. A CSS-module inventory is
therefore not a valid scope test; the real test is whether a route falls outside the
shared Navy layer.

Re-measured against the actual defect, all eight shared one root cause: **no page
title, and a backend implementation note rendered as the first visible line of UI
copy.** Every one of them opened with a developer scope token and an endpoint
inventory — `BRANCH_SCOPED` · `GET/POST admin/branches/:id/service-areas` ·
`PATCH/DELETE yok` · `harita yok` — with literal backtick characters leaking
into the rendered text. That is the old design's voice, and it was the only
remaining trace of it.

Fixes applied:

- New shared primitive `components/ops/ops-page-header.tsx` (`OpsPageHeader`).
  The breadcrumb is derived from the canonical IA at runtime via
  `breadcrumbsForPath`, so a page cannot drift from the nav taxonomy; the title,
  scope tag and lede are passed in and written from the backend contract. All eight
  pages use it, so the header is defined once.
- `styles/admin-ops.css`: a Navy override for `.ops-page__hero` replaces the
  inherited amber gradient wash with the Navy panel grammar (flat
  `--ff-surface-container`, `--ff-keyline`, `--ff-radius-xl`,
  `--ff-shadow-surface`). The gradient violated the Navy bundle grammar — no
  gradients, glows or decorative pseudo-elements — and `/orders`, already marked
  done, was rendering it. New `.ops-page__crumb` primitive added alongside it.
- `/branches/service-areas` additionally lost its data-integrity defect.
  `ServiceArea` is `{ id, branchId, name, polygonGeoJson JsonB (EPSG:4326
MultiPolygon), priority Int, isActive Bool, createdAt, updatedAt }`, cascaded from
  `Branch`, with `@@index([branchId])`; the API contract is
  `GET/POST admin/branches/{branchId}/service-areas` and the Phase 4 routing engine
  consumes the polygons with an in-memory point-in-polygon check. The create form
  pre-filled its GeoJSON textarea with `DEMO_SERVICE_POLYGON` from
  `lib/fulfillment-ops.ts` — a hard-coded 0.02° square over central Istanbul. A user
  who did not edit the field and pressed create **persisted a wrong delivery zone**.
  The field now starts empty with a structural placeholder and an explicit empty
  guard, under the same ADR-019 §7 rule the sidebar shift card was removed under.
  The placeholder's WGS84 note is derived from the EPSG:4326 column type.

Evidence for this group: `gates.cjs` 0 failures across all 28 stylesheets;
`ts-syntax.cjs` `transpileModule` over 97 TSX files with 0 syntax errors;
`prettier --check` exit 0; the developer-note audit now reports no scope token, no
HTTP-verb inventory and no stray backtick in any of the eight pages — remaining
matches are template literals inside `path:` calls and enum comparisons, which are
code, not copy.

Deliberately left out of scope: money is still rendered as raw minor units in two
places — `promotionValueSummary` in `lib/finance-ops.ts` returns
`${discountMinor} kuruş`, and `branches/[branchId]` has "Min. sipariş (kuruş)"
input labels. Both contradict the `formatTryMinor` convention used on every
renovated page. `finance-ops.ts` is shared with the already-accepted `/promotions`
list, and the input labels encode an operator-facing unit contract, so changing
them is a separate decision rather than part of this header pass.

Build gate: `tsc`, `eslint` and `next build` still cannot run. Root cause is
now pinned — `package.json` requires `pnpm >=12.4.0 <13`, the machine has 11.5.0,
and 11.5.0 delegates to a missing 12.4.0 store path. Installing 12.4.0 is a
dependency change and needs human approval per AGENTS.md §6. A secondary issue is
that the repo sits on a `W:` network mount where pnpm symlink targets do not
resolve; a local-disk clone would also be needed.

### A9-9 — the retired design system is no longer loaded at all

Every renewed page had stopped importing `@fastfood/ui-web` primitives, and that
was previously recorded as sufficient. It was not. `app/layout.tsx` still had a
file-level `import '@fastfood/ui-web/styles.css'`, which is a 50 KB stylesheet
that itself does `@import url('@fastfood/design-tokens/web.css')`. The JS-import
check that closed out the earlier phases could not see it, because the leak came
through CSS, not through a component import.

What that put on every admin page:

- 335 `ff-*` rules from the retired system. No admin surface uses a single one
  of them.
- 136 custom properties from `@fastfood/design-tokens`. No admin stylesheet
  references a single one of them via `var()`.
- The token sheet is scoped `:root[data-theme="operations"]`, and `layout.tsx`
  sets exactly `data-theme="operations"` on `<html>`, so the retired palette was
  live everywhere rather than inert.
- 32 of those names collide with admin's own token names in
  `admin-stitch-tokens.css` and `admin-fastfood-tokens.css` — `--surface-canvas`,
  `--text-primary`, `--focus-ring`, `--action-primary-background`,
  `--status-*` and so on. `:root[data-theme="operations"]` is `(0,2,0)` against
  the `(0,1,0)` of `[data-admin-theme=...]`, so the retired values were the ones
  winning the cascade wherever those names were consumed.

The last live consumer of the retired primitives was `components/async-boundary.tsx`,
which imported `AccessDenied`, `Button`, `EmptyState`, `ErrorState` and
`LoadingState`. Its `AsyncBoundary` was used by exactly one page,
`/catalog/products`; `ForbiddenNotice` was used by nothing. Every other surface
already went through `OpsBoundary`.

Removed:

- `AsyncBoundary` and `ForbiddenNotice` deleted. `async-boundary.tsx` now carries
  only `LoadState`, `errorMessage`, `isForbidden` and `isUnauthorized` — no JSX,
  no dependency on the retired package.
- `OpsBoundary` gained an `emptyAction` prop so it covers the one capability
  only `AsyncBoundary` offered.
- `/catalog/products` switched to `OpsBoundary`.
- The global `@fastfood/ui-web/styles.css` import deleted from `app/layout.tsx`.

One deliberate behaviour change follows from the switch: `/catalog/products`
previously rendered a 403 by echoing the raw backend message through
`ui-web`'s `AccessDenied`. It now uses `OpsBoundary`'s discipline — the title
"Yetki yetersiz", the real permission code retained, the message withheld. That
is the same decision A9-2 took for `/access-denied`, so the two agree.

Verification: zero admin TSX files reference any class defined by the retired
stylesheet; zero admin stylesheets reference any of its 136 tokens; the retired
stylesheet defines no `:root`/`html`/`body`/`*` selector of its own. The four
remaining textual matches for `@fastfood/ui-web` in admin-web are comments
recording the removal. `gates.cjs` 0 failures, `ts-syntax.cjs` 97 TSX files with 0
syntax errors, `prettier --check` exit 0.

`@fastfood/ui-web` and `@fastfood/design-tokens` are still declared in
admin-web's `package.json` although no code imports them any more. Pruning them
changes the lockfile and needs a working install to verify, so it is left to the
human owner alongside the build-gate decision below.

### Corrected measurement — the earlier `light-dark()` note was wrong

Earlier notes in this file, and in the B0 write-up, described the surviving
`light-dark()` calls as inert: "the Navy blocks override them, they do not
replace it". That was measured with a colour-family detector that looked for
saturated legacy values — the amber family, the old blue text family, the Anton
face, gradients. It found 318, and B0 took that to 1. That number was correct for
what it measured and was then over-generalised into a claim about all
`light-dark()` calls. Both must be corrected.

Re-measured by declaration instead of by colour family: 2,318 `light-dark()`
appear as a **direct property value**, not as a `var()` fallback. Only 771 are
covered by a Navy rule on the same selector and property. **1,547 render**, across
22 stylesheets — 633 `color`, 393 `background`, 220 `border`, 132
`border-color`, 47 `box-shadow`. The surviving population is the retired
system's _neutral_ ramp plus its cold blue-grey ink, which the colour-family
detector was never looking for.

What was not missed is what B0 found: only 3 of the 1,547 match the saturated
legacy families (2 amber, 1 red). The defect is a palette-hue mismatch, not a
leftover brand colour. Navy's surface ramp is blue-tinted — `#0b1326`,
`#131b2e`, `#171f33` — and its ink is `#dae2fd` on-surface, `#e0c0b1`
variant. The retired neutrals are warm-grey (`#d3d6d9`, `#24262e`, `#f8f9f9`)
and the retired muted ink is cold blue-grey (`#58626f`, `#9dacbe`, `#3f4650`).
On a Navy surface those read as off-hue rather than as a different brand.

### Why this needs a human decision, and what the decision actually is

A value-by-value substitution table is impossible here: the retired system
hand-tuned **927 distinct `light-dark(L, D)` pairs** for 1,559 call sites — one
"border colour" appears as `#35404c`, `#33404c`, `#3b444f`, `#46505d` and
dozens more. That is the underlying cause of the count.

What makes it tractable is that those 927 pairs collapse onto **seven roles**, and
every role already has a Navy token. No new token is needed:

| role                                        | call sites | distinct pairs | files | Navy token                         |
| ------------------------------------------- | ---------- | -------------- | ----- | ---------------------------------- |
| `ink/blue` — retired cold blue-grey ink     | 445        | 300            | 18    | on-surface or variant              |
| `line/blue` — retired blue-grey borders     | 260        | 123            | 19    | `--ff-keyline`                     |
| `surface/blue` — retired blue-grey surfaces | 238        | 109            | 19    | `--ff-surface-container-low`       |
| `surface/neutral`                           | 82         | 62             | 17    | `--ff-surface-container`           |
| `ink/amber`                                 | 73         | 56             | 18    | `--ff-on-surface-variant`          |
| `line/slate-alpha`                          | 69         | 51             | 11    | `--ff-keyline`                     |
| `line/amber` + `line/amber-alpha`           | 127        | 67             | 13    | `--ff-primary-container` / keyline |

Remaining 265 are status families (red, green) plus shadows. So the work is
role-based, not value-based, and it is reviewable as a seven-row table.

Two reasons it is escalated rather than just done:

1. **`ink/blue` is 445 call sites and it is not one decision.** Whether a given
   site is primary ink or muted ink decides between `--ff-on-surface` and
   `--ff-on-surface-variant`. Mapping all 445 to the variant greys out primary
   text; mapping all to the primary drops hierarchy. The split is a contrast
   judgement, made 445 times.
2. **The build gate is closed**, so contrast cannot be verified mechanically
   after the change, and this touches 18 pages that have already been through
   human review.

The safe precondition was verified and holds: the Navy token layer carries its own
light and dark values (`html[data-color-mode='light'] [data-admin-theme='fastfood-navy']`
overrides), so replacing `light-dark(L, D)` with a single `var(--ff-*)` preserves
the light/dark switch rather than losing it. Only one genuinely live fallback was
found: `--ops-shadow-overlay` in `admin-ops.css`, the sole `--ops-*` name
referenced but not present in the compatibility layer.

### A9-10 — `light-dark()` collapsed onto Navy roles

Approved by the owner on 2026-10-07 and applied.

**Method.** Not by value — that is impossible here. The retired system hand-tuned
**919 distinct `light-dark(L, D)` pairs**, so a value table has no stable keys.
The mapping is by **role**, derived from three measured properties of each pair:

- _property group_ — `color` is ink, `border*`/`outline` is line,
  `background*` is surface;
- _chroma_, not HSL saturation. Near-white and near-black neutrals have
  meaningless HSL saturation, which misfiled the retired neutrals as "info
  blue". Threshold `(max−min)/255 ≥ 0.20`: the retired neutrals measure
  0.09–0.11, the real info blue 0.45. Hue bands then split red / amber / green /
  blue;
- _alpha_ — opaque, translucent (wash and border tokens) and scrim
  (`--ff-shadow-scrim`, only where both sides sit at 0.6–1.0 alpha).

Within `color`, primary versus muted ink is decided by the **light** value's
relative luminance against a 0.04 split — the retired primaries measure 0.013–0.031,
the muted inks 0.06 and up. Within `background`, the Navy surface ladder
(`-lowest` / `-low` / ``/`-high`) is chosen from the dark value's luminance so
panel hierarchy survives the collapse rather than flattening to one surface.

**Applied:** 1,405 replacements across 22 stylesheets. Eleven
`var(--ops-*, var(--ff-*))` chains were unwrapped, since the inner token could
never take effect.

**Corrected measurement (2026-10-07, A9-14).** This section originally read
"1,547 uncovered → 64, and all 64 are `box-shadow` or `scrollbar-color`". The
second half was wrong and was found in A9-14. The first half cannot be reproduced
with the tool that exists today, so the baseline figure is withdrawn rather than
restated.

The tool counts something narrower than "uncovered". It counts `light-dark()`
inside **declarations** and skips custom-property definitions
(`--x: light-dark(...)`), which is why a raw grep reports 863 occurrences where
the tool reports 624. It then subtracts every declaration that a Navy-scoped rule
overrides with the **same normalized selector and the same property** — those
cannot render on a Navy page.

| Bucket                                                 | Count |
| ------------------------------------------------------ | ----- |
| `light-dark()` declarations in the tool scope          | 624   |
| — overridden by a Navy rule, same selector + property  | 561   |
| — uncovered, i.e. capable of rendering                 | 63    |
| Raw occurrences including `--custom-prop:` definitions | 863   |

The 63 are exactly the two deliberately excluded roles: 47 `box-shadow`
(structural — a dialog shadow is not a surface token) and 16 `scrollbar-color`
(two colours in one declaration, so a single token cannot express it). It had
been 64. The extra one was an `accent-color`, which is neither exclusion.

The legacy `light-dark()` values were kept rather than deleted: they still serve
the non-Navy surfaces (`/login`, `/invite/*`, `/access-denied`, the standalone
scaffold) that the Navy blocks do not cover.

The Navy token layer was verified to carry its own light and dark values under
`html[data-color-mode='light'] [data-admin-theme='fastfood-navy']`, so replacing a
`light-dark(L, D)` pair with one `var(--ff-*)` preserves the light/dark switch
instead of losing it. No new token was introduced.

### A9-11 — money display

Approved in the same decision: read-only displays only.

- `promotionValueSummary` returns `formatTryMinor(...)` instead of
  `${discountMinor} kuruş`.
- The three refund confirmation dialogs (`payments/[paymentId]`, `refunds`,
  `orders/[orderId]`) now read the amount as currency before an operator confirms
  a destructive action.
- The promotion detail's minimum-basket figure is formatted.
- The `FIXED_CART_MINOR` filter label dropped its "(kuruş)" hint, which no longer
  matches what is displayed.

Deliberately unchanged: input unit labels and placeholders, `aria-label`s, input
validation messages, and the `column-prefs` storage note. Those state the unit an
operator _types_, not what the UI renders, and changing them would alter the input
contract and the `canSubmitRefund` / `digitsOnlyMinor` guards.

One test changed: `finance-ops.test.ts` asserted `'2500 kuruş'`. Its intent —
percentage and fixed-amount promotions stay distinguishable — is preserved; the
expectation is now `'25 ₺'`. The test was updated, not weakened, and it is
verified by the real runner below.

### Build gate — opened, and it was never a package-manager problem

The gate was recorded as "pnpm 12.4.0 is not installed". That diagnosis was wrong.
pnpm 12.4.0 was already installed **inside WSL**, and `node_modules` was already
complete there — 1,373 packages, `next@16.3.5` resolving correctly. What is missing
is `node` on the non-interactive PATH, and the default WSL node is v22.23.3 while
`engines` requires `>=24.21.0 <25`. nvm already has **v24.21.0** installed. So the
gate opens with `nvm use 24.21.0` — no install, no dependency change, no lockfile.

`W:\home\azem\projects\fastfood` and `/home/azem/projects/fastfood` are the same
directory; verified by reading this turn's edits from the WSL side.

The Windows-side attempt is recorded because it is a trap: running
`pnpm install` from Windows fails with `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR`
(os error 145) because `.modules.yaml` records a WSL `storeDir` and entries like
`next` and `vitest` are dangling symlinks that the SMB share will not delete. Any
future gate run must go through WSL.

### A9-12 — retired dependencies pruned, and a green gate at last

`@fastfood/ui-web` and `@fastfood/design-tokens` removed from admin-web's
`package.json`. Both packages stay in the workspace — `courier-web`,
`courier-mobile`, `ui-native` and `ui-web` itself still depend on them.

`next.config.mjs` had to change with it: both were listed in
`transpilePackages`, and `@fastfood/ui-web` was in
`experimental.optimizePackageImports`. Removing the dependency while leaving
those would leave the build resolving packages admin-web no longer declares.
Both entries, and the now-empty `experimental` block with its orphaned comment,
are gone.

**Gate evidence.** `pnpm install` was run inside WSL to sync the lockfile after
the prune, then the full gate was executed:

| gate    | command        | result                              |
| ------- | -------------- | ----------------------------------- |
| install | `pnpm install` | ok, lockfile synced, 4m51s          |
| types   | `tsc --noEmit` | **exit 0**                          |
| tests   | `vitest run`   | 10 files, **104 tests, all passed** |
| build   | `next build`   | **exit 0**, 28 routes generated     |
| lint    | `eslint`       | **10 errors, 29 warnings**          |

An earlier typecheck — run before the install, against the same tree — reported
one error, `layout.tsx(60,11) — dangerouslySetInnerHTML does not exist on
IntrinsicAttributes & ScriptProps`, on the colour-mode `<Script>` bootstrap. It
does not reproduce after the install, so the tree now typechecks clean. That block
was never touched: it is byte-identical in the pre-edit backup at
`backups/2026-10-07-a9-headers/layout.tsx`. Recorded rather than quietly
dropped, because a gate that changes verdict between runs needs the history kept.

The 10 lint errors are real and still open. They are **pre-existing** — verified,
not assumed:

- 9 are `react-hooks/refs` in `app/orders/page.tsx` (`columnsMenu` read during
  render, lines 476 / 532 / 533 / 536 / 537);
- 1 is `react-hooks/set-state-in-effect` in `components/ops/portals.tsx:15`
  (`setHost(document.body)` inside an effect).

Neither file was touched in this session — both still carry a 2026-09-23 mtime
against 2026-10-07 for everything this session changed. They come from React
Compiler lint rules newer than the code, and they are not design defects. Fixing
them is separate work: `orders` needs the column-visibility menu refactored off
render-time ref reads, `portals` needs the host lookup moved out of the effect.

### A9-13 — light-mode contrast, measured rather than asserted

The role collapse moved 1,405 declarations onto `--ff-*` tokens without checking
what those tokens actually resolve to in light mode. Measuring the pairings
(WCAG 2.x relative luminance, alpha flattened over its backdrop) found two real
defects, one of them a regression the collapse itself made reachable.

**1. The four status `*text` tokens had no light override at all.** The light
block overrides the fills, the washes and the borders — but not
`--ff-status-warn-text`, `--ff-status-critical-text`, `--ff-status-ready-text`,
`--ff-status-info-text` or `--ff-status-idle-text`. Their dark values are pale
pastels chosen for the dark surfaces; on the light ramp they measure **1.22:1**,
i.e. effectively invisible. Before A9-10 those call sites used
`light-dark(#a0750e, #f1c65e)` and carried a correct light value, so the gap was
latent rather than visible — routing ~180 `color` declarations onto those tokens
turned it into a live defect.

Fixed by adding the five missing light overrides, seeded from the existing light
fill tokens and darkened along their own hue until the worst light surface
(`--ff-surface-container-highest`, `#d5dbe7`) clears 4.5:1:

| token                       | dark      | was on light | now on light (worst surface) |
| --------------------------- | --------- | ------------ | ---------------------------- |
| `--ff-status-warn-text`     | `#ffb690` | 1.22:1       | `#a9380a` → 4.64:1           |
| `--ff-status-critical-text` | `#ffb4ab` | 1.22:1       | `#b3261e` → 4.70:1           |
| `--ff-status-ready-text`    | `#4edea3` | 1.23:1       | `#006c51` → 4.63:1           |
| `--ff-status-info-text`     | `#6cc5ff` | 1.37:1       | `#196299` → 4.65:1           |
| `--ff-status-idle-text`     | `#9aa7c2` | 1.74:1       | `#575f72` → 4.60:1           |

**2. Light `--ff-primary-container` failed its own documented intent.** The token
file states "Orange darkens on light so it keeps 4.5:1 against the light surfaces".
`#c2410c` reaches only **4.41:1** on `--ff-surface-container` and 3.73:1 on
`-highest`, and this token is used as **text colour in 42 places** across 22
stylesheets — so that claim was false. Darkened to `#a9380a`: 4.64:1 on the worst
light surface, 6.45:1 under white. All 113 usages shift slightly darker in light
mode; the hue is unchanged.

This one is **pre-existing**, not caused by the role collapse — `line/amber` maps
to `--ff-primary-container` for borders only, and the collapse never mapped a
`color` declaration onto it. Verified by grepping for
`color: var(--ff-primary-container)`: 42 sites, all pre-dating this work. Both
fixes are in the human's gift to veto; they are reported rather than assumed
approved.

After the fixes every pairing the collapse introduced measures above threshold in
both modes — dark ink 11.1–14.3:1, dark muted 8.4–10.1:1, dark status 8.6–9.7:1;
light ink 14.6–17.1:1, light muted 6.1–7.2:1, light status 5.5–5.6:1. Gate
re-run after the token change: `tsc` exit 0, 104/104 tests, `prettier` exit 0,
CSS gates 0 failures. Lint was still carrying the same 10 errors at this
point; they are cleared in A9-14 below.

Two decisions remain open and neither blocks A9:

1. ~~`light-dark()`~~ — resolved in A9-10 above; the owner approved the role
   collapse and it is applied.
2. The build gate is **open** — see A9-12. It was never a package-manager
   problem.

A9 and later change page content. They require explicit human go per route
group, per the migration procedure in the foundation document.

### A9-14 — the lint gate, and the two real defects behind it

`eslint src` now reports **0 errors**. The 10 errors A9-13 left open were not
design work, and "pre-existing" was only true by file date: two of the files
were files this migration had rewritten. They were ten symptoms of three root
causes.

**1. `useColumnMenuAnchor` handed the trigger ref back to its caller.**
`orders/page.tsx` reads `columnsMenu.open`, `columnsMenu.toggle` and
`columnsMenu.anchor.*` during render. Because the ref travelled inside the
same returned object, the React Compiler taints every property access on it —
nine errors spread over five lines. The ref now belongs to the component that
renders the button and is passed _into_ the hook, so the hook only reads
`.current` from event handlers and effects. Aliasing the value at the call site
would not have worked: the taint travels with the object, not the property.

**2. `ClientPortal` copied `document.body` into state.** `useSyncExternalStore`
replaces the effect. `document.body` is stable for the document lifetime, so
the subscribe pair is a no-op, the server snapshot stays `null` (no portal
during SSR or hydration) and the client snapshot returns the body on the first
client render. The repo already used exactly this pattern in `admin-shell`,
`ops-shell`, `branch-context` and `order-age`.

**3. Two derived states were synced by effect.** `access-denied/page.tsx`
copied `?code=` out of the URL, and `orders/[orderId]/page.tsx` recomputed the
refund amount whenever the selected items changed.

The second was not merely a lint error — it was a defect. The effect also
depended on `state`, so it re-fired after every refresh and **silently
discarded an amount the operator had typed into the refund field by hand**.
The refill now lives in the two selection handlers that cause it, and nowhere
else. `access-denied` reads the location as an external store subscribed to
`popstate`, which keeps its documented reason for avoiding `useSearchParams`
(no Suspense boundary, no hydration mismatch) and drops the effect.

**One more genuine defect surfaced while clearing the remaining warnings.**
`ops-shell.tsx` redirected to `/access-denied?code=…` without listing
`pagePermission` among its dependencies. Moving between two denied pages keeps
`pageDenied` `true` throughout, so the effect never re-ran and the second page
was never redirected — the operator stayed on a page they have no permission
for. `pagePermission` is a dependency now.

Two warnings were deliberately left alone:

- `modifiers/page.tsx` keys editor focus on `selectedGroup?.id`, not on the
  selected object. Adding the object would re-focus the editor on every render
  and steal focus from the fields being typed into. The rule is satisfied
  honestly instead: the effect now reads `selectedGroupId`, so the dependency
  is a real value rather than a widened expression.
- `react-hooks/incompatible-library` (11) is TanStack Table reporting that the
  React Compiler will not memoise `useReactTable()` call sites. That is correct
  and intended; suppressing it would hide a real constraint, and the only
  alternative is rewriting eleven table components.

`import/order` (10) and one inline `import()` type annotation were corrected
mechanically. Prettier then reported 17 files in `apps/admin-web/src` that had
never been formatted at all; those were formatted too (backed up first), so the
repository's own `format:check` gate now passes for the whole Admin surface.

Final gate, every row run after the last edit:

| Gate                          | Result                              |
| ----------------------------- | ----------------------------------- |
| `eslint src`                  | 0 errors, 11 informational warnings |
| `tsc --noEmit`                | exit 0                              |
| `vitest run`                  | 104/104                             |
| `next build`                  | exit 0, 28 routes                   |
| `prettier --check` (97 files) | exit 0                              |
| encoding scan (97 files)      | no BOM, no CRLF, no NUL             |

**One more measurement correction, and the last collapsible `light-dark()`.**
Re-running the coverage tool during A9-14 contradicted the A9-10 result line, so
the tool itself was read before its output was trusted — the previous figure came
from the same script and had been quoted without that check. Two findings, both
recorded in the A9-10 correction above: the tool measures _uncovered declarations_
rather than raw occurrences (624 against 863), and the claim that all remaining
occurrences were the two excluded roles was off by one.

That extra one was `products.module.css`: `.editorWarning` still carried
`accent-color: light-dark(#a50909, #f87171)` in a rule already bound to
`--ff-status-critical-border` / `-wash` / `-text`. It now reads
`var(--ff-status-critical-text)`. `accent-color` is a single-colour property, so
unlike `box-shadow` and `scrollbar-color` it always could collapse. Measured
against the critical wash under WCAG 1.4.11 (3:1 for non-text contrast): dark
improves 5.84 → 9.51:1, light eases 5.79 → 4.76:1 on the wash and 6.73 → 5.54:1
on the panel. Both modes stay clear of the threshold, and the checkbox now
belongs to the same role as the rest of its component.

CSS gates re-run after the change: `gates.cjs` 0 failures across 28 stylesheets,
comment balance 0 broken, `prettier` exit 0, coverage 64 → 63.

No test was weakened, no lint rule was disabled, and no dependency moved to
reach any of these numbers.

### A9-15 — 270 provably unreferenced rules pruned from `admin-ops.css`

Cleaning up after the collapse surfaced a larger question than the collapse:
`admin-ops.css` still carried 278 rules that nothing renders. They are the
retired selectors — `ops-kds`, `ops-rail__link`, `ops-drawer__*`,
`ops-badge--*`, `ops-bulk-toolbar*` — whose markup the A9 rewrites deleted. Each
one is a Navy override block sitting on top of a base rule, and each one also
carried legacy `light-dark()` values, so they were the old design lingering in
the file in the most literal sense.

**Removed: 270 rules, 60.8 KB, 176 class names, 28 `light-dark()` declarations.**
`admin-ops.css` goes from 207 KB to 147 KB. Braces and comment delimiters stay
balanced, and 64 of the 65 comments survive.

**8 rules were deliberately kept** because the class name is still referenced:
`ops-checkbox` (used in `catalog/products/page.tsx`), `ops-media-grid`
(referenced from `products.module.css`) and `order-timeline` (token match in
`packages/contracts` and the capability matrix). They are the residue of the
mechanical filter, not verified dead, so they stay.

**How "dead" was established — and how the measurement nearly lied.**
Deadness was computed as a fixpoint over class names: seed with every token in
every TS/TSX file, then repeatedly mark a rule live if any class it touches is
already live, so `.parent .child` propagates. Dead rules are never allowed to
feed the universe back in. Four separate defects in this analysis were found and
fixed before a single rule was deleted:

1. **Dynamic class construction defeats a word scan.** ``styles[`status_${x}`]``
   contains the word `status_`, never `status_ready`. The first run therefore
   marked seven live `.flowIcon--*` and `.status_*` rules dead. Template prefixes
   and lookup tables (`METRIC_TONE_CLASS`) are now resolved before the fixpoint.
2. **Including CSS text in the universe makes it self-feeding.** A Navy override
   `.x { }` mentions `.x`, which would keep its own retired base rule `.x { }`
   alive. That variant reported **0** dead rules — the opposite error, equally
   wrong.
3. **The parser did not descend into `@media`.** Its census disagreed with the
   pruner's (816 vs 877 rules for this file), which hid `@media`-nested copies of
   already-verified selectors.
4. **Slicing an at-rule body with `indexOf('{')` drops preceding siblings**,
   because `body` already excludes the at-rule's own braces. Fixing that plus the
   recursion changed the verified set from 268 to 270 rules.

The pruning itself was then reconciled against the file: 223 distinct selectors,
exactly 270 occurrences, **zero mismatches**. An earlier attempt removed 274
because it deleted by selector string while the verified list was positional;
the count guard aborted the write, which is how the parser divergence surfaced.

**One comment was lost, correctly.** `print-only isolation; default in screen
mode wraps inside a panel` lived inside the body of `.ops-receipt__sheet`, an
otherwise empty rule, so it left with the rule. The first pruning attempt lost 26
comments instead: the dropped span ran from the previous `}` to the rule's `}`,
which silently swallowed the section headers between rules (`/* --- Customer
--- */` and friends). Comments in that span are now re-emitted on their own line.

**Rendered output is unchanged by construction** — a rule whose class no element
carries cannot affect any box. Verified anyway, after the write:

| Gate                                           | Result                                      |
| ---------------------------------------------- | ------------------------------------------- |
| `gates.cjs` (28 stylesheets)                   | 0 failures                                  |
| comment balance                                | 0 broken, 64/64 delimiters                  |
| dead-rule re-scan                              | 8 remaining, all the deliberately kept ones |
| `light-dark()` raw occurrences                 | 862 → 834                                   |
| coverage tool                                  | 624 / 561 / 63 — unchanged, as expected     |
| `prettier --check` (all CSS)                   | exit 0                                      |
| `eslint src` · `tsc` · `vitest` · `next build` | 0 errors · 0 · 104/104 · exit 0             |

The coverage tool numbers are unchanged because it skips Navy-scoped rules by
design, and every removed declaration sat inside one. Backup:
`backups/2026-10-07-lint-refs/admin-ops.css`.

#### A9-15 follow-up — the last 8 rules, and a third false positive

The first pass kept 8 rules because their class name appeared somewhere else in
the repository. All three of the names involved turned out to be **substring
collisions, not references**:

| Name             | What actually matched                                       | Verdict                 |
| ---------------- | ----------------------------------------------------------- | ----------------------- |
| `order-timeline` | `id: 'order-timeline'` in `customer-capability-registry.ts` | a capability identifier |
| `ops-checkbox`   | the TSX renders `ops-checkbox-row`                          | a different class       |
| `ops-media-grid` | the CSS styles `ops-media-grid__item`                       | a different class       |

The verifier used `string.includes`, so `ops-checkbox` matched inside
`ops-checkbox-row`. That is the same defect as the coverage tool earlier in this
phase — a word that means one thing being read as another. It was rewritten to
index only tokens that appear in a **class position**: `className` string and
template values, `class={…}` expressions, `styles.x`, `styles['x']`, and the
prefixes of ``styles[`x_${…}`]`` — plus token-exact hits inside stylesheet
selectors. Capability registries, docs and generated caches no longer taint a
class name.

Re-verified: **0 tainted**, all 8 rules genuinely dead. They were removed in a
second pass — 6 `order-timeline*` rules and `.ops-media-grid`, 1.9 KB, 2
`light-dark()` declarations, **and all 64 comments survived**, because none of
them sat inside a deleted rule body.

**The Admin stylesheet layer now has zero dead rules.** Fixpoint re-scan over
all 28 stylesheets: 4,669 non-at-rules, **0 dead (0.0%)**, down from 278. Raw
`light-dark()` occurrences 862 → 832. No dead stylesheet: all 28 are imported.
The coverage tool still reports 624 / 561 / 63, unchanged, because every removed
declaration sat inside a Navy-scoped rule that the tool skips by design.

| Gate                                       | Result                          |
| ------------------------------------------ | ------------------------------- |
| `gates.cjs`                                | 0 failures                      |
| comment balance                            | 0 broken, 64/64                 |
| dead-rule fixpoint                         | **0 of 4,669**                  |
| `prettier --check` (all CSS)               | exit 0                          |
| `eslint` · `tsc` · `vitest` · `next build` | 0 errors · 0 · 104/104 · exit 0 |

Backups: `backups/2026-10-07-lint-refs/admin-ops.css` (before the first pass)
and `admin-ops.prune1.css` (before the second).

### A9-16 — the retired token vocabulary, four silent defects, and zero dead references

The last measurable trace of the old design system was not a class or a colour —
it was the **vocabulary**. `admin-stitch-tokens.css` is imported globally by
`layout.tsx` and carried 39 custom properties that nothing consumed:

- 7 retired ops tokens (`--ops-warn`, `--ops-idle`, `--ops-warn-well`, …), and
- **32 names that are exactly the retired `@fastfood/design-tokens` set**
  A9-8 recorded as colliding with admin's own names — `--surface-canvas`,
  `--text-primary`, `--focus-ring`, `--action-*`, `--status-*`, `--border-*`.

None were referenced by admin-web, so all 39 were removed: 75 declarations across
the dark and light blocks, 6,259 → 3,677 bytes. The 46 `--ops-*` tokens that _are_
consumed, and the sheet's one class rule, are untouched. The same 32 names remain
defined in `packages/ui-web/src/styles.css` and `apps/courier-web` — those are that
app's own definitions and were never in scope here.

A guard then checked the whole Admin surface for custom properties that are **read
but never defined**, which is how a retired reference always shows up: the `var()`
is invalid at computed-value time and the declaration silently drops.

**Four real defects, all invisible until measured:**

| Reference          | Used for                                                                                         | Effect                                                                                   | Fix                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `--ops-radius-md`  | `border-radius` in **10** rules of `admin-ops.css` — tables, receipt modal, confirm panel, cards | invalid → corners rendered **square**; the ops radius ladder was missing its middle rung | added `--ops-radius-md: var(--ff-radius-xl)` beside the existing `--ops-radius-xs/-sm`     |
| `--ops-font-inter` | `font-family` on the orders table header                                                         | invalid → inherited instead of Inter                                                     | `--ops-font-sans`                                                                          |
| `--accent`         | `accent-color` of a permission checkbox                                                          | invalid → browser default                                                                | `var(--ff-primary-container)`, the token the other eight accent sites use                  |
| `--slide-text`     | `color` of `.loopCopy strong` in home-slides                                                     | invalid → inherited                                                                      | `var(--slide-ink)` — `strong` is the emphasised label; `.loopCopy span` is `--slide-muted` |

**A fragile pattern was closed at the same time.** The font tokens read
`var(--font-jakarta), 'Plus Jakarta Sans', …`. A named family after the comma is
**not** a fallback — if the variable is ever absent the whole declaration is
invalid and `font-family` falls back to inherit. `layout.tsx` always applies the
`next/font` classes today, so nothing was broken, but the failure mode is silent
and total. All six declarations now carry the family inside the `var()`:
`var(--font-jakarta, 'Plus Jakarta Sans')`.

The scanner itself needed fixing twice to report honestly. It first flagged
`--font-*` as undefined — those are injected at runtime by `next/font/google`
via a class on `<html>`, invisible to any static read, and correctly so. It then
treated a `var(--x, fallback)` as a bare read. Both were resolved by reading what
the app actually does rather than guessing from a file.

**Final state of the Admin style layer:**

| Measure                                  | Value                                            |
| ---------------------------------------- | ------------------------------------------------ |
| custom properties read but never defined | **0**                                            |
| dead rules (fixpoint over 4,669)         | **0**                                            |
| dead stylesheets                         | 0 (28/28 imported)                               |
| `light-dark()` coverage                  | 624 declared / 561 overridden / **63** uncovered |
| contrast failures (WCAG, both modes)     | 0                                                |
| overlay components audited               | 7, all on the Navy token layer                   |

| Gate                                           | Result                          |
| ---------------------------------------------- | ------------------------------- |
| `gates.cjs` (28 stylesheets)                   | 0 failures                      |
| comment balance                                | 0 broken                        |
| `prettier --check` (all CSS)                   | exit 0                          |
| `eslint src` · `tsc` · `vitest` · `next build` | 0 errors · 0 · 104/104 · exit 0 |

Backup: `backups/2026-10-07-lint-refs/admin-stitch-tokens.css`.

### A9-17 — the inverse audit: markup asking for styles that do not exist

A9-15 and A9-16 removed CSS nothing points at. This is the opposite direction,
and it is the more damaging one: a class the markup references with no matching
rule renders `class="undefined"` or resolves to no class at all. There is no build
error, no lint error, and no console warning — the element is simply unstyled.

**1,244 `styles.*` references checked across 23 CSS modules. Five had no rule.**

| Reference                   | Site                                        | What it did                                                                                        | Resolution                             |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `styles.row`                | `orders-data-grid.tsx`, on every `<tr>`     | rows are styled by `.table tbody tr`; the reference only contributed `undefined`                   | reference removed                      |
| `styles.flowCopy`           | dashboard, inside `.flowRow`                | `.flowRow` is a 2-column grid; the wrapper needs no rule of its own                                | reference removed                      |
| `styles.shortcutsPanel`     | dashboard shortcuts section                 | `styles.panel` applied; the modifier was undefined, leaving a literal `undefined` class            | reference removed, `styles.panel` kept |
| `styles.passwordResetPanel` | users detail, the password-management block | **the block had no styling at all** — title, description, notice and actions rendered as bare flow | rule written, see below                |
| `styles.relations`          | categories, the relations wrapper           | a pure wrapper; `.relationHeader` and every `.relationSection` are fully specified                 | reference removed                      |

`passwordResetPanel` sits in the same flow as the `.fieldLabel` / `.inlineEdit`
pairs above it, which use `margin: 15px 0 6px` with an 11px label role. The new
rule matches that rhythm instead of inventing a bordered card — no other block in
that flow has one. Its colours are Navy tokens (`--ff-on-surface-variant`, the
role table's `ink/muted`), deliberately **not** a raw `light-dark()` matching the
neighbouring label, because that would have re-opened a value the collapse closed.

Two of the five were deliberately _not_ given an invented rule. `flowCopy` and
`relations` are wrappers whose children already carry the layout; writing a gap
or a margin for them would have meant guessing at spacing and disturbing the
existing 19px rhythm that the current markup produces.

**The two audits are now complements of each other, and both are clean:**

| Measure                                  | Value                                                   |
| ---------------------------------------- | ------------------------------------------------------- |
| `styles.*` references with no rule       | **0** (1,244 checked)                                   |
| custom properties read but never defined | **0**                                                   |
| dead rules (fixpoint over 4,672)         | **0**                                                   |
| dead stylesheets                         | 0 (28/28 imported)                                      |
| `light-dark()`                           | 624 declared / 561 overridden / 63 uncovered, unchanged |
| WCAG contrast failures                   | 0                                                       |

Gate after the change: `gates.cjs` 0 failures · comment balance 0 broken ·
`prettier --check` exit 0 · `eslint` 0 errors · `tsc` exit 0 · `vitest` 104/104 ·
`next build` exit 0.

### A9-18 — /login rebuilt, and the scope bug that made it invisible

`/login` was asked to be redesigned from scratch. Reading it first turned up
something larger than the design.

**The page was already written entirely on `--ff-*` tokens, and none of them
resolved.** Every definition in `admin-fastfood-tokens.css` sits under
`[data-admin-theme='fastfood-navy']`; the stylesheet has no `:root` block at
all. `/login`, `/invite/*` and `/access-denied` render through `AdminShell`
_outside_ `OpsShell`, so they carried no theme attribute. A `var()` naming an
undefined custom property is not an empty value — it invalidates the entire
declaration at computed-value time. The card had no padding, no surface, no
radius and no border; the inputs had no border and no background. The page was
correct code rendering against no palette at all, which is why it looked like
it needed designing rather than debugging.

The earlier "read but never defined" gate could not catch this: it compared
references against definitions **file-wise**, and every name was defined
_somewhere_. Reachability through a scoping selector is a separate question and
now has its own check.

**Fix:** `components/admin-shell.tsx` puts `data-admin-theme="fastfood-navy"` on
the `ff-admin-login` and `ff-admin-standalone` wrappers. That single attribute
brings the token layer into scope for all three auth surfaces and also applies
the theme's own rules here — `*` box-sizing, link colour, the `:focus-visible`
outline and the icon settings. Nothing under `OpsShell` changes.

**The rebuild.** Two columns from 900px — a brand rail carrying the product name
and what the console is for, and the auth pane — collapsing to a compact header
bar above the card on narrow screens. The card is the shared panel grammar:
`--ff-surface-container`, `--ff-keyline`, `--ff-radius-xl`,
`--ff-shadow-surface`. No gradients, no glows, no decorative pseudo-elements. The
two-step rail is kept because the flow really is two steps, and now marks the
first step done rather than merely inactive.

Behaviour changes, all contract-driven:

- **Field-level validation.** `400 VALIDATION_ERROR` carries `details.fields`;
  the page maps them onto the offending input. Messages are written in Turkish
  from the controller's Zod constraints (`identifier` 1..255, `password` 1..1024,
  `totp` /^\d{6}$/) rather than echoed, because the API answers in English and a
  mixed-language form is worse than either.
- **One failure message, localised.** `AUTH_INVALID_CREDENTIALS` shows a single
  Turkish sentence. `details.reason` is still never branched on — the service
  collapses unknown user, wrong actor, inactive account, missing hash and
  inactive courier into `USER_NOT_FOUND` precisely so the surface cannot confirm
  that an account exists.
- **Password visibility toggle** with `aria-pressed` and a changing label.
- **Focus follows the step**, so a keyboard user is not dropped at the top of the
  card when the MFA step opens.
- **The redundant "Giriş ekranına dön" link is gone.** It duplicated the ghost
  button in the same state and triggered a full navigation; the button now reads
  "Baştan başla" when the challenge has expired.

Unchanged on purpose: no pre-filled credentials, no fabricated TOTP, no control
the backend does not support (ADR-019 §7). The dev-bypass notice still says
plainly that the endpoint still demands a syntactically valid six-digit code.

**Measured, not asserted.** All 16 colour pairings the page renders were
computed in both modes: 12 direct token pairs and 4 wash composites. Every one
clears 4.5:1 — lowest is the primary button at 4.56:1 dark / 6.45:1 light,
lowest notice is light-mode error text at 4.76:1.

Rendered output was read back from the build rather than assumed:
`.next/server/app/login.html` carries `data-admin-theme="fastfood-navy"` on the
`ff-admin-login` wrapper, all 24 hashed module classes are present, and no
`class="…undefined…"` remains anywhere.

| Gate                                            | Result                       |
| ----------------------------------------------- | ---------------------------- |
| `tsc --noEmit`                                  | exit 0                       |
| `vitest run`                                    | 104/104                      |
| `next build`                                    | exit 0, `/login` prerendered |
| `eslint src`                                    | 0 errors                     |
| `prettier --check`                              | exit 0                       |
| `gates.cjs` · comment balance                   | 0 failures · 0 broken        |
| dead rules · undefined classes · undefined vars | 0 · 0 · 0                    |
| `light-dark()` coverage                         | 624 / 561 / 63, unchanged    |
| WCAG contrast, 16 pairings × 2 modes            | 0 failures                   |

Backup: `backups/2026-10-07-login-redesign/`.

### A9-19 — /login brand rail, and a step rail that was never a CSS problem

`/login` was asked to be fuller: an image, more copy, and the company logo. The
request was small; the two things it turned up were not.

**The step rail wrap was a markup bug.** The screenshot showed the first step
stacked — "1" above "Kimlik" — while the second step read "2 DOĞRULAMA" on one
line. The stylesheet was not at fault. Step 1 rendered `styles.stepActive`
_alone_; step 2 rendered `styles.step` plus a modifier. `.stepActive` only sets
`color`, so step 1 lost `display: flex` and its items stacked vertically. The
diagnosis had been queued as a flex/`white-space` problem, which is why the
first instinct was wrong: no amount of `flex: 0 0 auto` on `.step` would have
fixed a class that is never applied to it. `.step` is now always present and
only the modifier varies; `flex: 0 0 auto` and `white-space: nowrap` are kept as
a backstop, not as the fix.

**Which logo is the company's logo.** `apps/admin-web` had no `public/` at all,
so the obvious move was to use the logo already sitting in the Stitch reference
folder — which is `BURGER HOME`. That is not a template placeholder. Measured
across the repository: seed storefront copy, `BURGER HOME CLUB` in
`seed-club-engagement.ts` and the API unit tests, the loyalty program name, and
`Burger Home Alev Teknolojiler A.Ş.` as the commercial entity. FASTFOOD is the
platform code name. So the wordmark is the real brand mark, and the repo
already ships it: `apps/storefront-web/public/storefront/assets/brand/burger-home-wordmark.png`,
the file `storefront/lib/brand-copy.ts` exports as `WORDMARK_SRC`. That master —
not a re-drawn or AI-generated mark — is what `apps/admin-web/public/brand/`
now points at.

**Asset provenance, stated because two files are not equal.** The admin copy is
a 600×200 derivative of the 1500×500 master: the rail renders the mark at
208px, the master is 128 KB, and the mark is the LCP element, so the master
would have been the heaviest byte on the login page's critical path.
127,939 → 37,303 bytes. The hero is a generated brand visual (night service
pass, no signage, no text, no people) resampled 1200×896 → 900×672,
689,428 → 51,922 bytes. Both were re-encoded rather than dropped; the alpha
channel was measured before and after the resize (18067 opaque / 64353 clear
→ 2663 / 10126 on a 9× smaller sample grid) to prove the key-out survived. The
hero is a replacement slot for a real branch photograph and carries no product
claim.

**The rail states scope; it is not navigation.** The area table is derived from
`ADMIN_NAV_SECTIONS` — the same constant the sidebar renders — and the counts
are counted from that array at module scope, never typed. This matters more than
it looks: `admin-nav.ts` still carries a comment calling the array "23 entries
in six areas" while the array holds 22, so a hand-written "23 ekran" would have
been a second source of truth that is already wrong. The rendered meta line is
cross-checked against the source array in the render gate, which is why it
currently reads 22. Per ADR-019 §7 nothing in the rail is a link: an
unauthenticated visitor following `/orders` could only reach the
access-denied surface, so the entries are rows, not controls.

**Layout.** The rail scrolls internally from 900px (`overflow: auto` also drops
the grid item's automatic minimum size, so a short viewport scrolls the rail
instead of stretching the page). The photograph and the scope table are
desktop-only; on a phone they would push the form below the fold for
decoration. Both images ship intrinsic dimensions, so neither shifts layout on
load; the wordmark is `priority` and is confirmed preloaded
(`<link rel="preload" as="image">`), the hero is lazy.

**A measurement trap worth recording.** The first render check reported seven
failures on a page that was correct. JSX emits `<!-- -->` between adjacent text
nodes, so `22 ekran · 6 alan · tek oturum` never appears as one contiguous
string in the HTML, and Next's RSC flight payload is full of the literal
`$undefined`, which is a serialization marker rather than a broken attribute.
The scan now runs against `<body>` with script bodies removed. A check that
prints its own match is worth having; one of the seven "failures" printed a
`<link rel="preload">` for a _font_ while asserting something about the image,
and only a direct re-read caught that the evidence on display was not the
evidence being asserted.

| Gate                                            | Result                       |
| ----------------------------------------------- | ---------------------------- |
| `tsc --noEmit`                                  | exit 0                       |
| `vitest run`                                    | 104/104                      |
| `next build`                                    | exit 0, `/login` prerendered |
| `eslint src`                                    | 0 errors, 11 warnings        |
| `prettier --check`                              | exit 0                       |
| dead rules (fixpoint over 4,706)                | 0                            |
| undefined classes (1,267 `styles.*` references) | 0                            |
| undefined custom properties                     | 0                            |
| scope reachability · comment balance            | 0 out of scope · 0 broken    |
| prerender cross-check, 33 assertions            | 0 failures                   |

Rollback for both files is `backups/2026-10-07-login-redesign/` (the A9-18
state); `apps/admin-web/public/brand/` is new and can simply be removed.

### A9-20 — the verification-code step, removed where the server already removed it

`/login`'s second step was asked to go: only the password check should remain.

**Why the step existed at all.** `POST /auth/staff/login` never returns an
access token. `StaffAuthController.login` answers `{ userId, refreshToken,
refreshExpiresAt, mfaRequired }` — verified at `staff-auth.controller.ts:230` —
while `createAdminClient` attaches only `ff_staff_access_token`
(`apps/admin-web/src/lib/api.ts`). A session therefore cannot be opened without
a second call, and the MFA verify endpoint was that call. Deleting the step
without replacing it would have produced a login form that always fails.

**Why it was still ceremony locally.** `StaffAuthService.login` returns
`mfaRequired: !this.#mfaBypassEnabled` (`staff-auth.service.ts:250`) and bypass
is `NODE_ENV !== 'production' && ALLOW_DEV_MFA_BYPASS === 'true'`
(`:39`). The repository `.env` sets `NODE_ENV=development` and
`ALLOW_DEV_MFA_BYPASS=true`, so the server answers `mfaRequired: false`. And
`verifyMfa` checks the code only when bypass is OFF (`:290`), returning
`MFA_NOT_VERIFIED` otherwise — so with bypass on it accepts any six digits. The
page was asking a human tester to type a code that is not checked, and it even
said so in a notice.

**What changed.** The page now follows the server instead of always rendering
two steps:

- `mfaRequired: false` → no second step at all. The login refresh token is
  exchanged at `POST /auth/staff/mfa/verify` — the same call the human step
  made, with a well-formed placeholder instead of a typed one. The step rail,
  the TOTP field, `AUTH_SESSION_EXPIRED` handling and the challenge-expired
  restart all survive untouched for `mfaRequired: true`, which is the
  production path.

**No security control was removed.** The placeholder is only ever sent on the
branch the server opened by answering `mfaRequired: false`, and in that state
`verifyMfa` does not read the digits. With bypass off the server reports
`mfaRequired: true` and the branch stops running, so this degrades to the real
challenge rather than failing open. Turning MFA off everywhere — including
production — is a different request, one that needs a human decision and an
ADR; it was not taken here. The backend is untouched: no controller, service,
schema or config changed.

**The first attempt was wrong and is worth recording.** This section
originally claimed the login refresh token could be exchanged at
`POST /auth/staff/refresh`. It cannot. That endpoint opens with

```
if (!browserSession) {
  throw new ForbiddenException({
    code: ErrorCodes.AUTH_SCOPE_DENIED,
    message: 'Staff refresh requires the MFA-established browser session cookie.',
  });
}
```

and `browserSession` is `isCourierWebRequest`, which requires the request origin
to equal `COURIER_WEB_ORIGIN` (default `http://localhost:3102`); the cookie it
reads is `ff_courier_refresh`. Admin runs on 3101, so the endpoint is
structurally unreachable from admin-web and answers **HTTP 403
`AUTH_SCOPE_DENIED`** — observed live, which is exactly the error the human
owner hit. `StaffAuthService.refresh` was read in isolation and read as
available; the controller guard above it is what decides.

The revision passed every static gate in this section — lint, types, tests,
build, CSS, and a 34-assertion prerender cross-check — while being incapable of
working. None of those gates execute a request. The flow is now verified by
running it against the live local API:

| Step                                               | Result                                         |
| -------------------------------------------------- | ---------------------------------------------- |
| `POST /auth/staff/login`                           | `mfaRequired: false`, refreshToken, no token   |
| `POST /auth/staff/refresh`                         | **HTTP 403 `AUTH_SCOPE_DENIED`** (as reported) |
| `POST /auth/staff/mfa/verify` with the placeholder | accessToken issued                             |
| `GET /auth/staff/me` with that access token        | HTTP 200, full permission set                  |

**Dead code removed with it.** The `bypassEnabled` state, the "Bu ortamda ikinci
faktör kapalı" notice and the `.noticeInfo` rule are gone; the notice was
unreachable once the step stopped rendering. `login.module.css` now reads 46
unique tokens instead of 49 — the three `--ff-status-info-*` roles it used were
only referenced by that rule. A `staffRefreshSchema` added for the broken path
was reverted rather than left exported; `lib/schemas.ts` is byte-identical to
its pre-A9-20 state.

**The step rail now lies less.** The client cannot know whether a challenge is
coming until `login` answers, so the "Doğrulama" item is rendered only once the
MFA step is open. Before the change the rail advertised a second step that this
environment never reaches.

| Gate                                            | Result                         |
| ----------------------------------------------- | ------------------------------ |
| `tsc --noEmit`                                  | exit 0                         |
| `vitest run`                                    | 104/104                        |
| `next build`                                    | exit 0, `/login` prerendered   |
| `eslint src`                                    | 0 errors, 11 warnings          |
| `prettier --check`                              | exit 0                         |
| dead rules (fixpoint over 4,705)                | 0                              |
| undefined classes (1,266 `styles.*` references) | 0                              |
| undefined custom properties                     | 0                              |
| scope reachability · comment balance            | 0 out of scope · 0 broken      |
| prerender + source cross-check, 35 assertions   | 0 failures                     |
| **live flow against the running local API**     | **session opens, token works** |

**Known cost of this approach, stated rather than hidden.** A placeholder sent
to a verification endpoint is a compromise. The clean fix is a contract change:
have `POST /auth/staff/login` return the access token when it reports
`mfaRequired: false`, so no placeholder exists and the two-step flow becomes
unreachable for a disabled factor. That edits a published API payload and needs
an ADR (document 46); it is an owner's decision, not a client-side detail.

### A9-21 — every Admin page is full width

The owner asked for the whole console to be full width, with
`/catalog/products` named as the reference. It was a real constraint, not a
perception: 11 page modules capped their own root.

**What was measured.** All 31 Admin routes were audited by parsing each module
for a `max-width` declaration on its page root, rather than grepping. The grep
was tried first and was wrong twice — `container` matches every
`surface-container` token, and `@media (max-width: 1180px)` is a viewport
breakpoint, not a cap. Both produced noise that looked like findings.

Eleven modules carried `.page { max-width: …px }`, ranging 1220–1460:

| Module                                                             | Was    |
| ------------------------------------------------------------------ | ------ |
| `couriers`                                                         | 1460px |
| `payments`                                                         | 1390px |
| `catalog/allergens`                                                | 1350px |
| `promotions`                                                       | 1320px |
| `loyalty`, `branches/availability`                                 | 1280px |
| `branches`, `catalog/categories`, `catalog/modifiers`, `customers` | 1240px |
| `customers/[userId]`                                               | 1220px |

Two routes were capped without owning the rule: `/roles` renders
`${base.page}` where `base` is the promotions module, and `/payments/:id` uses
`payments.module.css`. Already full width and left alone: `products`,
`home-slides`, `kitchen`, `dashboard`, `users`, and every route on the shared
`ops-page` grammar (`/orders`, `/settings`, `/audit`, `/reports`, `/refunds`,
`/branches/service-areas`, `/branches/:id`) — `admin-ops.css:92` declares no
cap on it.

The reference explains the difference: `products.module.css` roots at
`.catalog`, which declares `display: grid; gap` and nothing else — no
`width`, no `max-width`, no `margin: 0 auto`.

**The change.** The `max-width` line was deleted from those 11 `.page` rules
and replaced in place with a one-line marker, so anyone re-adding a cap meets
the reason. `width: 100%` and each page's own gutter were kept: the pages were
never short on width, they were only centred inside a cap, and their padding is
part of their own design. Written under a count guard — 11 files, 11
replacements, abort on any other number.

**Verified in a browser, not only in the stylesheet.** Playwright/Chromium at
1920×1080, signed in through the real UI, then every route measured via its
sidebar link (`data-admin-nav-item`, `ops-shell.tsx:472`):

| Route                                                                                                                                                           | Page root | Computed `max-width` |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------- |
| `/catalog/products` (reference)                                                                                                                                 | 1628px    | `none`               |
| `/couriers`, `/branches`, `/branches/availability`, `/catalog/categories`, `/catalog/modifiers`, `/customers`, `/loyalty`, `/payments`, `/promotions`, `/roles` | 1628px    | `none`               |
| `/orders`, `/users`, `/catalog/home-slides`, `/kitchen`                                                                                                         | 1628px    | `none`               |

16/16 identical, no computed cap anywhere. The only per-route difference is the
gutters each page brings itself: couriers 34px a side, branches-family 28px,
payments/promotions/roles 30px.

That first run also exercised the A9-20 path end to end: signing in through
the password-only form succeeded in a real browser and stored a 630-character
access token.

**A wrong metric, caught and corrected.** The first scoring compared `inner`
(root width _minus_ the page's own padding) and reported 11 routes as narrower
than the reference. They were not — those 11 "gaps" were exactly each page's
horizontal padding (68, 56 and 60px), i.e. the metric was punishing pages for
their intended gutters. The layout width the owner asked about is the root
element's width, which is uniform. The log was re-scored rather than re-run.

| Gate                                         | Result                                |
| -------------------------------------------- | ------------------------------------- |
| `tsc --noEmit`                               | exit 0                                |
| `vitest run`                                 | 104/104                               |
| `next build`                                 | exit 0                                |
| `eslint src`                                 | 0 errors, 11 warnings                 |
| `prettier --check`                           | exit 0                                |
| page roots with a px `max-width`             | 0 of 11                               |
| `max-width` ≥ 900px anywhere in admin-web    | 0                                     |
| **browser measurement, 16 routes at 1920px** | **all 1628px, all `max-width: none`** |

Rollback is the table above: re-add one line per file.

### A9-22 — `/branches/service-areas` rebuilt, and an unreachable state removed

The page was asked to be redesigned from scratch. It was the last service-area
surface still on the shared `ops-*` grammar, and reading the API before drawing
it turned up a column that could not render.

**The contract, read first.**

| Call                                          | Permission                     |
| --------------------------------------------- | ------------------------------ |
| `GET admin/branches/:branchId/service-areas`  | `branches.read`                |
| `POST admin/branches/:branchId/service-areas` | `branches.service_areas.write` |

That is all. There is no PATCH, PUT or DELETE for a service area
(`admin-branch.controller.ts` declares only the two), and
`createServiceArea` always writes `isActive: true`. So the page renders a
create control and a list, and deliberately no edit button, no delete and no
active/inactive toggle: anything else would be a control the API cannot back
(ADR-019 §7).

**The unreachable column.** `listServiceAreas` filters `where: { isActive: true }`
on the Prisma path and `sa.isActive && …` on the in-memory one
(`branch.service.ts:276`, `:281`). The previous table rendered an
`Aktif` / `Pasif` badge whose second state could therefore never appear. It
read as though an operator could deactivate an area and could not. The status
column is gone, and the page says why instead of implying a missing button:
"Alan kaydedildiğinde aktif olur; API pasife alma uç noktası sunmuyor."

**Priority copy follows the code, not the comment.** `RoutingService.assign`
keeps the candidate when `candidate.priority < winner.priority`
(`routing.service.ts:47`), so the smallest number wins. The docblock above that
function still says "higher priority overrides lower priority", which the code
contradicts. The UI says the smaller number wins, because the code is what
assigns the branch. The `/branches` dialog creates areas too and must not be
left telling operators the opposite.

**Why the composer reads the geometry back.** `coordinates` is `z.unknown()` in
`createServiceAreaSchema`, so the API checks the envelope and nothing else: a
swapped axis or a malformed ring is stored and only surfaces later, when a
customer address falls outside every area. So the composer parses as you type
and shows type, ring count, vertex count and the bounding box, and refuses to
submit a pair outside ±90 / ±180. `readPolygonFacts` and `formatBbox` were
added to `lib/fulfillment-ops.ts` next to the existing helpers; nothing existing
was changed, and `parsePolygonGeoJson` is shared with `/branches` so both
surfaces keep identical validation.

**Composition.** Full width, no cap (A9-21), in the house grammar: breadcrumb and
title, a four-cell KPI strip computed from the response, then a 420px sticky
composer beside the areas table, stacking under 1180px. The composer is gated on
`service-areas / create`; without it the form is replaced by a note naming the
permission rather than a disabled control.

**Two defects the static gates did not catch**, both found by driving the real
page in Chromium:

- The malformed-GeoJSON message was gated behind a `touched` flag, so a
  half-typed paste raised nothing until the field lost focus — the error was
  silent exactly while the operator was typing. It is now reported immediately,
  which is the whole point of parsing on keystroke.
- `readyToSubmit` did not include the bounds check, so a polygon the page was
  simultaneously labelling "outside WGS84" could still be saved.

A third warning — `react-hooks/exhaustive-deps` on a conditional `[]` in the
render path — was fixed at the root rather than suppressed, by giving the empty
case a module-level constant so both memos keep a stable reference.

| Gate                                            | Result                    |
| ----------------------------------------------- | ------------------------- |
| `tsc --noEmit`                                  | exit 0                    |
| `vitest run`                                    | 104/104                   |
| `next build`                                    | exit 0, route prerendered |
| `eslint src`                                    | 0 errors, 11 warnings     |
| `prettier --check`                              | exit 0                    |
| undefined classes (1,311 `styles.*` references) | 0                         |
| undefined custom properties · comment balance   | 0 · 0 broken              |
| dead rules (fixpoint over 4,779)                | 0                         |
| **Chromium at 1920px, 20 assertions**           | **0 failures**            |

Measured in the browser: page root 1628px with `max-width: none`, matching the
A9-21 reference; two columns at 420px + 1134px; at 900px the columns collapse to
one and nothing overflows. The composer was exercised with four inputs — valid
Polygon, MultiPolygon, out-of-range coordinates and malformed JSON — and the
submit gate was checked in each state.

### A9-23 — the "new branch" flow on `/branches`, rebuilt

The owner asked for the add-a-branch screen to be redesigned from scratch.

**The contract was read before the markup.** `createBranchSchema`
(`admin-branch.controller.ts:35`) accepts `code` 1–32, `name` 1–128,
`addressLine` 1–255, `latitude` −90..90, `longitude` −180..180, an optional
`phone` matching `/^\+\d{10,15}$/`, and `minOrderMinor` / `deliveryFeeMinor` as
`/^\d+$/` strings. `updateBranchSchema` is narrower and, importantly, carries no
coordinates. So: code and latitude/longitude are editable only when creating,
and that is what the form now shows.

**One form, not two.** `create` and `edit` render the same profile form inside
the same overlay; only the tab strip differs. Drawing a separate create screen
would have duplicated eight inputs, one validator and one money conversion, so
the redesign landed on the shared form and both modes inherit it. Edit keeps its
three tabs, its read-only code and coordinates, and its order-acceptance
control — that control simply moved into a fourth labelled section instead of
floating below the grid.

**What the form looks like now.** Three labelled sections replace the flat
two-column grid, and a 262px summary rail sits beside them. The dialog widened
from 820px to 1000px to hold the pair.

| Section             | Holds                                         |
| ------------------- | --------------------------------------------- |
| `KİMLİK`            | name, code — with `n/128` and `n/32` counters |
| `KONUM VE İLETİŞİM` | address, the coordinate pair, phone           |
| `SİPARİŞ ÜCRETLERİ` | minimum order, delivery fee                   |
| (edit only)         | order acceptance, with its confirm-on-pause   |

Latitude and longitude are now **one control**, not two unrelated inputs: they
share a row, both are labelled, and one readout line beneath them states either
the parsed degrees or why the pair is unusable. The rail repeats only what the
form cannot show — the formatted amounts (`50 ₺`), the code, and a
ready/blocked line counting the missing fields.

**Validation moved to one tested source of truth.** It used to live inline in
`saveProfile`, which meant one rule per branch of one function. `checkProfile()`
now sits in `lib/fulfillment-ops.ts` next to the coordinate and phone helpers it
uses, returns a discriminated union (`ok: true` carries the wire values, `ok:
false` carries the first invalid field in visual order), and `saveProfile`
cannot read a value the validator did not prove. 19 unit tests were added there,
covering every rule the server enforces.

Two behaviours the tests pinned down rather than assumed:

- `parseCoordinate('')` returns **0**, and 0 is a valid latitude, so an empty
  coordinate passes a naive range check. The empty-string rule has to run first
  or a blank branch lands at null island. Covered by
  "treats an empty coordinate as missing rather than as zero".
- Edit mode must **not** validate code or coordinates. PATCH does not carry
  them, and the coordinate fields render read-only; a legacy branch with a blank
  stored coordinate would otherwise become unsaveable. Covered by "never
  validates code or coordinates" and "validates a read-only legacy coordinate".

One test of mine was wrong and the suite said so: `+9055511122` has ten digits
after the plus and is therefore valid under `/^\+\d{10,15}$/`. The assertion was
corrected to test the real boundaries (9 rejected, 10 and 15 accepted, 16
rejected) rather than to make the code agree with me.

**Field errors are attached to fields.** Each input gets `aria-invalid` and, when
it fails, a `aria-describedby` pointing at its own message; the first invalid
field takes focus on submit. The form carries `noValidate` so these messages are
the ones shown rather than the browser's, and the money fields state their exact
wire value (`5000 kuruş olarak gönderilir`) because the API takes minor units.

| Gate                                            | Result                    |
| ----------------------------------------------- | ------------------------- |
| `prettier --check`                              | exit 0                    |
| `eslint src`                                    | 0 errors, 11 warnings     |
| `tsc --noEmit`                                  | exit 0                    |
| `vitest run`                                    | 123/123 (was 104)         |
| undefined classes (1,330 `styles.*` references) | 0                         |
| undefined custom properties · comment balance   | 0 · 0 broken              |
| dead rules (fixpoint over 4,813)                | 0                         |
| `next build`                                    | exit 0, route prerendered |
| **Chromium 1920px + 900px, 45 assertions**      | **0 failures**            |

Files: `app/branches/page.tsx` 56,464 → 67,612 bytes;
`app/branches/branches.module.css` 39,411 → 43,383;
`lib/fulfillment-ops.ts` 7,502 → 12,846; `lib/fulfillment-ops.test.ts` 4,292 →
13,436.

**Verified in a browser afterwards.** Once the dev server was reachable on its
own origin, the rebuilt screen was driven end to end in Chromium at 1920x1080 and
900x1100, signed in through the real UI, and submitted for real:

- dialog 1000px wide; two columns measured 696px + 262px; three labelled
  sections present; latitude/longitude render as one control with two slots.
- empty submit attaches a message to each failing field, focuses
  `#branch-field-name`, and the summary rail reads "5 alan eksik"; correcting a
  field clears its message while typing; the rail flips to "Zorunlu alanlar
  tamam."
- counters track the typed length (19/128, 9/32); `aria-invalid` is set on a
  rejected coordinate; the readout prints
  `WGS84 derece · 41.00820, 28.97840` and rejects 999 / 181 with the right range.
- the money line reads `5000 kuruş olarak gönderilir` and the rail shows
  `50 ₺` / `9.90 ₺`; `1.999`, `05551112233` and an empty amount are all refused.
- **live create**: `POST /admin/branches` returned **201**, the server echoed the
  code, and the stored row carried the wire values verbatim —
  `minOrderMinor: "5000"`, `deliveryFeeMinor: "990"`, `latitude: 41.0082`,
  `longitude: 28.9784`, `phone: "+905551112233"`. The branch list grew by
  exactly one.
- **edit regression**: three tabs, four sections, the summary rail, read-only code
  and coordinates, the stored coordinate read back
  (`WGS84 derece · 37.003246, 35.367452`), the order-acceptance toggle, and both
  the hours and coverage tabs still work; Escape closes.
- at 900px the grid collapses to one column (834px), the rail **paints** above
  the form (top 284px vs 460px), and nothing overflows (`scrollWidth` 900).

45 assertions, 0 failures. Screenshots: `branch-create-1920.png`,
`branch-edit-1920.png`, `branch-create-900.png`.

Three of the four failures on the first browser run were **my measurements**, not
the app: a `[role="tab"]` query scoped to the document instead of the dialog (the
sidebar's own two tabs were counted), a row count compared against a
page-size-capped table instead of the API total, and `firstElementChild` used to
judge a CSS `order: -1` — `order` repaints, it does not move a node in the DOM,
so only `getBoundingClientRect()` can answer where the rail lands. The fourth was
a missing `await` on `resp.text()`. All four were re-measured correctly rather
than waived.

**A defect the first browser pass could not see.** At 900px the summary rail went
full width and stacked its four rows, which cost about 270px of height and pushed
the entire form below the fold — the operator opens the dialog and reads a
summary before reaching a single input. The screenshot made it obvious; the
assertions had all passed, because "the rail paints above the form" was the
question that was asked, and it was true. `.summaryList` now uses
`repeat(auto-fit, minmax(140px, 1fr))` below 900px, so the same four facts sit
in one 156px strip and the form starts 126px earlier. Re-measured: rail height
156px, sections top 460px.

**Residue.** The API exposes no `DELETE` for branches, so every browser run leaves
a row behind. Five were created across the runs (`QA-A923`, `-2`, `-3`, `-4`,
`-5`) and all five were deleted from the dev database with a `deleteMany`
scoped to `code startsWith "QA-A923"`; the branch count went 19 -> 15, which is
where it started.

### A9-24 — softer corners, and the theme layer that silently undid them

The owner asked for `/branches` to read as an enterprise tool with soft corners.
The first pass edited the base rules in `branches.module.css` and passed every
static gate. In the browser it had almost no effect.

**Why.** The file ends with a Navy theme block whose selectors are
`:global([data-admin-theme='fastfood-navy']) .class` — specificity 0,2,0 — against
bare `.class` rules at 0,1,0. Those rules win, and they re-declare the same
`border-radius` properties. Measured before this pass, with the dialog open:

| Element          | Base rule said | Navy override said                 | Browser said |
| ---------------- | -------------- | ---------------------------------- | ------------ |
| `.gridPanel`     | 12px           | 8px                                | **8px**      |
| `.search`        | 8px            | 4px                                | 4px          |
| `.toolButton`    | 4px            | —                                  | 4px          |
| `.primaryButton` | 8px            | 4px (grouped with the small links) | **4px**      |

`.gridPanel` at 8px while its own `.gridHeader` stayed at 12px is the visible
tell: mismatched corners on the panel's top and bottom edges. The pass had
silently edited the layer that loses.

**The fix is one policy applied to both layers**, so they cannot diverge again:

| Tier             | Token              | px  | Members                                                                                                                           |
| ---------------- | ------------------ | --- | --------------------------------------------------------------------------------------------------------------------------------- |
| surfaces         | `--ff-radius-full` | 12  | grid panel, dialog, form sections, summary rail, state panel, column menu, status control, confirm box                            |
| controls         | `--ff-radius-xl`   | 8   | primary/secondary/tool buttons, row actions, search well, inputs and selects, filter chips, pagination, close button, dialog tabs |
| chips and badges | `--ff-radius-lg`   | 4   | status badges, notices, inline errors, marks, the small inline links                                                              |

No new scale was invented — ADR-019 already fixes the shape scale at 2/4/8/12, and
8px controls under 12px surfaces is what the enterprise tools this is imitating
do. 34 rules were rewritten, 16 were already at target and were asserted rather
than touched, and 4 rules were added because a shared selector could not express
the split. `.hourRow input[type='time']` turned out to have **no radius at all**,
which is why the time inputs rendered square next to the 8px fields on the profile
tab; it now matches them.

Measured after, dark and light, dialog open and closed: grid panel 12, grid header
12, search 8, tool button 8, primary button 8, row action 8, status chip 4, dialog
12, form section 12, summary rail 12, field input 8, dialog tab 8, time input 8.

### A9-25 — the overlapping tab strip, and a root cause that was not the obvious one

The screenshot showed the edit dialog's tab labels overprinted. The first diagnosis
was that the icon font was failing to load, and it was wrong.

**Measured:** the Google Fonts stylesheet returns 200, the `.woff2` returns 200,
there are no failed requests, `document.fonts.check()` is true, and 59 of 59 icons
on the list page resolve to `Material Symbols Outlined`. The font was never the
problem.

**The actual cause** was a `font` shorthand on an ancestor:

```css
.dialogTab span,
.dialogTabActive span {
  font: 10px var(--ops-font-mono, 'JetBrains Mono', monospace);
}
```

`font` resets every font sub-property, so at 0,1,1 this rule overrode the icon's own
`.material-symbols-outlined` rule at 0,1,0 and forced the span to 10px JetBrains
Mono. A monospace face has no Material Symbols ligatures, so the browser painted
the raw ligature text — `edit_note`, `schedule`, `near_me` — inside a glyph-sized
box, and that ink ran across the label beside it.

The tab markup is `<OpsIcon name={icon} /> {label}`: an icon span and a text node.
There is no badge span, so this rule was left over from a badge that no longer
exists — dead intent, live harm, and the reason a "dead rule" audit reports zero
while a visibly broken element is on screen. It was removed rather than narrowed.
The global icon rule now carries a `:root` prefix (0,2,0) so that any future
`font:` shorthand on a container cannot silently swap the icon font out from under
a glyph span.

**A regression this task introduced and then fixed.** `overflow-x: auto` was added
to `.dialogTabs` as a narrow-viewport guard. Because a non-visible overflow on one
axis makes the other compute to `auto`, that turned the strip into a scroll
container on both axes — and `.dialogTabs` had no `flex`, so as a flex item of the
`.dialog` column it defaulted to `0 1 auto` and was squeezed, clipping the tabs
vertically. `flex: 0 0 auto` restores it. This was visible in the screenshot and
in no static gate.

**Four of the measurements were wrong, not the page.**

1. `scrollWidth` is the wrong instrument for "did the ink escape". An element with
   `overflow: hidden` still reports its full scrollable overflow area, so
   `scrollWidth(66) > clientWidth(20.7)` says nothing about painting. It is now a
   pixel test: crop the label region with the icon rendered, hide the icon, crop
   again, compare SHA-256. The crops must be identical.
2. That crop started 8px before the icon's right edge, so it included the icon's
   own last pixels and the comparison could never pass.
3. It then started at the SMALLEST icon right edge across all three tabs, which
   put the 2nd and 3rd icons inside the crop — hiding them legitimately changed it.
   The crop has to be per tab: from that tab's own icon edge to that tab's right edge.
4. The radii table read the dialog-scoped selectors while the dialog was closed,
   which is why all of them came back `null`; and it looked for `div[class*="search"]`
   when `.search` is a `<label>`.

The control in the pixel test also had to be inverted per mode, because the two
states are opposites: with the real glyph the clip removes nothing, so removing it
must change _nothing_, while in the degraded state removing it must change the
label — that change is the overlap being prevented. An earlier control asserted
"removing the clip always changes the crop", which is false precisely when
everything is working.

**Verification.** Chromium at the reported viewport (1499x1101), dark and light:
all radii exactly on target in both list and dialog; 3 tabs with no overlap, no
spill and no scrolling; every one of the 324 icon instances across the list, all
three edit tabs and the create dialog resolves to the icon font; the tab strip is
no longer clipped vertically; and the pixel test confirms, per tab and in both the
healthy and the degraded state, that no icon paints into its own label. The icon
content width fell from 66px to 21px, which is the raw ligature text becoming a
single glyph. Static gates: prettier write 0 / check 0, eslint 0 errors and 11
warnings, tsc 0, 123/123 tests, `styles.*` references 0 of 1330 unresolved, 0 dead
rules of 4819, 0 custom properties read but never defined, 0 malformed files.

### A9-26 — the `/branches` datagrid recoloured, in both themes

The owner asked for the page to be redesigned in dark and light with the datagrid
recoloured from scratch. The colour work was done from measurement, not from the
source: the stylesheet and the rendered page disagree, because the theme layer at
the bottom of `branches.module.css` wins at 0,2,0.

**What was actually wrong, measured in both themes:**

| Finding                                   | Evidence                                                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every row carried a saturated orange slab | `.branchLink` was grouped with `.primaryButton` in the theme block's buttons rule, inheriting `background: var(--ff-primary-container)` — #f97316 dark, #a9380a light      |
| Row hover broke on the first cell         | the theme block pinned `.table td:first-child` to the panel surface, so hovering raised seven cells and left a notch                                                       |
| Blue did three unrelated jobs             | paused status, delivery/pickup capability, and — through `--ff-status-info` — the branch manager                                                                           |
| One class served two columns              | `statusOpen`/`statusPaused` was used for both order intake **and** branch manager, which is why "Atanmadı · Kullanıcılardan davet edin" rendered as a full-width blue pill |
| The grid did not fit                      | table 1389px in a 1149px box — "Teslimat ücreti" and "İşlem" were entirely off-screen and the row action was unreachable                                                   |
| Money borrowed the status green           | `.money` used `--ff-status-ready-text`, the same green as "Açık"                                                                                                           |

**One correction to a previous conclusion.** The rows measuring identically is
not a dead zebra: the theme block says `table: label header, divide-y, no zebra`,
so a uniform row surface is the recorded intent. The _real_ leftover was the
identical even-row rule in the base layer, which has had no effect for as long as
the theme block has existed. It was deleted rather than revived, and the grid's
one elevation is hover.

**Colour policy.** `--ff-status-warn` resolves to #f97316 in dark and #c2410c in
light — both are the brand orange, so amber cannot mean "caution" here without
reading as a second primary. Paused therefore takes the neutral tier:

| State                | Tier                 | Why                                      |
| -------------------- | -------------------- | ---------------------------------------- |
| open                 | ready green          | the only genuinely-positive state        |
| paused               | neutral surface      | not an error and not a caution           |
| inactive record      | critical red         | a record that cannot take orders at all  |
| capability, identity | neutral / on-surface | a channel is not an alert; money is data |

The branch manager got its own `.managerCell` / `.managerPending` chip, and money
moved to `--ff-on-surface` in tabular mono. The mark chip keeps the brand accent,
which the theme block had greyed out.

**Width.** The two widest columns were spending pixels on characters that were
truncated anyway — `.address` ellipsised at 260px and the pending chip repeated
the same long sentence. Address 260 -> 128, manager chip capped at 152px, and the
gutter tightened on the header. The column set is unchanged, because those columns
are data the owner asked to keep. Result: 1389 -> 1149px, overflow 0.

**Verification.** Chromium at 1499x1101, dark and light, 22 claims and 0 failures:
the identity cell is transparent, the mark keeps the accent, paused and channels
are neutral, money is not the status green, the manager column is not a status
pill, all rows share one surface, hover raises all eight cells including the first,
the grid fits with the action column in view, and the pending manager label
ellipsises instead of stopping mid-word — that last one needed a real fix, because
`text-overflow` only applies to a block container and the chip is `inline-flex`, so
the label needed its own box inside it. Static gates: prettier write 0 / check 0,
eslint 0 errors and 11 warnings, tsc 0, 123/123 tests, `styles.*` references 0 of
1334 unresolved, 0 dead rules of 4825, 0 custom properties read but never defined.

### Open finding, not fixed here — `.statusInactive` has never rendered

"Kayıt pasif" is the one state that earns the critical colour, and it is now a
distinct class. No branch in the dev database currently has `isActive === false`,
so the style resolves and is covered by the class-reference gate, but it has not
been seen on screen. It will first appear when a branch is paused and left paused,
or when a branch is created — and per the A9-23 finding a newly created branch _is_
inactive, so this path is reachable from the "Yeni şube" flow.

### Open finding, not fixed here — `font:` shorthands can still strip the icon font elsewhere

The A9-25 defect class is a `font` shorthand on a selector that can match an icon
span. `branches.module.css` alone contains 32 of them, and the equivalent exists in
the shared `components/ops/*.module.css` files. The `:root` guard added in A9-25
now makes the global icon rule win that contest on every page, so the failure can
no longer reach a glyph span, but the shorthands themselves are still wrong: any
future element placed inside one of those selectors will silently lose its intended
typography, not just its icon font.

A full audit is out of scope here because it spans pages this task did not touch
and would need each surface rendered to confirm what the shorthand was meant to
style. It needs an owner to scope it.

### Open finding, not fixed here — Next.js 16 blocks the dev HMR socket from `127.0.0.1`, and hydration never starts

Found while verifying A9-23, after the "the network is down" explanation turned out
to be wrong. Recorded because the symptom is identical to a dead page and the
obvious first hypothesis is wrong.

The Admin dev server logs, once you know to look:

```
Blocked cross-origin request to Next.js dev resource /_next/hmr from "127.0.0.1".
```

Opening the console at `http://127.0.0.1:3101` therefore produces: SSR HTML
renders, every chunk loads, react-dom runs and prints its DevTools banner — and
then nothing. `window.__next_f.length` stays `0`, no element ever carries a
React fiber, the login form submits natively
(`/login?identifier=…&password=…`), no token is stored, `canCreateBranch` is
false, and the create button never renders. From the outside it looks like a
blank or broken page.

Measured, same code, same server, two origins only:

| Origin opened in Chromium | React fiber on `#identifier` | Verdict      |
| ------------------------- | ---------------------------- | ------------ |
| `http://localhost:3101`   | 1                            | **HYDRATED** |
| `http://127.0.0.1:3101`   | 0                            | NOT HYDRATED |

The fix is not in this repository — use `localhost`, or add `127.0.0.1` to
`allowedDevOrigins` in `next.config.mjs` if a raw IP is ever needed. Nothing was
changed in `next.config.mjs` for this.

Two wrong turns are worth keeping, because both cost real time:

- **"React's internals are non-enumerable."** The first probe used
  `Object.keys(el)`, which reports zero React internals on a perfectly healthy
  page, because React attaches them with
  `defineProperty(…, { enumerable: false })`. It "confirmed" hydration was
  broken for the wrong reason. `Object.getOwnPropertyNames` is the correct probe.
- **"The missing network is the cause."** WSL genuinely had no outbound network
  then (`curl https://example.com` exited 7), `next build` genuinely failed on
  `next/font/google`, and the untouched baseline failed identically — so the
  correlation was perfect. But hydration stayed broken **after** the network
  came back (`example.com` and `fonts.googleapis.com` both 200). The network
  explains the build failure and nothing else.

### Open finding, not fixed here — a new branch is created inactive and not accepting orders

Seen in the live create during A9-23 verification, not introduced by it.
`POST /admin/branches` accepts the payload and returns 201 with
`isActive: false, isAcceptingOrders: false`; neither field is in
`createBranchSchema`, so the client cannot set them and the create form
correctly offers no control for them. A freshly created branch therefore lands in
the list as "paused" until someone edits it. Not a defect in this task's code,
but it is not obvious from the UI either, so it is written down rather than left
as a surprise.

### Open finding, not fixed here — hard reload on any Admin route returns to `/login`

Found while measuring A9-21. It predates A9-21, which touched only CSS.

`ops-shell.tsx:163` redirects to `/login` when `loggedIn` is false, and
`loggedIn` is a `useSyncExternalStore` whose client snapshot reads
`getStaffAccessToken()` from `localStorage` (`:121`). Measured in Chromium: a
full page load of `/couriers`, `/` or `/catalog/products` renders first — the
API calls for that page all return 200 — and then bounces to `/login` **while
the 630-character token is still in localStorage**. Client-side navigation
works; only a hard reload bounces. The token is not cleared, so the operator is
not signed out, only stranded on the sign-in form.

Not diagnosed here: reproducing it needs a decision about whether the redirect
should wait for `access.loading` to settle before judging the session, and that
is a behaviour change to the auth shell. It also cannot be confirmed as
pre-existing without a baseline build, only as "not introduced by a CSS-only
change".

### Open finding, not fixed here — `admin-a6.spec.ts` is stale

`tests/e2e/tests/admin-a6.spec.ts` encodes the pre-redesign login surface and
no longer matches the page. Measured against the current `login/page.tsx`:

- `staffLogin()` waits for a heading matching `/FASTFOOD Ops/i` — the page's `h1`
  is "Personel girişi".
- It clicks a button named `Giriş yap` — the submit reads "Devam et".
- It looks for a button named `Doğrula` — the MFA submit reads "Girişi tamamla",
  and under A9-20 that step does not render at all unless the server demands it.
- It never fills the identifier or password fields before submitting, so it
  cannot pass a form whose inputs are `required`.

This was already broken before A9-20 — the heading and button labels changed in
A9-18, and the empty-submit call predates the rebuild. It was left alone
deliberately: the fix cannot be executed here (it needs a running admin server
and Playwright browsers), and editing a test that cannot be run would replace one
silent failure with another. It needs an owner with the environment to rewrite
and execute.

## Hard constraints

- No staging or production deployment.
- No Coolify, VPS, cloud release, public domain, or TLS work.
- No production credentials or providers.
- iyzico remains sandbox/test only.
- OTP/SMS remains fake/test only.
- No remote database migrations.
- CI verification is allowed; CD remains prohibited.
- App Store, Play Store, TestFlight, and equivalent releases remain prohibited.
- Synthetic development data only.

## Status update rule

AI agents may update factual technical progress only when the task includes
status synchronization. They may not change deployment, production,
authorization, execution-mode, or human-acceptance values without explicit
human-owner instruction. `HUMAN_ACCEPTED` is always human-owned.
