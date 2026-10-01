# 03 — Admin design foundation (Stitch)

Source rank for A1+ (locked):

1. `stitch_burger_admin/*/screen.png`
2. matching `code.html`
3. `stitch_burger_admin/kitchen_fleet_command/DESIGN.md`
4. Stitch MCP (only if local files are insufficient)
5. existing `@fastfood/ui-web` / operations tokens **where they can faithfully match Stitch**
6. old Admin UI — **not visual authority**
7. AI interpretation — last

This is an operations control plane, not Storefront. Do not import consumer e-commerce language.

## Verified tokens (from `code.html` Tailwind config + DESIGN.md)

DESIGN.md frontmatter and HTML share the Material-ish dark ramp. DESIGN.md also defines the **operational canvas** used in prose (prefer these for A1 surfaces when they differ from the MD3 aliases).

### Canvas (DESIGN.md operational)

| Token           | Value     | Use                 |
| --------------- | --------- | ------------------- |
| Canvas base     | `#0D0F12` | Viewport            |
| Canvas sub-base | `#13171C` | Nav rail            |
| Elevation 1     | `#161B22` | Tables, cards       |
| Elevation 2     | `#1F242D` | Headers, hover      |
| Elevation 3     | `#262C36` | Drawers             |
| Keyline         | `#2D333F` | 1px structure       |
| Strong keyline  | `#3E4656` | Focus/active splits |

### HTML/MD3 aliases (also in DESIGN.md YAML)

| Token                            | Value     |
| -------------------------------- | --------- |
| surface / background             | `#101419` |
| on-surface                       | `#e0e2ea` |
| surface-container                | `#1c2025` |
| surface-container-low            | `#181c21` |
| primary-container                | `#feb300` |
| primary                          | `#ffd799` |
| surface-tint / primary-fixed-dim | `#ffba36` |
| secondary-container (flame)      | `#d73b00` |
| error                            | `#ffb4ab` |

### Accents (DESIGN.md)

| Role                      | Value                 |
| ------------------------- | --------------------- |
| Primary operational amber | `#FEB300` / `#F59E0B` |
| Flame / urgent            | `#FF5722` / `#EA580C` |
| Ready / nominal           | `#10B981`             |
| Warning / in-prep         | `#F59E0B`             |
| Critical                  | `#EF4444`             |
| Logistics / courier       | `#38BDF8`             |
| Suspended                 | `#64748B`             |
| Label caps muted          | `#94A3B8`             |

Status colors must use tinted wells (~12% alpha) + 1px keyline. No pill radii (`9999px` prohibited on badges).

### Typography

| Role           | Family         | Size / notes                      |
| -------------- | -------------- | --------------------------------- |
| headline-xl    | Anton          | 40/44, tracking 0.04em, uppercase |
| headline-lg    | Anton          | 28/32                             |
| headline-md    | Anton          | 22/26                             |
| headline-sm    | Inter          | 16/20, weight 700                 |
| metric-display | JetBrains Mono | 32/36, weight 700                 |
| metric-md      | JetBrains Mono | 20/24                             |
| body-lg        | Inter          | 15/22                             |
| body-md        | Inter          | 13/18                             |
| body-sm        | Inter          | 12/16                             |
| data-mono      | JetBrains Mono | 12/16                             |
| label-caps     | Inter          | 11/14, 0.06em, uppercase          |
| label-mono     | JetBrains Mono | 10/12                             |

Order IDs, money, timers: JetBrains Mono only. Tables: `tabular-nums`.

### Shape / density

HTML borderRadius: DEFAULT `0.125rem`, lg `0.25rem`, xl `0.5rem`, full `0.75rem` (not a pill).

- Buttons/inputs: 2–4px
- Cards/drawers: 4px
- Status chips: 2px, height 20px
- Table header 32px; row 36px compact / 44px default
- Control height ~34px desktop / 42px touch
- Nav rail 64px collapsed / ~240px expanded
- Top bar 48px
- Drawer ~440px

### Elevation

No blurry consumer shadows. Tonal layers + 1px keylines. Tier 2 shadow `0 4px 16px rgba(0,0,0,0.45)`. Tier 3 `0 8px 32px rgba(0,0,0,0.70)`.

## Current Operations DS vs Stitch

|         | Operations `@fastfood/design-tokens` | Stitch Admin                   |
| ------- | ------------------------------------ | ------------------------------ |
| Canvas  | light `neutral.50`                   | dark `#0D0F12`                 |
| Primary | ops blue `#2563eb`                   | amber `#FEB300`                |
| Radius  | sm/md (consumer-adjacent)            | 2–4px industrial               |
| Type    | shared sans                          | Anton + Inter + JetBrains Mono |
| Icons   | ui-web SVG set                       | Material Symbols               |

**A1 implementation:** production golden routes use Admin-local `[data-admin-theme="kitchen-fleet"]` tokens (`apps/admin-web/src/styles/admin-stitch-tokens.css`). Shared packages were not globally replaced. Non-A1 Admin routes remain on the A0 scaffold. Promotion of these tokens into `@fastfood/design-tokens` is a later task.
