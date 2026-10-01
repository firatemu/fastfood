---
name: Smash & Co. Gourmet Visual System
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#e4beb4'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#ab8980'
  outline-variant: '#5b4039'
  surface-tint: '#ffba38'
  primary: '#ffba38'
  on-primary: '#432c00'
  primary-container: '#c08600'
  on-primary-container: '#3a2600'
  inverse-primary: '#7e5700'
  secondary: '#ffb5a0'
  on-secondary: '#5f1500'
  secondary-container: '#d73b00'
  on-secondary-container: '#fffbff'
  tertiary: '#ffb5a0'
  on-tertiary: '#601500'
  tertiary-container: '#fc5a29'
  on-tertiary-container: '#541100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeac'
  primary-fixed-dim: '#ffba38'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#ffdbd1'
  secondary-fixed-dim: '#ffb5a0'
  on-secondary-fixed: '#3b0900'
  on-secondary-fixed-variant: '#862200'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb5a0'
  on-tertiary-fixed: '#3b0900'
  on-tertiary-fixed-variant: '#872100'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  headline-xl:
    fontFamily: Anton
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 68px
    letterSpacing: 0.02em
  headline-xl-mobile:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Anton
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2.5rem
  margin-sm: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The brand visual language merges the raw culinary power of searing smash burgers with the calculated precision of high-end lifestyle commerce. It targets discerning food enthusiasts, urban epicures, and digital-first diners who value artisan culinary techniques over mass fast food. 

The aesthetic is characterized by:
- **Culinary High-Contrast:** Rich, cinematic photography showcasing glossy buns, charred edges, and molten cheese layered directly over obsidian and warm charcoal backdrops.
- **Controlled Luminescence:** Fire-inspired ember gradients and warm molten amber accents radiate selectively against matte dark surfaces, simulating the glowing heat of a flat-top grill.
- **Industrial Refinement:** Modern structural typography combined with tactile glass cards and delicate metallic borders, avoiding greasy fast-food clichés in favor of craft, quality, and hospitality rigor.

## Colors

The palette derives from combustion, cast-iron patinas, and rich artisanal ingredients.

### Palette Architecture
- **Primary Golden Mustard / Amber (`#FFB300`):** Rich, molten depth and high-visibility energy. Dedicated strictly to critical conversion triggers, primary interactive affordances, and vital statuses.
- **Secondary Flame (`#FF5722`):** Searing heat and secondary highlights, rating badges, promotional tags, and glowing border gradients.
- **Charred Ember (`#E64A19`):** Deeper thermal tier. Powers pressed active states, gradient blends, and dark badge backgrounds.
- **Backgrounds & Neutral Slates:**
  - `Base Canvas`: `#121316` (Near-void obsidian).
  - `Surface Tier 1`: `#1f1f23` (Muted dark cast-iron for foundational cards).
  - `Surface Tier 2`: `#292a2d` (Raised components, floating sheets, menus).
  - `Surface Tint / Border`: `rgba(255, 255, 255, 0.08)` to `rgba(255, 179, 0, 0.16)`.
- **Text & Contrast:** Pure crisp white (`#FFFFFF`) for bold titles and high-impact headings; warm smoke (`#e3e2e6`) for secondary body details; muted ash (`#868c98`) for helper text.

## Typography

The type system balances industrial street-side punch with contemporary editorial legibility:

- **Display & Headlines (Anton):** Condensed, commanding, and unapologetically bold. Headings simulate vintage butcher house and roadside burger signage reimagined through sleek modernism. Headlines should predominantly utilize uppercase styling to project authority and culinary presence.
- **Interface & Text (Plus Jakarta Sans):** Ergonomic, clean, and warm. Its subtle geometry and humanized terminals provide frictionless readability across configuration matrices, checkout funnels, ingredient lists, and nutrition specs.
- **Numbers & Prices:** Use `Plus Jakarta Sans` Bold or Extra Bold with tabular lining figures to ensure visual consistency when scanning pricing.

## Layout & Spacing

The design system uses an adaptable 12-column grid on desktop and tablet, collapsing to a single or 2-column structure on mobile devices:

- **Desktop (1024px+):** 12 columns, 1.5rem gutters, with a maximum layout container width of 1280px to preserve intense visual focus without over-stretching food imagery.
- **Tablet (640px - 1023px):** 8 columns, 1rem gutters, 2rem canvas margins.
- **Mobile (<640px):** 4 columns or single-column flow, 1rem gutters, 1.25rem margins to maximize horizontal room for rich product cards and sticky ordering actions.
- **Vertical Rhythm:** 4px baseline sub-grid. Component padding scales strictly along the `space-*` scale to keep menus, modifier groups, and order summaries structurally aligned.

## Elevation & Depth

Visual hierarchy uses luminous depth, tinted shadows, and translucent smoked glass rather than flat gray drop shadows:

- **Base Layer (Level 0):** `#121316` with occasional radial background glows (`rgba(255, 179, 0, 0.06)` centered behind hero food items).
- **Surface Layer (Level 1):** Solid `#1f1f23` or semi-transparent `#1f1f23EE` with a 1px perimeter border of `rgba(255, 255, 255, 0.07)`.
- **Raised Interactive Layer (Level 2 - Hovered Cards, Drawers):** `#292a2d` with subtle multi-tier shadows:
  - `0 10px 30px -10px rgba(0, 0, 0, 0.8)` combined with a soft amber bloom: `0 0 20px rgba(255, 179, 0, 0.15)`.
- **Glassmorphism Modifiers:** Cart drawers, floating navigational headers, and sticky bottom checkout bars utilize `backdrop-filter: blur(16px)` paired with `rgba(18, 19, 22, 0.82)` background fills and amber-tinted hair-width borders (`rgba(255, 179, 0, 0.18)`).

## Shapes

The interface balances precision corners with rounded ergonomics to create an appetizing yet structural design:
- Standard cards, interactive inputs, and modal dialogs use `roundedness: 2` (0.5rem / 8px).
- Image containers and prominent promotional hero cards adopt `rounded-lg` (1rem / 16px) to soften the perimeter around high-resolution food assets.
- Status chips, quantity toggles, and floating tags implement full pill radii (9999px) for friendly tactile touch points.

## Components

### Buttons
- **Primary Action (e.g., "Add to Bag", "Checkout"):** Gradient background `linear-gradient(135deg, #FFB300 0%, #ff5722 100%)`, solid dark text, bold uppercase label, 0.5rem radius. Subtle golden outer glow on hover (`box-shadow: 0 4px 20px rgba(255, 179, 0, 0.4)`).
- **Secondary Action (e.g., "Customize", "Order History"):** Background `#292a2d`, 1px border `rgba(255, 255, 255, 0.12)`, white text. Hover triggers `rgba(255, 179, 0, 0.15)` background with gold border accent (`#FFB300`).
- **Ghost/Tertiary:** Transparent fill with smoke text (`#e3e2e6`), changing to `#FFB300` on hover.

### Chips & Glowing Badges
- **Mustard / Premium Badges (e.g., "Wagyu Blend", "Top Seller"):** Deep gold wash (`rgba(255, 179, 0, 0.18)`), border in `rgba(255, 179, 0, 0.4)`, text in `#FFB300`, prefixed with subtle highlight micro-icons.
- **Flame Tags (e.g., "Spicy", "Chef's Cut"):** Dark ember backdrop (`rgba(255, 87, 34, 0.15)`), border `#ff5722`, text `#ff5722`.

### Cards (Product & Combo Items)
- **Structure:** Vertical card with high-gloss product photograph breaking slightly beyond the top frame edge. Slate base (`#1f1f23`), 1px translucent border (`rgba(255, 255, 255, 0.06)`).
- **Behavior:** On hover, the image scales subtly (1.04x), the card surface lifts with an amber rim accent, and an instant "Quick Add +" control slides into visibility.

### Checkboxes, Radio Buttons & Modifier Selectors
- **Radio Buttons (Single Selection / Patty Size):** Custom round control. Unchecked: 2px border `#343538`. Checked: Outer ring `#FFB300` with a center radiant gold pip.
- **Checkboxes (Add-ons / Sauces):** Custom square control with 4px radius. Checked state fills `#FFB300` with a sharp dark check mark.
- **Modifier Row:** Dark card strip that turns into a luminous border (`#FFB300`) with price delta (`+$2.50`) dynamically shifting to white text.

### Input Fields & Steppers
- **Text Inputs:** Solid dark fill `#121316`, border 1px `rgba(255, 255, 255, 0.12)`, text `#FFFFFF`, placeholder `#868c98`. Focus state drives border to `#FFB300` with a soft 2px diffused focus ring (`rgba(255, 179, 0, 0.25)`).
- **Quantity Steppers:** Compact pill capsule with slate background, containing `-` and `+` touch nodes with crisp tabular number display in between.