---
name: Kitchen & Fleet Command
colors:
  surface: '#101419'
  surface-dim: '#101419'
  surface-bright: '#36393f'
  surface-container-lowest: '#0a0f13'
  surface-container-low: '#181c21'
  surface-container: '#1c2025'
  surface-container-high: '#262a30'
  surface-container-highest: '#31353b'
  on-surface: '#e0e2ea'
  on-surface-variant: '#d6c4ac'
  inverse-surface: '#e0e2ea'
  inverse-on-surface: '#2d3136'
  outline: '#9e8e78'
  outline-variant: '#514532'
  surface-tint: '#ffba36'
  primary: '#ffd799'
  on-primary: '#432c00'
  primary-container: '#feb300'
  on-primary-container: '#6a4900'
  inverse-primary: '#7e5700'
  secondary: '#ffb5a0'
  on-secondary: '#5f1500'
  secondary-container: '#d73b00'
  on-secondary-container: '#fffbff'
  tertiary: '#b8e3ff'
  on-tertiary: '#00354a'
  tertiary-container: '#6bccff'
  on-tertiary-container: '#005575'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeac'
  primary-fixed-dim: '#ffba36'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#5f4100'
  secondary-fixed: '#ffdbd1'
  secondary-fixed-dim: '#ffb5a0'
  on-secondary-fixed: '#3b0900'
  on-secondary-fixed-variant: '#862200'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#101419'
  on-background: '#e0e2ea'
  surface-variant: '#31353b'
typography:
  headline-xl:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: 0.04em
  headline-lg:
    fontFamily: Anton
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.03em
  headline-md:
    fontFamily: Anton
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: -0.01em
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  metric-md:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered for industrial fast-food operations management, mission-critical multi-unit franchising, and real-time kitchen logistics. The visual tone balances commanding hospitality heritage with the relentless precision of an aerospace control room. The experience targets store directors, kitchen line coordinators, and fleet managers operating under high pressure, low tolerance for latency, and intense ambient restaurant lighting.

The aesthetic fuses **Utilitarian Brutalism** with **Modern Industrial Enterprise UI**:
- **High-Density Utility:** Maximize visual real estate without clutter. Zero decorative gradients, no unnecessary soft transitions, and no playful retail illustrations.
- **Urgent Scanning Dynamics:** Monospaced tabular data, bold status telemetry, and rigid horizontal lines allow operators to triage orders, monitor fryer downtimes, and track dispatch SLA breaches in split seconds.
- **Physical Control Metaphors:** Segmented rockers, tactile keyline boundaries, high-contrast indicators, and authoritative metric counters inspired by high-output commercial kitchen control modules.

## Colors

The system relies on an uncompromising dark-mode palette designed for continuous shift work across POS monitors, wall-mounted KDS (Kitchen Display System) screens, and mobile dispatcher tablets.

### Core Canvas & Surfaces
- **Canvas Base (`#0D0F12`):** Structural viewport background, zero glare.
- **Canvas Sub-base (`#13171C`):** Side navigation, collapsed command trays, utility footers.
- **Surface Elevation 1 (`#161B22`):** Data tables, operational cards, modular dashboards.
- **Surface Elevation 2 (`#1F242D`):** Modal dialogs, floating flyouts, table header rows, hovered list items.
- **Surface Elevation 3 (`#262C36`):** Active popovers, nested sub-tables, split drawers.
- **Keyline & Grid Borders (`#2D333F`):** Strict 1px structural separator across all cards, cells, and dividers.
- **High-Contrast Keyline (`#3E4656`):** Focus rings, active dividers, and prominent segment splitters.

### Functional & Signal Accents
- **Primary Accent (`#FEB300` / `#F59E0B`):** Brand Warm Amber Gold. Reserved strictly for primary operational triggers, selected navigation indices, batch approvals, and key summary KPIs.
- **Secondary Accent (`#FF5722` / `#EA580C`):** Deep Ember Flame. Reserved for kitchen ticket threshold breaches, order shelf expiration warnings, high-priority incident flags, and emergency stops.

### Operational Telemetry Statuses
- **Ready / Completed / Flow Nominal (`#10B981`):** Kitchen completion, successful courier handoff, operational readiness.
- **Warning / In-Prep / Expedited (`#F59E0B`):** Cook cycle in-progress, pending driver assignment, delivery margin threshold.
- **Critical / Rejected / Down (`#EF4444`):** Kitchen line stoppage, order cancellation, inventory stock-out, delivery breach.
- **Logistics / En Route / Courier (`#38BDF8`):** Fleet dispatch, transit tracking, external delivery partner integration.
- **Suspended / Draft / Inactive (`#64748B`):** Idle fryer/grill, draft product build, parked ticket.

Always pair semantic status colors with tinted dark background wells (e.g., `#EF4444` foreground with `rgba(239, 68, 68, 0.12)` background) and a solid 1px keyed border to preserve critical contrast under varying screen calibrations.

## Typography

The type hierarchy cleanly isolates brand power, analytical efficiency, and dense readability:
- **Display Headlines (`Anton`):** Applied strictly to top-level station headings, major portal titles, shift summaries, and global franchise KPI callouts. Text rendered in Anton must always be styled uppercase with tracking to command authority without degradation.
- **Operational Data & Text (`Inter`):** Powers all system tables, operational logs, instructions, forms, and alerts. Neutral, modern, and legible at small sizes (12px–13px) with high x-height.
- **Tabular & Code Tokens (`JetBrains Mono`):** Non-negotiable for order IDs, POS terminal numbers, inventory counts, currency, cooking timers, and shelf expiration countdowns. All numbers in `Inter` tables must activate OpenType tabular lining figures (`font-variant-numeric: tabular-nums`).

### Micro-Rules
- Headers that present order numbers, SKUs, or times must never use `Anton`; they must use `metric-md` or `data-mono`.
- Section table headers rely on `label-caps` in uppercase format with a dimmed color token (`#94A3B8`) to guide data scanning without competing with cell values.

## Layout & Spacing

This layout system accommodates dense information dashboards, table-heavy administrative views, and multi-lane Kanban dispatch boards.

### Grid & Viewport Structure
- **Fluid Multi-Pane Layout:** Default layout is a full-bleed dashboard with a 64px collapsed icon rail (expandable to 240px) and a fixed-height 48px top operational status bar.
- **Grid Architecture:** 12-column fluid grid system on desktop (`min-width: 1280px`) with dense `0.75rem` to `1rem` column gutters.
- **Responsive Adaptations:**
  - **Desktop / Control Station (>1280px):** Simultaneous triple-pane view (Station Nav | Main Processing Grid / High-Density Table | Live Order Detail / Audit Drawer).
  - **Tablet / Line Terminal (768px - 1279px):** Dual-pane layout. Navigation collapses into an off-canvas drawer or top toggle bar. The inspection drawer transforms into a slide-over modal sheet.
  - **Handheld Dispatch (<= 767px):** Single-column stacked layout with persistent bottom order status dock and full-screen tabular drill-downs.

### Spacing Philosophy
Spacing tokens are compressed compared to consumer software. Standard data row heights are 36px (compact) or 44px (default). Internal card padding never exceeds `space-lg` (16px), keeping real-time metrics, line status, and controls above the fold on industrial touchscreens.

## Elevation & Depth

To avoid visual fuzziness on industrial anti-glare screens, this design system rejects blurry, high-spread dropshadows in favor of **Tonal Layering with Crisp Keyline Borders**.

### Depth Layers
- **Floor Zero (Canvas `#0D0F12`):** Receded base level holding empty space and background rails.
- **Tier 1 (Surface `#161B22` with 1px border `#2D333F`):** Standard operational container. Flat, authoritative, grounded.
- **Tier 2 (Surface `#1F242D` with 1px border `#3E4656` and shadow):** Active interactive elements, focused cards, pinned table headers, and dropdown menus. Uses an ambient shadow: `0 4px 16px rgba(0, 0, 0, 0.45)`.
- **Tier 3 (Overlay `#262C36` with 1px border `#F59E0B` or `#38BDF8`):** Critical alerts, urgent order modifications, and drill-down inspector sidebars. Uses a tight perimeter shadow: `0 8px 32px rgba(0, 0, 0, 0.70), 0 0 0 1px rgba(255, 255, 255, 0.05)`.

### Border Integrity
Every container, drawer, and table header cell must be separated by explicit 1px lines using the keyline color `#2D333F`. Depth is signaled through tonal brightness differences in background fills rather than large blur radii.

## Shapes

The shape system employs an intentional low-radius geometric discipline (`roundedness: 1`). Soft curves degrade the rugged, professional industrial aesthetic of fast-food operations and reduce pixel efficiency in data-dense grids.

### Corner Radius Mapping
- **Buttons, Form Inputs, Segmented Tabs:** `2px` to `4px` (`0.125rem` – `0.25rem`). Sharp, solid, precise touch targets.
- **Data Cards, Modals, System Drawers:** `4px` (`0.25rem`). Maintains crisp keyline seams at grid junctions.
- **Status Pills, Telemetry Chips, Badges:** `2px` or subtle box geometries (`rounded-xs`). Pill-shaped radii (`9999px`) are strictly prohibited to avoid playful, consumer retail metaphors.
- **Checkboxes & Segment Switches:** `2px` corner rounding for a mechanical, switchboard look.

## Components

### High-Density Data Tables
- **Header:** Height 32px, background `#1F242D`, text in `label-caps` (`#94A3B8`). Top and bottom borders in `#2D333F`.
- **Row:** Height 36px (compact) or 44px (default). Background `#161B22`, alternating row background `#13171C`. Border-bottom 1px solid `#2D333F`.
- **Hover & Selected:** Hovered row shifts to `#1F242D`; selected row features a 2px left border accent in Warm Amber (`#FEB300`) with background `rgba(254, 179, 0, 0.06)`.
- **Cells:** Tabular numbers aligned right using `data-mono`. Text aligned left using `body-md`. Actions pinned to sticky right column with minimal icon buttons.

### Buttons & Action Triggers
- **Primary Operational Button:** Solid Amber Gold (`#FEB300`), text in `#0D0F12` with heavy bold weight (`font-weight: 700`). Radius 2px. Minimum height 34px on desktop, 42px on touchscreen terminals. Active state scales to `98%` with background `#F59E0B`.
- **Urgent / Hazard Action:** Solid Flame (`#FF5722`), text in `#FFFFFF`. Used for emergency stops, order voids, and kitchen alerts.
- **Secondary Keyline Button:** Transparent background, 1px keyline border `#3E4656`, text `#F1F5F9`. Hover state changes border to `#FEB300` and text to `#FEB300`.
- **Icon Utility Button:** 32x32px square, border 1px solid `#2D333F`, surface `#161B22`, icon `#94A3B8`. Hover states tint to `#FFFFFF` with border `#64748B`.

### Status Badges & Telemetry Chips
- **Geometry:** Height 20px, horizontal padding 6px, radius 2px.
- **Structure:** 1px perimeter border, dark tinted background (8% to 14% opacity), high-contrast foreground text rendered in `label-mono`.
- **Telemetry Dot:** 6px square or circular pulsing indicator on the left side of the chip for live streaming states (e.g., active courier ping, live kitchen grill sensor).

### Inputs & Operational Controls
- **Form Fields:** Height 34px. Background `#0D0F12`, border 1px solid `#2D333F`, text `#FFFFFF`, typography `body-md`. Focus state renders a 1px solid `#FEB300` outline with zero fuzzy focus rings.
- **Tabular Numeric Steppers:** Steppers for quantities and stock counts integrate direct `data-mono` inputs flanked by industrial minus/plus buttons (`#1F242D` fill).
- **Segmented Station Switcher:** Enclosed box segmented control. Background `#0D0F12`, active segment `#1F242D` with an active 1px border `#FEB300` and amber text.

### Checkboxes, Radios & Switches
- **Checkboxes:** 16x16px square, radius 2px, border 1px solid `#64748B`, background `#0D0F12`. Checked state: background `#FEB300`, border `#FEB300`, checkmark icon in dark slate (`#0D0F12`).
- **Radio Buttons:** 16x16px circle with a solid 6px inner dot when active.
- **Toggle Switches:** Hard-edged toggle tracks (width 32px, height 18px, radius 2px). Track changes from `#2D333F` (off) to `#FEB300` (on) with a white rectangular slider handle.

### Operational Alert Banners & Drawers
- **Alert Strip:** Hard left border (4px solid) colored by semantic severity (Green, Amber, Flame, Blue). Background `#161B22`, internal padding `space-md`. Displays monospace timestamp, station ID, and action button.
- **Slide-Over Audit Drawer:** Slides from right viewport edge (width 440px). Background `#161B22`, border-left 1px solid `#3E4656`. Header showcases order ID in `metric-md` and station tag, with sticky action controls docked at the bottom.