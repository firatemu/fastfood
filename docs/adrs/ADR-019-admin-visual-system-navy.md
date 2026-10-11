# ADR-019: FASTFOOD Admin visual system — "Navy" design set

Status: Accepted
Date: 2026-10-06
Decision owners: Human owner
Supersedes: `ADR-009-admin-independent-stitch-visual-system.md`
Authorization basis: explicit human-owner instruction in the working session of
2026-10-06 to replace the previous Admin visual design set with the
`stitch_fastfood_admin_dashboard_prompts/` design set and to complete the
documentary change-control formalities before any page migration.

## Context

ADR-009 made a Stitch package the visual source of truth for Admin and named
`stitch_burger_admin/` as that package. That package defines a neutral charcoal
ramp (`#0D0F12` canvas, `#101419` surface), an amber accent (`#FEB300`) and
`Anton` headlines.

A second, newer design set exists at
`stitch_fastfood_admin_dashboard_prompts/`. It covers seven screens and ships
`screen.png` plus a `code.html` for each:

| Screen folder                    | Frame                  |
| -------------------------------- | ---------------------- |
| `sipari_ler_fastfood`            | Siparişler             |
| `sipari_detay_tr_10842_fastfood` | Sipariş Detayı         |
| `mutfak_ekran_kds_fastfood`      | Mutfak Ekranı (KDS)    |
| `bug_n_n_operasyonu_canl_panel`  | Bugünün Operasyonu     |
| `r_nler_fastfood`                | Ürünler                |
| `kategoriler_fastfood`           | Kategoriler            |
| `r_n_m_saitli_i_men_fastfood`    | Ürün Müsaitliği & Menü |

All seven `code.html` files were inspected. Their Tailwind themes are byte-for-byte
identical (`surface #0b1326`, `primary-container #f97316`,
`tertiary-container #00b07a`, headline family Plus Jakarta Sans) and they match
the live Figma file `uZ4ILFR4xYPxxCC267PCWk` exactly — same canvas, same sidebar
surface, same header translucency, same toast colour, same 288px sidebar and
56px header metrics. The set is internally consistent.

That makes it a legitimate authority under ADR-009's own ranking: the ranking
places `screen.png` first and `code.html` second, above Stitch MCP and above AI
interpretation. The new set supplies rank-1 and rank-2 artifacts for all seven
screens; the old package supplied them for four.

Two `DESIGN.md` files also ship inside the new package
(`obsidian_amber_kitchen_ops/`, `evocative_name/`). They are orphans from earlier
generations: they declare neutral `#111317` and sepia `#161309` surfaces with an
amber `#facc15` accent, and the two differ from each other on 214 of 224 lines.
Neither matches any shipped `code.html`. Under ADR-009's ranking `DESIGN.md` sits
below `code.html`, so they are not authority — but they are actively misleading
and are deprecated here.

The production Admin currently runs the A0 scaffold from ADR-009. The entire ops
visual layer is scoped to `[data-admin-theme='kitchen-fleet']`, consumed by 25
files.

## Decision

1. The visual authority ranking from ADR-009 is retained verbatim, with the
   source package repointed to `stitch_fastfood_admin_dashboard_prompts/`:
   `screen.png` → `code.html` → `DESIGN.md` → Stitch MCP → compatible shared
   primitives → old Admin UI → AI interpretation.
2. The new system is published under a new scope,
   `[data-admin-theme='fastfood-navy']`, defined in
   `apps/admin-web/src/styles/admin-fastfood-tokens.css`. The `kitchen-fleet`
   scope stays functional until every route group has migrated; a route group
   migrates by changing its `data-admin-theme` value only.
3. A `--ops-*` compatibility layer inside the new scope maps the legacy token
   names onto the new values, so the 25 existing consumers adopt the new palette
   without edits. Each row is deleted once no caller references it.
4. Typography: `Plus Jakarta Sans` replaces `Anton` for all headline roles.
   `Inter` (body) and `JetBrains Mono` (data) are retained. The new source makes
   every label role monospaced; that rule is binding and is not optional.
5. The system ships **dark as the designed default** and a **derived light
   palette**. The design set contains no light values — every `screen.png`
   renders `<html class="dark">` — so the light ramp is an inversion of the
   dark ramp that keeps the Navy hue relationships. It is therefore recorded
   as derived, not transcribed, and the human owner should review it. The
   dark/light toggle in the shell is retained and drives
   `html[data-color-mode]`, which selects the light token layer.
6. Domain, API, authorization, permission and order-state contracts are
   unchanged. This ADR is visual-only and must never be used to justify a
   behaviour change.
7. Design-set elements with no backend capability are classified in
   `04_ADMIN_CAPABILITY_MATRIX.md`, never faked.
8. The two orphan `DESIGN.md` files are deprecated and must not be used to derive
   any token. `code.html` and `screen.png` are the only token sources.
9. Nothing is deleted from `docs/adrs/`. ADR-009 is marked `Superseded` and
   links here, per change-control protocol §6.
10. `stitch_burger_admin/` was retired on 2026-10-06 by explicit human-owner
    instruction and removed from the repository. Its contents were copied to
    `backups/2026-10-06-adr019/stitch_burger_admin.bak` first. The current
    authority package `stitch_fastfood_admin_dashboard_prompts/` remains in the
    repository; neither package is a build input.

## Alternatives considered

1. Keep ADR-009 and discard the new design set — rejected. The new set is
   internally consistent, matches the current Figma source of truth, and covers
   three screens the old set did not.
2. Overwrite the `kitchen-fleet` token values in place — rejected. The two themes
   differ structurally, not only in colour; the sidebar changes from a
   collapsible 64→240px rail to a fixed 288px sidebar. A single scope cannot
   express both without a fork, which is what a separate scope is for.
3. Delete ADR-009 and its design package — rejected by change-control protocol
   §6, which requires historical decisions to be retained and superseded.
4. Derive tokens from the packaged `DESIGN.md` files — rejected. They contradict
   the shipped HTML and each other.
5. Implement all seven screens in one pass — rejected. ADR-009's phased migration
   exists to keep each step reviewable; the same risk profile applies to the new
   set.

## Consequences

- Admin visual output changes from a neutral charcoal control plane to a dark
  navy control plane with an orange action colour.
- `Plus Jakarta Sans` is added to the font payload; `Anton` becomes unused once
  no `--ops-font-anton` caller remains.
- The token file gains a second theme scope. Both are valid CSS at all times;
  neither is applied outside its `data-admin-theme` subtree.
- Admin does not visually change as a result of this ADR alone. This ADR
  publishes the system; page migration applies it.

## Migration plan

- **A0** — complete: neutral rebuild scaffold in production.
- **A1** — this ADR. Publish tokens, publish the foundation document, supersede
  ADR-009, deprecate the orphan `DESIGN.md` files. No page changes.
- **A2** — shell: 288px fixed sidebar, 56px header, 40px sub-header, tab bar,
  brand block.
- **A3** — golden route: Siparişler.
- **A4** — golden route: Sipariş Detayı.
- **A5** — golden route: Mutfak Ekranı (KDS).
- **A6** — golden route: Bugünün Operasyonu.
- **A7+** — remaining IA: Ürünler, Kategoriler, Ürün Müsaitliği & Menü, then the
  non-designated routes, each migrated only after its capability matrix entry is
  confirmed.

## Documents/code affected

- `docs/adrs/ADR-009-admin-independent-stitch-visual-system.md` — marked superseded
- `docs/admin-rebuild/03_ADMIN_DESIGN_FOUNDATION.md` — rewritten for this system
- `docs/admin-rebuild/04_ADMIN_CAPABILITY_MATRIX.md` — design-set classification
- `apps/admin-web/src/styles/admin-fastfood-tokens.css` — new (published by this ADR)
- `apps/admin-web/src/app/layout.tsx` — font payload (Plus Jakarta Sans added)
- `apps/admin-web/src/components/ops/ops-shell.tsx` — A2 and later
