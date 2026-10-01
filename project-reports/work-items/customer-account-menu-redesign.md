# Customer account hub — premium layout redesign

## Design plan

### Visual tokens

- **Midnight canvas:** `#121316`; the page remains rooted in the storefront's dark brand surface.
- **Inset:** `#0d0e11`; use for one focused account detail well.
- **Card:** `#1b1b1f`; use for the member rail and working surfaces.
- **Raised:** `#292a2d`; use sparingly for the selected menu destination and controls.
- **Flame:** `#ff5722`; reserve for small active-state cues.
- **Mustard:** `#feb300`; reserve for membership value and the primary action.
- **Type:** Anton for a single page title; Plus Jakarta Sans for menu, account data, and order details.

### Layout options and selection

Option A keeps the full-width profile hero above the current two-column body. It retains familiar structure but spends the first viewport on a wide card and pushes the account links lower.

Option B puts a compact identity/member rail beside a wider account workspace. The rail groups routes by purpose; the workspace leads with profile controls and recent orders. On small screens, the same destinations become touch-sized native list rows below a compact member summary.

**Selected: Option B.** It gives the account menu a clear home, removes repeated full-width decoration, and improves the first-screen route density while keeping profile, points, orders, and logout behavior intact. Desktop content stays capped at 1280px with a 240–256px rail and a flexible main column; tablet and phone layouts stack without horizontal scrolling. Web keeps the site's Material Symbols and CSS tokens; Mobile expresses the same hierarchy with native `StyleSheet`, safe-area spacing, and 44px+ touch targets.

```text
Desktop (1280px content)
┌──────────────────┬─────────────────────────────────────────┐
│ Member identity  │ Hesabın                                  │
│ Points / tier    │ ┌──────────────────┐ ┌────────────────┐ │
│                  │ │ Personal details │ │ Recent orders  │ │
│ HESAP            │ └──────────────────┘ └────────────────┘ │
│ Profil           │                                         │
│ Adresler         │                                         │
│ Ayarlar          │                                         │
│                  │                                         │
│ SİPARİŞ & CLUB   │                                         │
│ Siparişler       │                                         │
│ Club / Ateş ...  │                                         │
│ Destek / çıkış   │                                         │
└──────────────────┴─────────────────────────────────────────┘

Mobile
┌────────────────────────────┐
│ Compact member summary     │
│ Points + personal details  │
├────────────────────────────┤
│ Quick access: orders/address│
├────────────────────────────┤
│ Account destinations       │
│ Native list rows by group  │
└────────────────────────────┘
```

### Brief review

The selected composition uses the restaurant account's actual job—finding account destinations, checking membership value, and returning to recent orders—instead of adding an unrelated dashboard motif. The original full-width hero and repetitive card stacking are removed; emphasis comes from proportion, grouping, and one mustard membership cue rather than extra gradients or decoration. Existing navigation, profile edit, club, order, legal, and sign-out actions remain available.

## Sync plan

- **Capability affected:** `profile-me` (account hub); route destinations remain part of their existing capabilities.
- **Web surface:** `apps/storefront-web/src/components/storefront/account-page.tsx` and `apps/storefront-web/src/components/storefront/account-nav.tsx`.
- **Mobile surface:** `apps/customer-mobile/app/(tabs)/account.tsx`, using native components and current route actions.
- **Shared contracts:** none; this is a layout and presentation change only.
- **Capability registry:** no impact/status movement. `profile-me` stays `AUTOMATICALLY_SUPPORTED` / `IMPLEMENTED` on Web and Mobile.
- **Verification gates:** `pnpm check:customer-platform`, Web and Mobile typechecks, targeted ESLint for the three changed screens, and visual review at desktop and phone widths. No API or persistence behavior changes.

## Implementation status

- Implemented the grouped account navigation and compact member rail in Web, with responsive profile and recent-order workspace.
- Implemented the corresponding native account summary, shortcuts, categorized destinations, and touch-sized rows in Customer Mobile. Existing routes and profile/session actions remain intact.

## Verification evidence

- **PASS:** Prettier `--check` for the three changed UI files.
- **PASS:** `git diff --check` for the three changed tracked UI files.
- **PASS:** Authenticated desktop browser review at `http://localhost:3100/account`; the new menu, member summary, profile form, and order empty state rendered without a visible error.
- **UNVERIFIED:** Web and Mobile typechecks, `check:customer-platform`, and targeted lint. The WSL command session remained unresponsive; Windows Node could not resolve the repository's WSL-linked dependencies, so those attempts are not valid project check results.
- **UNVERIFIED:** Mobile emulator visual review. No interaction, API contract, or persistence behavior was changed.

## Width refinement Sync Plan

- **Capability:** `profile-me` and account destination screens; presentation-only.
- **Web:** Reduce account navigation columns from 4/12 to 3/12 across the shared account pages. Reduce the standalone account hub rail from 18–19rem to 15–16rem so the freed width belongs to the adjacent workspace.
- **Mobile:** `AUTOMATICALLY_SUPPORTED`; native account layout already uses a full-width stacked flow and is unaffected by desktop column sizing.
- **Contracts and registry:** unchanged; `profile-me` retains its current Web/Mobile statuses.
- **Verification:** formatter, focused source/diff checks, and browser review of the affected account layout.

### Refinement verification

- **PASS:** `git diff --check` for all affected account layout files.
- **PASS:** Browser review at a 1707px viewport showed a 282px navigation rail and an 894px content column; the document had no horizontal overflow and the browser reported no console errors.
- **PARTIAL:** Full-file Prettier checks pass for the main account hub and address screen, but nine other account screens already contain unrelated formatting differences outside these one-class grid edits. Those files were left otherwise untouched to avoid broad formatting churn.
- **UNVERIFIED:** Typecheck and lint; WSL command execution remains unresponsive in this environment.
