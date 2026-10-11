# 03 — Admin design foundation (Navy, ADR-019)

Supersedes the `kitchen-fleet` foundation recorded by ADR-009.
Decision record: `../adrs/ADR-019-admin-visual-system-navy.md`.

This document is the reference every Admin page migration is built from. Tokens
live in `apps/admin-web/src/styles/admin-fastfood-tokens.css`.

## Source rank (locked)

1. `stitch_fastfood_admin_dashboard_prompts/<screen>/screen.png`
2. matching `code.html` (Tailwind `theme.extend` block)
3. `DESIGN.md` — **deprecated, see below**
4. Stitch MCP
5. existing `@fastfood/ui-web` / operations primitives where they can match
6. old Admin UI — not visual authority
7. AI interpretation — last

All seven shipped `code.html` themes were compared and are byte-identical:
`surface #0b1326`, `primary-container #f97316`, `tertiary-container #00b07a`,
headline family Plus Jakarta Sans. They also match the live Figma file
`uZ4ILFR4xYPxxCC267PCWk` node `0:1` frame-for-frame.

### ⚠️ Do not derive tokens from the packaged `DESIGN.md`

`stitch_fastfood_admin_dashboard_prompts/` contains two `DESIGN.md` files that are
orphans from earlier generations. They are not authority and must not be used:

| File                                   | Declares                             | Reality                 |
| -------------------------------------- | ------------------------------------ | ----------------------- |
| `obsidian_amber_kitchen_ops/DESIGN.md` | surface `#111317`, primary `#facc15` | no shipped HTML matches |
| `evocative_name/DESIGN.md`             | surface `#161309`, sepia ramp        | no shipped HTML matches |

They differ from each other on 214 of 224 lines and neither matches any
`code.html`. Both were produced before the Navy palette settled. `code.html`
outranks `DESIGN.md` in the ranking above, so this is consistent — but the files
are marked deprecated because they read as authoritative.

## Colour

Provenance for every row: `code.html` Tailwind `theme.extend.colors`.

### Surface ramp

| Token                       | Value     | Use                       |
| --------------------------- | --------- | ------------------------- |
| `surface` / `background`    | `#0b1326` | Viewport, page canvas     |
| `surface-container-lowest`  | `#060e20` | Sidebar, deepest well     |
| `surface-container-low`     | `#131b2e` | Cards, list rows          |
| `surface-container`         | `#171f33` | Raised panels             |
| `surface-container-high`    | `#222a3d` | Hover, inputs             |
| `surface-container-highest` | `#2d3449` | Top of the elevation ramp |
| `surface-variant`           | `#2d3449` | Table headers             |
| `surface-bright`            | `#31394d` | Rare highlight            |

### Ink ramp

| Token                | Value     | Use                    |
| -------------------- | --------- | ---------------------- |
| `on-surface`         | `#dae2fd` | Primary text           |
| `on-surface-variant` | `#e0c0b1` | Secondary / label text |
| `inverse-surface`    | `#dae2fd` | Reserved               |
| `inverse-on-surface` | `#283044` | Reserved               |

### Accents

| Token                  | Value     | Meaning                                |
| ---------------------- | --------- | -------------------------------------- |
| `primary-container`    | `#f97316` | **Action colour.** Buttons, active nav |
| `primary`              | `#ffb690` | Hover on action                        |
| `on-primary-container` | `#582200` | Text on action                         |
| `tertiary-container`   | `#00b07a` | Success / ready                        |
| `tertiary`             | `#4edea3` | Success text                           |
| `secondary-container`  | `#bb0112` | Critical / refund                      |
| `error-container`      | `#93000a` | Destructive error                      |

### Lines

| Token             | Value                   | Use                       |
| ----------------- | ----------------------- | ------------------------- |
| `keyline`         | `rgb(255 255 255 / 8%)` | Hairline separators       |
| `outline`         | `#a78b7d`               | Focus ring, strong border |
| `outline-variant` | `#584237`               | Reserved                  |
| `accent-wash`     | `rgb(250 204 21 / 15%)` | Active nav wash, see note |

**Note on `accent-wash`:** the Figma render paints active sidebar and header
borders with an amber 15% wash rather than the HTML `primary-container`. Both are
in the same orange family and both are observed in source. Prefer
`primary-container` for new work; use `accent-wash` only where a surface is
already at `primary-container` and needs separation.

## Typography

| Role          | Family            | Size / line / weight    |
| ------------- | ----------------- | ----------------------- |
| `headline-xl` | Plus Jakarta Sans | 28 / 36 / 800, −0.02em  |
| `headline-lg` | Plus Jakarta Sans | 22 / 28 / 700, −0.015em |
| `headline-md` | Plus Jakarta Sans | 18 / 24 / 600, −0.01em  |
| `headline-sm` | Plus Jakarta Sans | 15 / 20 / 600           |
| `body-lg`     | Inter             | 15 / 22 / 400           |
| `body-md`     | Inter             | 13 / 18 / 400           |
| `body-sm`     | Inter             | 12 / 16 / 400           |
| `label-lg`    | JetBrains Mono    | 13 / 16 / 600, 0.02em   |
| `label-md`    | JetBrains Mono    | 11 / 14 / 500, 0.03em   |
| `label-sm`    | JetBrains Mono    | 10 / 12 / 500, 0.04em   |

**Binding rule:** every label role is monospaced. Column headers, filter labels,
field captions, status captions and KPI eyebrows use `label-*`, never `body-*`.
`Anton` is retired; it must not appear in migrated surfaces.

Turkish subset (`latin-ext`) is loaded for Plus Jakarta Sans.

## Spacing and shape

| Token      | Value      | Replaces |
| ---------- | ---------- | -------- |
| `space-xs` | `0.25rem`  | 4px      |
| `space-sm` | `0.375rem` | 6px      |
| `space-md` | `0.625rem` | 10px     |
| `space-lg` | `0.875rem` | 14px     |
| `space-xl` | `1.25rem`  | 20px     |
| `gutter`   | `0.75rem`  | 12px     |
| `margin`   | `1rem`     | 16px     |

This rhythm is denser than the retired `4 / 8 / 12 / 16 / 24` scale. Do not
reuse old spacing names in migrated surfaces.

| Token            | Value      | Note                    |
| ---------------- | ---------- | ----------------------- |
| `radius-default` | `0.125rem` | Tables, inputs, chips   |
| `radius-lg`      | `0.25rem`  | Cards                   |
| `radius-xl`      | `0.5rem`   | Panels, modals          |
| `radius-full`    | `0.75rem`  | 12px — **not** `9999px` |

## Shell metrics

| Metric              | Value   | Source             |
| ------------------- | ------- | ------------------ |
| Sidebar width       | `288px` | `aside.w-72`       |
| Sidebar brand block | `56px`  | `div.h-14`         |
| Header height       | `56px`  | Figma frame layout |
| Header sub-bar      | `40px`  | Figma frame layout |

The previous shell used a collapsible `64px → 240px` icon rail. The Navy design
replaces it with a **fixed 288px sidebar**. Collapsed-rail behaviour is retired;
do not port `data-nav-collapsed` styling into migrated shells.

## Effects

| Effect         | Value                                                                 | Use               |
| -------------- | --------------------------------------------------------------------- | ----------------- |
| Header fill    | `rgb(11 19 38 / 90%)`                                                 | Translucent       |
| Header blur    | `12px`                                                                | `backdrop-filter` |
| Header shadow  | `0 1px 8px 0 rgb(0 0 0 / 4%)`                                         | —                 |
| Surface shadow | `0 1px 8px 0 rgb(0 0 0 / 2%)`                                         | Cards             |
| Overlay shadow | `0 8px 10px −6px rgb(0 0 0 / 10%), 0 20px 25px −5px rgb(0 0 0 / 10%)` | Toast, modal      |
| Scrim          | `rgb(6 14 32 / 72%)`                                                  | Drawer            |

## Light mode (derived)

The design set is **dark-only**. Every `screen.png` renders `<html class="dark">`
and no `code.html` defines a light value, so there is nothing to transcribe.

The light palette in `admin-fastfood-tokens.css` under
`html[data-color-mode='light']` is **derived**: the surface ramp is inverted
and the Navy hue relationships are kept. `primary-container` darkens to
`#c2410c` and `tertiary-container` to `#00795a` so they still clear 4.5:1
against the light surfaces.

Under the source ranking above this is "AI interpretation" — the lowest
authority tier. It must not be cited as design authority. If the human owner
supplies a light-mode design set, replace the derived layer wholesale.

The shell toggle remains and writes `html[data-color-mode]`, which selects
this layer. Components that hard-coded a colour instead of a `--ff-*` token
will not follow the switch; the migration procedure forbids that.

## Design-set → route map

The design set covers seven screens. The table maps each to its route and to its
migration phase. Phases follow ADR-019.

| Design screen          | Route(s)                             | Phase |
| ---------------------- | ------------------------------------ | ----- |
| Bugünün Operasyonu     | `/`                                  | A6    |
| Siparişler             | `/orders`                            | A3    |
| Sipariş Detayı         | `/orders/[orderId]`                  | A4    |
| Mutfak Ekranı (KDS)    | `/kitchen`                           | A5    |
| Ürünler                | `/catalog/products`                  | A7+   |
| Kategoriler            | `/catalog/categories`                | A7+   |
| Ürün Müsaitliği & Menü | `/catalog`, `/branches/availability` | A7+   |

Routes with no design-set screen migrate last, each reusing the same tokens:

`/reports`, `/audit`, `/settings`, `/payments`, `/payments/[paymentId]`,
`/users`, `/customers`, `/customers/[userId]`, `/couriers`, `/loyalty`,
`/roles`, `/refunds`, `/promotions`, `/promotions/[promotionId]`,
`/branches`, `/branches/[branchId]`, `/branches/service-areas`,
`/catalog/modifiers`, `/catalog/allergens`, `/catalog/home-slides`.

`/login`, `/access-denied` and `/invite/confirm-email` are standalone surfaces
outside the ops shell and are not in the design set. Migrate them last, against
the same tokens.

## Capability classification (mandatory)

The design set is a visual reference, not a functional specification. Any control
shown in a design that has no backend capability is recorded in
`04_ADMIN_CAPABILITY_MATRIX.md` as **not supported** and is not rendered as a
working control. Domain, API, authorization and order-state contracts are
unchanged by ADR-019.

## Migration procedure — one page group

1. Open the matching `screen.png` and `code.html` side by side.
2. Change the page's `data-admin-theme` from `kitchen-fleet` to `fastfood-navy`.
   Nothing else is required for the palette, fonts and shape to apply — the
   `--ops-*` compatibility layer carries the legacy token names.
3. Replace any hard-coded hex in that page's module CSS with `--ff-*` tokens.
4. Re-check type roles: labels must be `--ff-font-label`.
5. Verify spacing against the `4 / 6 / 10 / 14 / 20` rhythm.
6. Delete the `--ops-*` compatibility rows that no remaining consumer references.
7. Only then consider removing `kitchen-fleet` scope entirely.

Steps 2–5 are reversible by reverting the single attribute. Do not batch steps
across route groups; each group is reviewed and committed on its own.

## Rules

- Never hard-code a colour that exists as an `--ff-*` token.
- Never introduce a new spacing value outside the scale.
- `primary-container` is the only action colour. Status colours are semantic only.
- Do not import Storefront or Mobile visual language (ADR-007, ADR-008).
- Do not modify backend, authorization or state logic for visual reasons.
