<!-- DEPRECATED 2026-10-06 by ADR-019. DO NOT derive tokens from this file. -->
<!-- This is an orphan from an earlier design generation. Its palette does not -->
<!-- match any shipped code.html in this package. Authority is screen.png then  -->
<!-- code.html only. See docs/adrs/ADR-019-admin-visual-system-navy.md and       -->
<!-- docs/admin-rebuild/03_ADMIN_DESIGN_FOUNDATION.md.                          -->
---
name: Obsidian Amber Kitchen Ops
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#d1c6ab'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#9a9078'
  outline-variant: '#4d4632'
  surface-tint: '#eec200'
  primary: '#ffecb9'
  on-primary: '#3c2f00'
  primary-container: '#facc15'
  on-primary-container: '#6c5700'
  inverse-primary: '#735c00'
  secondary: '#ffca45'
  on-secondary: '#3f2e00'
  secondary-container: '#e4ae00'
  on-secondary-container: '#5b4400'
  tertiary: '#ffeacf'
  on-tertiary: '#442c00'
  tertiary-container: '#ffc772'
  on-tertiary-container: '#795100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe083'
  primary-fixed-dim: '#eec200'
  on-primary-fixed: '#231b00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#ffdf9a'
  secondary-fixed-dim: '#f7be1d'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#ffddb0'
  tertiary-fixed-dim: '#ffba46'
  on-tertiary-fixed: '#281800'
  on-tertiary-fixed-variant: '#614000'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system powers mission-critical, high-throughput fast-food operations management—from back-of-house kitchen display systems (KDS) and expedite lines to front-of-house drive-thru telemetry and inventory pipelines.

The aesthetic fuses **Modern High-Contrast Technical Minimalism** with **Industrial Cockpit Utility**:
- **Target Audience:** Shift supervisors, line expeditors, store managers, and regional operations directors working in high-glare, fast-paced commercial environments.
- **Emotional Response:** Immediate situational awareness, unyielding precision, rapid recognition without visual fatigue, and industrial authority.
- **Visual Direction:** Midnight-obsidian slate surfaces layered with glowing golden-amber metrics. Orange is strictly eliminated to prioritize intentional alert hierarchies: intense amber-yellow indicates urgency, operational flow, and vital telemetry against void-black structural containers.

## Colors

The palette is engineered for extreme contrast, dark-room legibility, and anti-glare kitchen displays under bright commercial overhead lights.

### Primary Operational Spectrum
- **Primary (`#FACC15` - Electric Amber/Yellow):** The focal anchor. Reserved for critical interaction states, primary call-to-actions, active kitchen tickets, and live lead-time counters.
- **Secondary (`#EAB308` - Core Amber):** Used for analytical data points, mid-tier badges, secondary progress tracks, and active table groupings.
- **Tertiary (`#CA8A04` - Deep Burnished Amber):** Low-frequency indicators, subtle active borders, secondary sparkline plots, and structural highlights.

### Structural Neutrals
- **Canvas Base (`#0C0E12`):** Primary viewport backdrop, grounding the entire operational control plane in pure obsidian.
- **Surface Elevation 1 (`#111317`):** Base panels, side navigation rails, and default card surfaces.
- **Surface Elevation 2 (`#1A1D24`):** Elevated modals, nested table containers, ticket tiles, and hover states.
- **Borders & Dividers (`#262A35`):** Razor-thin structural delineation preventing visual blur between high-density operational slots.

### Data & Semantic Status
- **Success (`#4ADE80`):** Completed order / stocked / target met.
- **Critical Violation (`#F87171`):** SLA breached / thermal warning (strictly replaces orange with amber-yellow escalation prior to failure).
- **Text Primary (`#F8FAFC`):** Crisp white for terminal data points and high-speed scannability.
- **Text Muted (`#94A3B8`):** Low-priority metadata, column tags, and SKU identifiers.

## Typography

The type hierarchy prioritizes high information density and split-second operational clarity. **Plus Jakarta Sans** provides geometric precision with wide apertures, ensuring numbers, prep station acronyms, and timer counters remain immediately decipherable from arm's length or across a prep counter.

- **Numerics & Telemetry:** All timers, production counts, and ticket totals enforce tabular numerals (`tnum`) to eliminate layout jitter during high-velocity real-time updates.
- **Labels & Micro-data:** Micro-copy (`label-sm`, `label-md`) strictly utilizes uppercase formatting with deliberate letter-spacing (`0.04em` to `0.08em`) to guarantee quick recognition on ruggedized monitors.

## Layout & Spacing

The system implements a compact, dense **fluid grid** calibrated for intensive POS terminals, kitchen display monitors, and multi-lane drive-thru matrices.

- **Dense Information Grids:** Standard spacing operates on a baseline 4px scale, compacting default padding to allow maximum vertical data density. Kitchen display screens maximize horizontal throughput using dynamic 4 to 8 column modular swimlanes.
- **Breakpoints:**
  - **Mobile / Handheld Scanner (< 768px):** Single column, sticky bottom status tray, 12px outer canvas margins.
  - **Tablet / POS Terminal (768px - 1199px):** 6-column reflow, fixed 12px gutters, collapsible utility navigation.
  - **Desktop / KDS Array (1200px+):** 12-column or unbounded multi-lane swimlane, 16px section gutters, persistent live analytics rail.

## Elevation & Depth

This system avoids heavy, blurry drop shadows that create visual mud on dark screens. Depth is created through **tonal layering**, **structural micro-borders**, and **amber luminescence**:

- **Layer 0 (Canvas Base):** Deep `#0C0E12`. Non-interactive background plane.
- **Layer 1 (Card/Container Surfaces):** Solid `#111317` framed by a 1px border of `#262A35`.
- **Layer 2 (Active/Floating Widgets):** `#1A1D24` elevated with a 1px inner border highlight (`rgba(250, 204, 21, 0.15)`) and an ultra-subtle ambient perimeter shadow (`0 8px 24px rgba(0, 0, 0, 0.65)`).
- **Interactive Focus / Alert Glow:** Critical active states drop subtle yellow/amber radial backdrops: `0 0 16px rgba(250, 204, 21, 0.18)`, emphasizing priority tickets without sacrificing interface contrast.

## Shapes

The interface embraces a compact, semi-industrial aesthetic using **Level 1 (Soft)** roundedness:
- **Base Components (Inputs, Small Badges, Grid Cells):** `0.25rem` (4px). Clean, rigid corners that preserve maximum internal screen real estate for telemetry.
- **Cards, Kitchen Tickets & Containers (`rounded-lg`):** `0.5rem` (8px). Structural containment with just enough curvature to separate adjacent order queues.
- **System Overlays & Modals (`rounded-xl`):** `0.75rem` (12px). Distinctive boundary separation for high-level supervisory dialogs.

## Components

### Buttons
- **Primary High-Impact (e.g., "BUMP TICKET", "DISPATCH"):** Solid `#FACC15` fill with deep obsidian `#0C0E12` heavy-weight typography. On hover: shifts to `#EAB308`. Active: micro-scale to 98%.
- **Secondary Action (e.g., "HOLD", "RE-PRINT"):** Dark slate fill `#1A1D24`, bordered with `#262A35`, crisp `#F8FAFC` text. On hover: border shifts to `#CA8A04` with subtle amber illumination.
- **Danger/Void:** `#111317` surface with `#F87171` text and outline.

### Badges & Operational Chips
- **SLA In-Progress / Warning:** Deep amber background tint (`rgba(250, 204, 21, 0.12)`), solid 1px border (`#CA8A04`), vibrant yellow text (`#FACC15`).
- **Station Identifiers (GRILL, FRY, EXPE):** Compact 4px corner radius, bold condensed text, `#1A1D24` background with station-specific amber or slate indicators.

### Kitchen Order Cards (KDS Tiles)
- **Structure:** Background `#111317`, 1px boundary border `#262A35`.
- **Header:** Houses order number, channel tag (DRIVE-THRU, MOBILE, COUNTER), and live ticking elapsed counter.
- **Urgent State (Nearing target limit):** Border illuminates to `#FACC15`, elapsed timer pulses with vibrant yellow text.

### Data Visualizations & Kitchen Velocity Charts
- **Line & Bar Metrics:** Multi-tier amber charts (`#FACC15` for current pace, `#CA8A04` for projected shift averages, `#262A35` for target grid lines).
- **Area Fills:** Gradient transitions smoothly from `rgba(250, 204, 21, 0.25)` to transparent obsidian.

### Input Fields & Controls
- **Inputs:** Dark field `#0C0E12`, hairline border `#262A35`, focused state replaces border with sharp 1.5px `#FACC15` and a tight amber glow.
- **Checkboxes & Radios:** Angular, customized with `#FACC15` fill and obsidian indicators upon selection.