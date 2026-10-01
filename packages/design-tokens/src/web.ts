/**
 * CSS variable name conventions. Web packages must consume these via
 * Tailwind/CSS modules, never inline literals.
 */
import {
  breakpoint,
  color,
  easing,
  fontFamily,
  fontSize,
  motion,
  radius,
  shadow,
  space,
} from './primitives.js';
import { semanticThemes, type ThemeName } from './semantic.js';

function px(value: number): string {
  return `${value}px`;
}

export function buildCssVariableBlock(theme: ThemeName): string {
  const t = semanticThemes[theme];
  const lines: string[] = [];
  lines.push(`:root[data-theme="${theme}"] {`);
  // Semantic surfaces / text / border
  lines.push(`  --surface-canvas: ${t.surfaceCanvas};`);
  lines.push(`  --surface-card: ${t.surfaceCard};`);
  lines.push(`  --surface-subtle: ${t.surfaceSubtle};`);
  lines.push(`  --surface-elevated: ${t.surfaceElevated};`);
  lines.push(`  --surface-overlay: ${t.surfaceOverlay};`);
  lines.push(`  --text-primary: ${t.textPrimary};`);
  lines.push(`  --text-secondary: ${t.textSecondary};`);
  lines.push(`  --text-muted: ${t.textMuted};`);
  lines.push(`  --text-inverse: ${t.textInverse};`);
  lines.push(`  --border-default: ${t.borderDefault};`);
  lines.push(`  --border-subtle: ${t.borderSubtle};`);
  lines.push(`  --border-strong: ${t.borderStrong};`);
  // Actions
  lines.push(`  --action-primary-background: ${t.actionPrimaryBackground};`);
  lines.push(`  --action-primary-hover: ${t.actionPrimaryHover};`);
  lines.push(`  --action-primary-active: ${t.actionPrimaryActive};`);
  lines.push(`  --action-primary-text: ${t.actionPrimaryText};`);
  lines.push(`  --action-primary-subtle: ${t.actionPrimarySubtle};`);
  lines.push(`  --action-primary-subtle-text: ${t.actionPrimarySubtleText};`);
  lines.push(`  --action-secondary-background: ${t.actionSecondaryBackground};`);
  lines.push(`  --action-secondary-hover: ${t.actionSecondaryHover};`);
  lines.push(`  --action-secondary-text: ${t.actionSecondaryText};`);
  lines.push(`  --action-secondary-border: ${t.actionSecondaryBorder};`);
  lines.push(`  --action-save-background: ${t.actionSaveBackground};`);
  lines.push(`  --action-danger-background: ${t.actionDangerBackground};`);
  lines.push(`  --focus-ring: ${t.focusRing};`);
  // Status
  lines.push(`  --status-success-background: ${t.statusSuccessBackground};`);
  lines.push(`  --status-success-text: ${t.statusSuccessText};`);
  lines.push(`  --status-warning-background: ${t.statusWarningBackground};`);
  lines.push(`  --status-warning-text: ${t.statusWarningText};`);
  lines.push(`  --status-danger-background: ${t.statusDangerBackground};`);
  lines.push(`  --status-danger-text: ${t.statusDangerText};`);
  lines.push(`  --status-info-background: ${t.statusInfoBackground};`);
  lines.push(`  --status-info-text: ${t.statusInfoText};`);
  lines.push(`  --status-pending-background: ${t.statusPendingBackground};`);
  lines.push(`  --status-pending-text: ${t.statusPendingText};`);
  lines.push(`  --status-processing-background: ${t.statusProcessingBackground};`);
  lines.push(`  --status-processing-text: ${t.statusProcessingText};`);
  lines.push(`  --status-completed-background: ${t.statusCompletedBackground};`);
  lines.push(`  --status-completed-text: ${t.statusCompletedText};`);
  lines.push(`  --status-cancelled-background: ${t.statusCancelledBackground};`);
  lines.push(`  --status-cancelled-text: ${t.statusCancelledText};`);
  lines.push(`  --status-refunded-background: ${t.statusRefundedBackground};`);
  lines.push(`  --status-refunded-text: ${t.statusRefundedText};`);
  // Flat status aliases used by legacy component CSS selectors
  lines.push(`  --color-success-50: ${t.statusSuccessBackground};`);
  lines.push(`  --color-success-700: ${t.statusSuccessText};`);
  lines.push(`  --color-warning-50: ${t.statusWarningBackground};`);
  lines.push(`  --color-warning-600: ${t.statusWarningText};`);
  lines.push(`  --color-danger-50: ${t.statusDangerBackground};`);
  lines.push(`  --color-danger-700: ${t.statusDangerText};`);
  lines.push(`  --color-info-50: ${t.statusInfoBackground};`);
  lines.push(`  --color-info-600: ${t.statusInfoText};`);
  // Layout
  lines.push(`  --layout-page-gutter: ${t.layoutPageGutter};`);
  lines.push(`  --layout-content-max: ${t.layoutContentMax};`);
  // Density / Ops chrome
  lines.push(`  --density-control-height: ${t.densityControlHeight};`);
  lines.push(`  --density-row-height: ${t.densityRowHeight};`);
  lines.push(`  --density-font-size: ${t.densityFontSize};`);
  lines.push(`  --density-font-line: ${t.densityFontLine};`);
  lines.push(`  --radius-control: ${t.radiusControl};`);
  lines.push(`  --radius-panel: ${t.radiusPanel};`);
  lines.push(`  --shadow-panel: ${t.shadowPanel};`);
  lines.push(`  --shadow-overlay: ${t.shadowOverlay};`);
  // Font family
  lines.push(`  --font-family-sans: ${fontFamily.sans};`);
  // Spacing
  for (const [key, value] of Object.entries(space)) {
    lines.push(`  --space-${key}: ${px(value)};`);
  }
  // Radius
  for (const [key, value] of Object.entries(radius)) {
    lines.push(`  --radius-${key}: ${px(value)};`);
  }
  // Font size + line-height
  for (const [key, value] of Object.entries(fontSize)) {
    lines.push(`  --text-${key}-size: ${px(value.size)};`);
    lines.push(`  --text-${key}-line: ${px(value.lineHeight)};`);
  }
  // Shadows
  for (const [key, value] of Object.entries(shadow)) {
    lines.push(`  --shadow-${key}: ${value};`);
  }
  // Motion
  for (const [key, value] of Object.entries(motion)) {
    lines.push(`  --motion-${key}: ${value}ms;`);
  }
  lines.push(`  --easing-standard: ${easing.standard};`);
  // Breakpoints
  for (const [key, value] of Object.entries(breakpoint)) {
    lines.push(`  --bp-${key}: ${px(value)};`);
  }
  // Primitive color reference (for theme authors, components should prefer semantics)
  for (const [scale, shades] of Object.entries(color)) {
    if (typeof shades === 'string') continue;
    for (const [shade, value] of Object.entries(shades as Record<string, unknown>)) {
      if (typeof value === 'string') {
        lines.push(`  --color-${scale}-${shade}: ${value};`);
      } else if (value && typeof value === 'object') {
        for (const [nestedShade, nestedValue] of Object.entries(value as Record<string, string>)) {
          lines.push(`  --color-${scale}-${shade}-${nestedShade}: ${nestedValue};`);
        }
      }
    }
  }
  lines.push('}');
  return lines.join('\n');
}

export function buildAllThemesCss(): string {
  const header = [
    '/* Generated by packages/design-tokens — do not edit by hand. */',
    '/* Source of truth: fastfood-project-docs/38-DESIGN_FOUNDATION_TOKENS.md */',
    '',
  ].join('\n');
  return [
    header,
    buildCssVariableBlock('storefront'),
    '',
    buildCssVariableBlock('operations'),
  ].join('\n');
}
