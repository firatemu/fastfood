# Design Foundation Tokens

## 1. Status

These values are the canonical baseline visual identity until an explicit brand redesign updates the central tokens. Feature code must not substitute personal preferences.

## 2. Typography

Primary family: **Inter** with system fallback.

```text
font.family.sans = Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Scale:

| Token | Size | Line height | Weight guidance |
|---|---:|---:|---|
| `text.xs` | 12px | 16px | 400-600 |
| `text.sm` | 14px | 20px | 400-600 |
| `text.md` | 16px | 24px | 400-600 |
| `text.lg` | 18px | 28px | 500-700 |
| `text.xl` | 20px | 28px | 600-700 |
| `text.2xl` | 24px | 32px | 600-800 |
| `text.3xl` | 30px | 38px | 700-800 |
| `text.4xl` | 36px | 44px | 700-800 |
| `text.5xl` | 48px | 56px | 700-800 |

## 3. Spacing

4px base grid:

```text
space.0 = 0
space.1 = 4px
space.2 = 8px
space.3 = 12px
space.4 = 16px
space.5 = 20px
space.6 = 24px
space.8 = 32px
space.10 = 40px
space.12 = 48px
space.16 = 64px
space.20 = 80px
space.24 = 96px
```

## 4. Radius

```text
radius.sm = 6px
radius.md = 10px
radius.lg = 14px
radius.xl = 20px
radius.2xl = 28px
radius.full = 9999px
```

## 5. Primitive color palette

### Neutral

```text
neutral.0   #FFFFFF
neutral.50  #FAFAFA
neutral.100 #F5F5F5
neutral.200 #E5E5E5
neutral.300 #D4D4D4
neutral.400 #A3A3A3
neutral.500 #737373
neutral.600 #525252
neutral.700 #404040
neutral.800 #262626
neutral.900 #171717
neutral.950 #0A0A0A
```

### Storefront brand

```text
brand.red.50  #FFF1F2
brand.red.100 #FFE4E6
brand.red.500 #E11D2E
brand.red.600 #C81424
brand.red.700 #A9101D
brand.orange.500 #F97316
brand.amber.400  #FBBF24
brand.cream.50   #FFF9F2
```

### Operations blue

```text
ops.blue.50  #EFF6FF
ops.blue.100 #DBEAFE
ops.blue.500 #3B82F6
ops.blue.600 #2563EB
ops.blue.700 #1D4ED8
ops.blue.800 #1E40AF
```

### Semantic

```text
success.50  #F0FDF4
success.600 #16A34A
success.700 #15803D
warning.50  #FFFBEB
warning.600 #D97706
danger.50   #FEF2F2
danger.600  #DC2626
danger.700  #B91C1C
info.50     #EFF6FF
info.600    #2563EB
```

## 6. Storefront semantic tokens

```text
surface.canvas = brand.cream.50
surface.card = neutral.0
surface.subtle = neutral.50
surface.elevated = neutral.0
surface.overlay = rgba(23,23,23,.45)
text.primary = neutral.900
text.secondary = neutral.600
text.muted = neutral.500
text.inverse = neutral.0
border.default = neutral.200
border.subtle = neutral.100
border.strong = neutral.300
action.primary.background = brand.red.600
action.primary.hover = brand.red.700
action.primary.text = neutral.0
action.secondary.background = neutral.0
action.secondary.hover = neutral.50
action.secondary.text = neutral.900
action.secondary.border = neutral.200
action.save.background = success.700
action.danger.background = danger.600
focus.ring = brand.orange.500
status.success.background = success.50
status.success.text = success.700
status.warning.background = warning.50
status.warning.text = warning.600
status.danger.background = danger.50
status.danger.text = danger.700
status.info.background = info.50
status.info.text = info.600
density.controlHeight = 40px
density.rowHeight = 48px
density.fontSize = 16px
density.fontLine = 24px
radius.control = radius.md
radius.panel = radius.lg
shadow.panel = shadow.sm
shadow.overlay = shadow.lg
```

## 7. Operations semantic tokens

```text
surface.canvas = neutral.50
surface.card = neutral.0
surface.subtle = neutral.100
surface.elevated = neutral.0
surface.overlay = rgba(23,23,23,.4)
text.primary = neutral.900
text.secondary = neutral.600
text.muted = neutral.500
text.inverse = neutral.0
border.default = neutral.200
border.subtle = neutral.100
border.strong = neutral.300
action.primary.background = ops.blue.600   (#2563EB)
action.primary.hover = ops.blue.700
action.primary.text = neutral.0
action.secondary.background = neutral.0
action.secondary.hover = ops.blue.50
action.secondary.text = neutral.900
action.secondary.border = neutral.200
action.save.background = success.700
action.danger.background = danger.600
focus.ring = ops.blue.500
status.success.background = success.50
status.success.text = success.700
status.warning.background = warning.50
status.warning.text = warning.600
status.danger.background = danger.50
status.danger.text = danger.700
status.info.background = ops.blue.50
status.info.text = ops.blue.700
density.controlHeight = 32px
density.rowHeight = 40px
density.fontSize = 14px
density.fontLine = 20px
radius.control = radius.sm
radius.panel = radius.md
shadow.panel = shadow.xs
shadow.overlay = shadow.md
```

Storefront mirrors the same semantic *keys* with Storefront values
(warmer canvas, brand-red primary, comfortable density).

## 8. Elevation

Use a small controlled set only:

```text
shadow.xs = 0 1px 1px rgba(0,0,0,.04)
shadow.sm = 0 1px 2px rgba(0,0,0,.06)
shadow.md = 0 6px 20px rgba(0,0,0,.08)
shadow.lg = 0 16px 40px rgba(0,0,0,.12)
```

## 9. Motion

```text
motion.fast = 120ms
motion.normal = 180ms
motion.slow = 260ms
easing.standard = cubic-bezier(0.2, 0, 0, 1)
```

Respect reduced-motion preferences.

## 10. Breakpoints

```text
xs = 360px
sm = 480px
md = 768px
lg = 1024px
xl = 1280px
2xl = 1536px
```

## 11. Layout

- Storefront content max width: 1280px baseline.
- Admin wide data layouts may use larger fluid width.
- Mobile touch targets should target at least ~44px practical interactive area.
- Forms use consistent field heights from component tokens, not page overrides.

## 12. Token change rule

A future brand change modifies central primitive/semantic tokens. Feature pages must not be hand-edited to recolor matching controls.
