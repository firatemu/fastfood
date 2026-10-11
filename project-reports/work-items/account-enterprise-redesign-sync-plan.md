# Customer account surface — enterprise redesign (Web + Mobile visual parity)

## 1. Capability affected

`packages/contracts/src/customer-capability-registry.ts` rows consulted. No row changes.

| id | Current Web | Current Mobile | Moves? |
|---|---|---|---|
| `profile-me` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `address-crud` | `CHANGE_REQUIRED` / `IMPLEMENTED` | `CHANGE_REQUIRED` / `IMPLEMENTED` | No |
| `order-preferences` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `loyalty-balance` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `favorites` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `burger-home-club` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `ates-carki` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `table-qr-context` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `customer-inbox` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |
| `support-chat` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED_WITH_INTENTIONAL_DEVIATION` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED_WITH_INTENTIONAL_DEVIATION` | No |
| `server-logout-refresh` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` | No |

Per `.cursor/rules/35-customer-capability-impact.mdc` the registry is updated *"when impact or
status changes."* This work changes presentation only — every endpoint, payload, permission and
interaction contract stays exactly as it is — so no impact/status pair moves and
`docs/customer-platform/CUSTOMER_CAPABILITY_MATRIX.md` is not edited.

## 2. Web surface (`apps/storefront-web/src/**`)

New:

- `src/components/storefront/account-shell.tsx` — the shared frame. Owns `RequireCustomer`
  (moved out of `account-page.tsx`), the `<main>` landmark, the page header slot, the sticky
  account rail, and the mobile drawer. It deliberately does **not** own cards, grids, tabs or
  stacking; every page builds its own content region.
- `src/lib/storefront/account-security-posture.ts` + `.test.ts` — security state derivation.
- `src/lib/storefront/club-progress.ts` + `.test.ts` — tier progress derivation from the club
  snapshot. Both follow the repo's existing test surface (`src/lib/**/*.test.ts` only — the repo
  has no component tests).

Changed:

- `src/components/storefront/account-nav.tsx` — drop `/account/table` from the rail (it becomes a
  standalone task screen); keep a real route to reach it.
- `src/components/storefront/account-page.tsx` — asymmetric overview dashboard.
- `src/components/storefront/account-addresses-page.tsx` — two-column address book.
- `src/components/storefront/account-settings-page.tsx` — grouped preference ledger.
- `src/components/storefront/account-security-page.tsx` — risk-ordered security.
- `src/components/storefront/club-page.tsx` — hero + tier progress rail.
- `src/components/storefront/spin-page.tsx` — stage-first wheel, cooldown as the dominant state.
- `src/components/storefront/favorites-page.tsx` — product-forward, availability-aware grid.
- `src/components/storefront/notifications-page.tsx` — inbox with weight/dot read state.
- `src/components/storefront/support-page.tsx` — conversation surface.
- `src/components/storefront/table-page.tsx` — **standalone**, no rail, no `RequireCustomer`.

Import-path-only change (behavior must not change):

- `src/components/storefront/orders-list-page.tsx`, `src/components/storefront/shop-cart-page.tsx`
  — these import `RequireCustomer` from `./account-page`. Their source path changes; their
  behavior does not.

## 3. Mobile surface (`apps/customer-mobile/**`)

Per `.cursor/rules/35-customer-capability-impact.mdc` and ADR-008, this client is `CHANGE_REQUIRED`
in the **visual** sense: the human explicitly requested visual parity, so the ten screens are
genuinely redesigned rather than left as `AUTOMATICALLY_SUPPORTED`. Code is **not** shared with
Web — no DOM, no CSS, no copied stylesheets. Same backend APIs, independent visual systems.

- `app/(tabs)/account.tsx` — status strip + primary edit panel.
- `app/account/addresses.tsx`, `settings.tsx`, `security.tsx`, `club.tsx`, `spin.tsx`,
  `favorites.tsx`, `notifications.tsx`, `support.tsx`
- `app/table/index.tsx` — already decoupled from the account shell; verified, not restructured.
- `components/ui.tsx` / `components/nav-row.tsx` / `components/form-field.tsx` — extended only if a
  new primitive is genuinely required; no gratuitous change.
- `theme.ts` — unchanged. The dark palette already matches the Web brand surface.

## 4. Shared contracts

- `packages/contracts/**` — **no change.**
- `packages/api-client/**` — **no change.**

Every endpoint the redesigned screens call already exists:
`GET/PATCH /me`, `/me/preferences`, `/me/loyalty`, `/me/addresses` (CRUD),
`/me/address-geography/provinces|.../districts|.../neighborhoods`, `GET/POST/DELETE /me/favorites`,
`GET /me/notifications`, `PATCH /me/notifications/:id/read`, `POST /me/notifications/read-all`,
`GET/POST /me/support/conversations`, `GET/POST /me/support/conversations/:id/messages`,
`GET/POST /me/spin`, `GET /me/club`, `POST /me/club/welcome`, `GET /storefront/tables/:code`.
No new endpoint is required, so no ADR is required.

## 5. Capability registry move

| Field | Before | After |
|---|---|---|
| webImpact | see table in section 1 | unchanged |
| webStatus | see table in section 1 | unchanged |
| mobileImpact | see table in section 1 | unchanged |
| mobileStatus | see table in section 1 | unchanged |

## 6. Verification gates (must all be green)

- `pnpm --filter @fastfood/storefront-web lint` (`--max-warnings=0`)
- `pnpm --filter @fastfood/storefront-web typecheck`
- `pnpm --filter @fastfood/storefront-web test:unit`
- `pnpm --filter @fastfood/storefront-web build`
- `pnpm --filter @fastfood/customer-mobile lint` (`--max-warnings=0`)
- `pnpm --filter @fastfood/customer-mobile typecheck`
- `pnpm --filter @fastfood/customer-mobile test:unit`
- `pnpm check:customer-platform`
- Browser measurement pass (overflow, contrast, focus, touch target) on all ten Web routes.
- `/account/table` reachable **with an empty session** — the specific regression this decoupling
  invites.

## 7. Why this is not a single-client change

The capability layer is untouched, so the *contract* impact of each row is
`AUTOMATICALLY_SUPPORTED` and the registry legitimately does not move. The *visual* impact is not
automatic: the human explicitly asked for visual parity on the customer account surface, so the
Mobile screens are `CHANGE_REQUIRED` for presentation and are redesigned in this same pass.
Both clients therefore move together, which is what `.cursor/rules/45-customer-ui-sync.mdc`
section 2 requires. The one place where Web and Mobile intentionally diverge in **structure**
rather than look is `/account/table`: Mobile already ships it decoupled from the account shell,
and the operator rule for drift is to sync the lagging client, not the leading one — so Web is
brought in line with Mobile.

## Scope held

Dark-only. No light-mode or theme-toggle infrastructure is introduced. Evidence that this costs
nothing: `globals.css` contains **0** occurrences of `prefers-color-scheme`, `data-color-mode` and
`:root`, and the storefront uses **0** `dark:` Tailwind utilities — the `<html class="dark">` marker
is vestigial because every color comes from the `@theme` block, which is already dark-only.---

## Implementation status

Implemented. Web: 10 routes rebuilt on a single extracted frame. Customer Mobile: 5 screens rebuilt
for visual parity, 5 already expressed the same information architecture and were verified rather
than restyled for its own sake.

### New — `apps/storefront-web/src/components/storefront/account-shell.tsx`

The frame. It owns four things and deliberately nothing else: the auth gate (`RequireCustomer`,
moved here out of `account-page.tsx`), the `<main>` landmark, the page header
(eyebrow / title / description / actions), and the rail placement including its mobile collapse
(a real button with `aria-expanded` / `aria-controls`, not `<details>`, so the open state is under
React control). It does not own cards, grids, tabs or stacking — that is the mechanical guarantee
that the ten screens do not collapse into one repeated template.

`RequireCustomer` was imported from `./account-page` by 11 other files, including two out-of-scope
ones. All 11 imports were repointed to `./account-shell`; no re-export shim was left behind.
`orders-list-page.tsx` and `shop-cart-page.tsx` changed import line only.

### Per-page design

Each screen answers its own question and uses a different object language on purpose.

| Route | Design |
|---|---|
| `/account` | Asymmetric board: 4-up status strip → primary contact panel → recent orders → wide membership band. The signature is the verification strip: an unverified contact is the only place a warm accent is allowed to mean "act on this". |
| `/account/addresses` | Two-column ledger — selectable list left, sticky map right. Selection is a real `radiogroup` with `ArrowUp`/`ArrowDown` handling. |
| `/account/settings` | Dense preference ledger: grouped, flush full-width rows, hairline dividers, no card padding. Switches are visually-hidden native checkboxes with a `group-has-[:checked]` track and thumb. |
| `/account/security` | Risk-ordered. Derived posture header, then password as the single primary action, then verification rows, then linked accounts, then an honest statement that no session inventory exists. |
| `/account/club` | Hero + progress rail. Points are the hero figure; the rail is the one large graphic element. |
| `/account/spin` | Stage-first. The dial is the only large circle; cooldown is the dominant state, drawn as a real disabled affordance rather than a greyed button. |
| `/account/favorites` | Product-forward grid with availability-aware cards and per-card removal. |
| `/account/notifications` | Inbox. Read state is a leading dot and title weight. |
| `/account/support` | Conversation surface with a pinned composer and a real conversation switcher. |
| `/account/table` | **Standalone.** No rail, no `RequireCustomer`, no header identity. |

### Decoupled `/account/table`

Removed from `AccountNav` and stripped of `RequireCustomer`. Verified with an empty session: the
route returns 200, stays on `/account/table`, exposes a `<main>`, shows the code input, and renders
no account rail.

Removing it from the rail left the route with only one entry point — `DiningContextBanner`, which
returns `null` until a dining context already exists. A guest with no table would have had no way
to reach the code field. A single QR entry was therefore added to the storefront header
(`storefront-header.tsx`, `data-ff-table-entry`), additive and otherwise unchanged. This matches the
plan's "reachable from the header" and Mobile, which already ships the screen decoupled.

### New pure modules (unit-tested, matching the repo's `src/lib/**/*.test.ts` surface)

- `src/lib/storefront/account-security-posture.ts` — derives the security level from the real
  `LinkedIdentities` payload. Six tests, including that an unsatisfied check is never marked done.
- `src/lib/storefront/club-progress.ts` — clamps `progressBps` and `pointsToNextTier`. Nine tests,
  including over-100 bps, negative remainder, missing values, and the string form the wire actually
  sends (points follow the BigInt-as-string contract, so `pointsToNextTier` arrives as a string).

### Customer Mobile

Rebuilt for parity, native `StyleSheet` against `theme.ts`, no Web DOM or CSS shared (ADR-008):

- `app/(tabs)/account.tsx` — status strip + primary edit panel + recent orders + membership band,
  mirroring the Web board. Order **count** is tracked separately from the three-row slice; counting
  the slice would have reported "3 orders" to anyone with more.
- `app/account/security.tsx` — same posture derivation and same ordering as Web.
- `app/account/settings.tsx` — same sectioned ledger, plus the KVKK record row and the link to
  Security.
- `app/account/spin.tsx` — the dial is now the stage; the reveal animates only to the prize the
  server returned, and there is no client-side roulette.
- `app/account/notifications.tsx` — leading dot instead of a mustard border wash.

`app/account/favorites.tsx`, `addresses.tsx`, `club.tsx`, `support.tsx` and `table/index.tsx` already
expressed the same information architecture with real endpoints wired (favourites already called
`removeFavorite`); they were reviewed for parity rather than rewritten.

### Real behaviour defects found and fixed along the way

- **Notifications (Web)** nested a `<Link>` inside the "mark read" `<button>` — invalid HTML;
  interactive content inside a button is not addressable and nested activation resolves ambiguously.
  Row is now a container with sibling actions.
- **Address selection (Web)** was an `onClick` on an `<article>`: reachable with a mouse, not with a
  keyboard, and announced by nothing. Now a real radio group.
- **Duplicate skip link.** The new shell added a second `ff-skip-link`, but `storefront-shell.tsx`
  already renders one on every storefront page. Two identical "İçeriğe geç" links is noise in the
  tab order; the shell's copy was removed.
- **Dead data-layer surface.** `removeFavorite` and `listSupport` existed in the data layer with no
  UI caller. Both are now wired to real controls.
- Touch targets in the address rows were 36px; raised to the 44px minimum.

## Deviations and findings

### `/cart` build failure was pre-existing, not caused by this work

`next build` failed prerendering `/cart` with *"useSearchParams() should be wrapped in a suspense
boundary"*. Before attributing it, it was reproduced against a self-contained `RequireCustomer`
shim that still called `useSearchParams` — **it still failed**, so the cause is
`app/(shop)/cart/page.tsx`, which has no `<Suspense>` wrapper while every sibling route
(`orders`, `account`) has three. `git diff` confirms `shop-cart-page.tsx` changed by import line
only, and HEAD's `RequireCustomer` contained the same `useSearchParams` call.

Because it blocked the build gate, the one-line wrapper matching the sibling convention was applied
to `/cart`. This is outside the redesign scope and is called out here rather than folded silently
into the diff.

### Scope decision: light mode was dropped

The plan's baseline assessment was that dark-only cost nothing, and the implementation confirmed
it: `globals.css` contains zero `prefers-color-scheme`, `data-color-mode` and `:root` declarations
and the storefront uses zero `dark:` utilities. The human removed light mode from scope before
implementation; no theme infrastructure was built.

### Measurement corrections

Two measurements were wrong before they were trusted, and both were corrected rather than reported
as findings:

- The **contrast** probe initially reported that the primary save button looked low-contrast. It
  does not: measured contrast failures are **0** on all ten routes, before and after.
- The **dead-space** probe initially reported byte-identical numbers on eight different pages,
  which contradicted the screenshots. The probe was measuring the tallest wrapper rather than
  content and was rewritten. Dead space is judged from screenshots, not from that number.

## Verification evidence

### Gates — all executed, exit codes captured

| Gate | Result |
|---|---|
| `pnpm --filter @fastfood/storefront-web typecheck` | **exit 0** |
| `pnpm --filter @fastfood/storefront-web test:unit` | **exit 0** — 14 files, 88 tests passed |
| `pnpm --filter @fastfood/storefront-web build` | **exit 0** — 25 routes prerendered |
| `pnpm --filter @fastfood/customer-mobile typecheck` | **exit 0** |
| `pnpm --filter @fastfood/customer-mobile test:unit` | **exit 0** — 29 files, 106 tests passed |
| `pnpm check:customer-platform` | **exit 0** — contracts build + typecheck + 13 tests + both client typechecks |
| ESLint `--max-warnings=0` on all 19 Web files this task owns | **exit 0** |
| ESLint `--max-warnings=0` on the 5 Mobile files this task owns | **exit 0** |

### Browser measurement — Playwright + Chromium against `http://localhost:3100`

Authenticated with a real session (`POST /auth/customer/password/register`), seeded with 3
addresses, 4 favourites and a profile, so populated states were measured and not only empty ones.

- **Contrast: 0 failures across all 10 routes**, computed per text node against its effective
  background with the WCAG threshold applied per size and weight.
- **`<main>` landmark: 9/9** authenticated routes plus the standalone table page — up from **0/10**
  at baseline, where only `/account` had one.
- **Horizontal overflow: 0px** on all 20 route × viewport combinations.
- **Console errors: 0**, and React hydration confirmed live on all 20.
- **Structural pass, 8 checks per route, 0 failures total**: HTTP 200, exactly one `<main>` with
  `id="account-content"`, rail present, exactly one working skip link, mobile rail toggle present
  and collapsed at desktop width, no overflow, no console errors.
- **Guest regression check**: `/account/table` with an empty session → 200, no redirect to `/auth`,
  `<main>` present, code input present, no account rail.

### Not verified

- **Mobile visual verification.** There is no automated visual harness for Customer Mobile (zero
  Maestro flows, no React Native Web dependency). The Mobile changes are verified by typecheck,
  lint and the existing unit suite — not by looking at a running app. This is the one part of the
  plan's scope that is not closed by evidence, and it needs an emulator/simulator session.
- No persistent e2e spec or Playwright config was added; the plan keeps that out of scope and it
  would change CI surface.

### Pre-existing lint findings left in place

Three findings remain in files this task did not modify, confirmed by `git diff --name-only`
returning empty for each:

- `apps/storefront-web/src/components/storefront/menu-page.tsx:30` — `setState` synchronously in an
  effect (error)
- `apps/storefront-web/src/lib/storefront/catalog.ts:5` — `categorySchema` used as type only (warning)
- `apps/customer-mobile/app/branches.tsx:99` — forbidden non-null assertion (warning)

`menu-page.tsx` and `branches.tsx` are outside the redesign scope. They are reported, not fixed.