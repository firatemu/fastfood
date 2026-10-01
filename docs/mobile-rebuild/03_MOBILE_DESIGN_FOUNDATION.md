# 03 — BURGER HOME Mobile design foundation

This is an **independent** customer-mobile visual system derived from Mobile Stitch. It is **not** `@fastfood/design-tokens`, not `@fastfood/ui-native`, and not the Web Storefront React DOM kit.

Canonical token source: **Mobile HTML Tailwind `theme.extend` + `stitch_burger_e_ticaret_mobil/smash_co._gourmet_visual_system/DESIGN.md` frontmatter**. PNG screens are visual authority when HTML and prose disagree.

Web Storefront foundation (`docs/storefront-rebuild/03_STOREFRONT_DESIGN_FOUNDATION.md`) is the **sibling** language (same brand), not an importable component library. Mobile must re-express tokens in React Native (`StyleSheet`), not CSS/Tailwind.

Folder name `smash_co._gourmet_visual_system` is prototype residue. Token values are BURGER HOME. Do not surface “Smash & Co.” in the app.

## Colors

| Token                                       | Hex                          | Mobile role                          |
| ------------------------------------------- | ---------------------------- | ------------------------------------ |
| background / surface / surface-dim          | `#121316`                    | Canvas                               |
| surface-container-lowest                    | `#0d0e11`                    | Inset                                |
| surface-container-low                       | `#1b1b1f`                    | Low cards                            |
| surface-container                           | `#1f1f23`                    | Cards / sheets                       |
| surface-container-high                      | `#292a2d`                    | Raised / tab hover                   |
| surface-container-highest / surface-variant | `#343538`                    | Chips / steppers                     |
| on-surface / on-background                  | `#e3e2e6`                    | Body                                 |
| on-surface-variant                          | `#e4beb4`                    | Warm secondary                       |
| outline                                     | `#ab8980`                    | Hairline                             |
| outline-variant                             | `#5b4039`                    | Dark hairline                        |
| primary / surface-tint                      | `#ffba38`                    | Mustard glow / icon                  |
| primary-container                           | `#c08600`                    | Deep mustard fill (HTML frontmatter) |
| secondary-container (CTA mustard)           | `#feb300` / DESIGN `#FFB300` | Primary conversion                   |
| tertiary-container (flame)                  | `#fc5a29` / `#FF5722`        | Flame accents, live pip              |
| charred ember                               | `#E64A19`                    | Pressed / gradient end               |
| error                                       | `#ffb4ab`                    | Error text                           |
| helper ash (prose)                          | `#868c98`                    | Captions                             |

Prose aliases: Golden Mustard `#FFB300`, Flame `#FF5722`, Ember `#E64A19`. Use for gradients/glows.

Do not use Admin/Storefront-token primary `#c81424`.

## Typography

- **Anton**: display / wordmark / section headlines, typically uppercase. Native: load via `expo-font` in M1. Fallback during scaffold: system bold (scaffold only).
- **Plus Jakarta Sans**: 400/500/600/700 UI, prices tabular.
- Scale: copy DESIGN.md `headline-*-mobile` for native (40/32/28 Anton; 20/18/15/13/14/12/11 Jakarta). Web HTML often skipped `*-mobile`; **mobile HTML is the mobile scale**.
- Icons: Material Symbols Outlined. Bundle a native icon set in M1; do not depend on a WebView font stylesheet.

## Spacing / radius / elevation

| Token                      | Value                 |
| -------------------------- | --------------------- |
| gutter-sm / side margin    | 1rem / 1.25rem        |
| space-xs…xl                | 4 / 8 / 16 / 24 / 40  |
| header height              | 64 + top safe area    |
| tab bar                    | 80 + bottom safe area |
| radius DEFAULT (DESIGN.md) | 8                     |
| radius lg (images)         | 16                    |
| pills                      | 9999                  |

HTML Tailwind radius tokens are tighter than DESIGN.md. **Match PNG + HTML screens** (visual authority 1–2).

Elevation: no Material grey shadows. Use `0 10px 30px rgba(0,0,0,0.8)` plus amber bloom `rgba(255,179,0,0.15)`. Sticky bars: blur 16–24 analog (`Platform` blur where cheap; solid `#121316`/`#1f1f23` fallback on Android if blur is expensive).

## Components to rebuild natively (M1+)

| Component        | Anatomy from Stitch                                                         | Notes                  |
| ---------------- | --------------------------------------------------------------------------- | ---------------------- |
| Primary CTA      | Mustard `#feb300` or flame gradient, dark/uppercase label, 8px radius, glow | Sticky bars            |
| Secondary        | `#292a2d` + white/12 border                                                 | Customize, history     |
| Product card     | Photo, slate `#1f1f23`, 1px white/06, price, add                            | Home + search          |
| Qty stepper      | Pill, − / number / +                                                        | PDP, cart              |
| Radio / checkbox | Mustard ring + pip; 4px checkbox                                            | PDP / builder          |
| Text input       | Fill `#121316`, focus mustard ring                                          | Auth, notes, address   |
| Chip             | Mustard premium vs flame spicy                                              | Home categories, deals |
| Header           | Glass, wordmark, location, notifications, avatar                            | Tabs                   |
| Tab bar          | 5 items, raised center skillet                                              | Custom tabBar          |
| Sticky action    | Glass + `pb-safe` + mustard CTA                                             | PDP, cart, checkout    |
| List row         | Icon + title + subtitle + chevron                                           | Profile                |
| Status stepper   | 4 culinary steps                                                            | Tracking               |

Pressed: ember darken. Disabled: 40% opacity. Loading/empty/error: reuse card + mustard spinner; do not import ui-native `Spinner`/`EmptyState`.

## Touch

Minimum 44×44. Header icon buttons are 44. Quantity hits should not shrink below that on Android.

## What this foundation is not

- Not a copy of `apps/storefront-web/src/components/storefront/*`.
- Not Tailwind class names at runtime.
- Not `@fastfood/ui-native` restyled.
- Scaffold in M0 may use raw RN `View`/`Text` with canvas hexes only.
