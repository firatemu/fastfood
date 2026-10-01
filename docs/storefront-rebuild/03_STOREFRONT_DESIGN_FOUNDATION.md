# 03 — BURGER HOME Storefront design foundation

This is an **independent** customer visual system derived from Stitch. It is **not** `@fastfood/design-tokens` and not the Admin operations chrome.

Canonical token source for implementation: **HTML Tailwind `theme.extend` + DESIGN.md frontmatter**. DESIGN.md prose greys (`#0C0D0E`, `#FFFFFF` titles, `#A0A4AB`) describe intent; shipped screens use the frontmatter surface scale.

Stitch MCP theme for project `2120742513648709986`: DARK, ANTON, PLUS_JAKARTA_SANS, roundness ROUND_EIGHT, custom `#ff5722`, secondary `#ffb300`, tertiary `#e64a19`, neutral `#121316`.

## Colors (HTML / frontmatter)

| Token                                       | Hex       | Role                     |
| ------------------------------------------- | --------- | ------------------------ |
| background / surface / surface-dim          | `#121316` | Canvas                   |
| surface-container-lowest                    | `#0d0e11` | Lowest inset             |
| surface-container-low                       | `#1b1b1f` | Cards                    |
| surface-container                           | `#1f1f23` | Raised                   |
| surface-container-high                      | `#292a2d` | High                     |
| surface-container-highest / surface-variant | `#343538` | Highest / chips          |
| surface-bright                              | `#38393c` | Bright inset             |
| on-surface / on-background                  | `#e3e2e6` | Body text                |
| on-surface-variant                          | `#e4beb4` | Warm secondary text      |
| outline                                     | `#ab8980` | Hairline                 |
| outline-variant                             | `#5b4039` | Dark hairline            |
| primary / surface-tint / tertiary           | `#ffb5a0` | Soft flame               |
| primary-container                           | `#ff5722` | Flame fill               |
| on-primary                                  | `#5f1500` | On flame                 |
| secondary                                   | `#ffd799` | Mustard text             |
| secondary-container                         | `#feb300` | Mustard fill (most CTAs) |
| tertiary-container                          | `#fc5a29` | Deep flame               |
| error                                       | `#ffb4ab` | Error                    |

Prose aliases (use for gradients/glows, not as a second palette): Primary Flame `#FF5722`, Golden Mustard `#FFB300`, Charred Ember `#E64A19`.

Product page extra hex (page-specific): `#F59E0B` `#FDE68A` `#FBBF24` `#FCD34D` `#D97706`.

## Typography

Fonts: **Anton** (display, typically uppercase) + **Plus Jakarta Sans** 300–800 (UI). Icons: Material Symbols Outlined.

| Token              | Family            | Size | Weight | Line | Tracking |
| ------------------ | ----------------- | ---- | ------ | ---- | -------- |
| headline-xl        | Anton             | 64px | 400    | 68px | 0.02em   |
| headline-xl-mobile | Anton             | 40px | 400    | 44px | 0.02em   |
| headline-lg        | Anton             | 44px | 400    | 48px | 0.02em   |
| headline-lg-mobile | Anton             | 32px | 400    | 36px | 0.02em   |
| headline-md        | Anton             | 28px | 400    | 32px | 0.01em   |
| headline-sm        | Plus Jakarta Sans | 20px | 700    | 28px | −0.01em  |
| body-lg            | Plus Jakarta Sans | 18px | 400    | 28px | —        |
| body-md            | Plus Jakarta Sans | 15px | 400    | 24px | —        |
| body-sm            | Plus Jakarta Sans | 13px | 400    | 20px | —        |
| label-lg           | Plus Jakarta Sans | 14px | 600    | 20px | 0.04em   |
| label-md           | Plus Jakarta Sans | 12px | 700    | 16px | 0.06em   |
| label-sm           | Plus Jakarta Sans | 11px | 700    | 14px | 0.08em   |

`headline-*-mobile` tokens are defined but **not applied** in exported HTML. Do not invent a type scale change until a screen uses them.

Prices: Plus Jakarta Sans bold/extrabold, tabular figures. TRY often rendered as `395 ₺`.

## Spacing / layout

| Token       | Value                         |
| ----------- | ----------------------------- |
| gutter      | 1.5rem                        |
| gutter-sm   | 1rem                          |
| margin      | 2.5rem                        |
| margin-sm   | 1.25rem                       |
| space-xs…xl | 0.25 / 0.5 / 1 / 1.5 / 2.5rem |
| container   | `max-w-7xl` = **1280px**      |
| baseline    | 4px                           |

Desktop 1024+: 12 col, 1.5rem gutter. Tablet 640–1023: 8 col, 1rem gutter. Mobile <640: 4 col or single column, 1.25rem side margin.

## Radius conflict (must resolve in implementation, not by redesign)

DESIGN.md / Stitch MCP ROUND_EIGHT: DEFAULT **0.5rem**, lg **1rem**, xl **1.5rem**.  
HTML Tailwind extend: DEFAULT **0.25rem**, lg **0.5rem**, xl **0.75rem**. Markup uses `rounded-lg` / `rounded-xl` / `rounded-2xl` / `rounded-full`.

**Rule:** match the **HTML screens** (visual authority 2) unless a PNG clearly shows the larger DESIGN.md radii. Chips/steppers are pills (`rounded-full`).

## Elevation / glow

- Header: `bg-surface/90`, `backdrop-blur-xl`, `0_1px_8px rgba(0,0,0,0.04)`
- Glass (prose): blur 16px, `rgba(18,19,22,0.82)`, amber hairline `rgba(255,179,0,0.18)`
- Hero burger drop-shadow `0_25px_35px rgba(0,0,0,0.9)`
- Ember orbs: `blur-[100px]`–`140px`, `primary-container/15`
- CTA glow: `0 4px 20px rgba(255,87,34,0.4)` or mustard `0 6px 24px rgba(254,179,0,0.3)`
- Live pip: `0 0 18px rgba(255,87,34,0.6)`

## Buttons

| Rank               | Visual (screens)                                        | Notes                                        |
| ------------------ | ------------------------------------------------------- | -------------------------------------------- |
| Primary conversion | Often **flat `#feb300` secondary-container**, uppercase | Home hero and many CTAs                      |
| Flame primary      | Gradient `#FF5722` → `#E64A19`, white label, glow       | DESIGN.md; used more on product checkout CTA |
| Secondary          | Dark surface, 1px white/12, gold hover                  | Customize, history                           |
| Ghost              | Transparent, smoke text → flame hover                   | Tertiary                                     |

Do not mix Admin `#c81424` into this kit.

## Forms / selectors / cards / badges / nav

- Inputs: fill `#121316`, 1px white/12, placeholder ash, focus flame ring.
- Radios: ember pip + flame ring when selected; product page uses `has-[:checked]` amber inset.
- Checkboxes: 4px radius, flame fill.
- Qty: pill stepper.
- Product card: cinematic photo, slate card, hover scale ~1.04–1.05, Özelleştir + cart.
- Flame badge vs mustard premium badge as in DESIGN.md.
- Tabs: login GİRİŞ / KAYIT; checkout delivery / pickup.
- Header nav: Menü, Özel Burgerini Yarat, Şubeler & Hikaye, İndirimler & Fırsatlar. Hidden `<lg`. No mobile menu specified — **do not invent a hamburger**.

## Responsive (from HTML, not invented)

| Viewport    | Behavior                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| 375 / 390   | Unprefixed. Nav/search/location hidden. Stacked columns. Home promises 2-col. Chips scroll. Izgarada icon-only. |
| 640 (sm)    | Izgarada label; some 2–4 col modifier/auth grids.                                                               |
| 768 (md)    | Search; 2-col catalogs; home promises 4-col; PDP image/copy split.                                              |
| 1024 (lg)   | Full nav; 12-col splits; sticky cart; `px-margin` 2.5rem.                                                       |
| 1280 (xl)   | Location+ETA chip; search `w-60`.                                                                               |
| 1440 / 1920 | Same as xl. Content capped at 1280px. PNG captures are 1920. No `2xl` rules.                                    |

## Icon approach

Material Symbols Outlined (opsz/wght/FILL/GRAD axes). Social footer uses `alternate_email`, `public`, `call`. Cart uses `add_shopping_cart`. Do not introduce Lucide into this Storefront unless a later ADR says so.
