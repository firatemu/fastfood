/**
 * Semantic design tokens. Document 38 §6 + §7.
 *
 * Components consume semantic tokens only. Two theme expressions
 * (Storefront + Operations) share the same primitive palette but reference
 * different semantic aliases.
 */
import { color, fontSize, radius, shadow, space } from './primitives.js';

export type ThemeName = 'storefront' | 'operations';

export interface ThemeSemanticTokens {
  surfaceCanvas: string;
  surfaceCard: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  surfaceOverlay: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  borderDefault: string;
  borderSubtle: string;
  borderStrong: string;
  actionPrimaryBackground: string;
  actionPrimaryHover: string;
  actionPrimaryActive: string;
  actionPrimaryText: string;
  actionPrimarySubtle: string;
  actionPrimarySubtleText: string;
  actionSecondaryBackground: string;
  actionSecondaryHover: string;
  actionSecondaryText: string;
  actionSecondaryBorder: string;
  actionSaveBackground: string;
  actionDangerBackground: string;
  focusRing: string;
  statusSuccessBackground: string;
  statusSuccessText: string;
  statusWarningBackground: string;
  statusWarningText: string;
  statusDangerBackground: string;
  statusDangerText: string;
  statusInfoBackground: string;
  statusInfoText: string;
  statusPendingBackground: string;
  statusPendingText: string;
  statusProcessingBackground: string;
  statusProcessingText: string;
  statusCompletedBackground: string;
  statusCompletedText: string;
  statusCancelledBackground: string;
  statusCancelledText: string;
  statusRefundedBackground: string;
  statusRefundedText: string;
  /** Page horizontal gutter for Ops chrome. */
  layoutPageGutter: string;
  /** Max content width for form/detail pages (tables may be full-bleed). */
  layoutContentMax: string;
  /** Compact control height for information-dense Ops surfaces. */
  densityControlHeight: string;
  /** Compact table / list row height. */
  densityRowHeight: string;
  /** Default body size for dense Ops chrome. */
  densityFontSize: string;
  densityFontLine: string;
  /** Control / chip radius for dense Ops. */
  radiusControl: string;
  /** Panel / card radius for Ops chrome. */
  radiusPanel: string;
  shadowPanel: string;
  shadowOverlay: string;
}

const STOREFRONT: ThemeSemanticTokens = {
  surfaceCanvas: color.brand.cream[50],
  surfaceCard: color.neutral[0],
  surfaceSubtle: color.neutral[50],
  surfaceElevated: color.neutral[0],
  surfaceOverlay: 'rgba(23, 23, 23, 0.45)',
  textPrimary: color.neutral[900],
  textSecondary: color.neutral[600],
  textMuted: color.neutral[500],
  textInverse: color.neutral[0],
  borderDefault: color.neutral[200],
  borderSubtle: color.neutral[100],
  borderStrong: color.neutral[300],
  actionPrimaryBackground: color.brand.red[600],
  actionPrimaryHover: color.brand.red[700],
  actionPrimaryActive: color.brand.red[700],
  actionPrimaryText: color.neutral[0],
  actionPrimarySubtle: color.brand.red[50],
  actionPrimarySubtleText: color.brand.red[700],
  actionSecondaryBackground: color.neutral[0],
  actionSecondaryHover: color.neutral[50],
  actionSecondaryText: color.neutral[900],
  actionSecondaryBorder: color.neutral[200],
  actionSaveBackground: color.semantic.success[700],
  actionDangerBackground: color.semantic.danger[600],
  focusRing: color.brand.orange[500],
  statusSuccessBackground: color.semantic.success[50],
  statusSuccessText: color.semantic.success[700],
  statusWarningBackground: color.semantic.warning[50],
  statusWarningText: color.semantic.warning[600],
  statusDangerBackground: color.semantic.danger[50],
  statusDangerText: color.semantic.danger[700],
  statusInfoBackground: color.semantic.info[50],
  statusInfoText: color.semantic.info[600],
  statusPendingBackground: color.neutral[100],
  statusPendingText: color.neutral[700],
  statusProcessingBackground: color.semantic.info[50],
  statusProcessingText: color.semantic.info[600],
  statusCompletedBackground: color.semantic.success[50],
  statusCompletedText: color.semantic.success[700],
  statusCancelledBackground: color.neutral[100],
  statusCancelledText: color.neutral[600],
  statusRefundedBackground: color.semantic.warning[50],
  statusRefundedText: color.semantic.warning[600],
  layoutPageGutter: `${space[6]}px`,
  layoutContentMax: '960px',
  densityControlHeight: `${space[10]}px`,
  densityRowHeight: `${space[12]}px`,
  densityFontSize: `${fontSize.md.size}px`,
  densityFontLine: `${fontSize.md.lineHeight}px`,
  radiusControl: `${radius.md}px`,
  radiusPanel: `${radius.lg}px`,
  shadowPanel: shadow.sm,
  shadowOverlay: shadow.lg,
};

const OPERATIONS: ThemeSemanticTokens = {
  surfaceCanvas: color.neutral[50],
  surfaceCard: color.neutral[0],
  surfaceSubtle: color.neutral[100],
  surfaceElevated: color.neutral[0],
  surfaceOverlay: 'rgba(23, 23, 23, 0.4)',
  textPrimary: color.neutral[900],
  textSecondary: color.neutral[600],
  textMuted: color.neutral[500],
  textInverse: color.neutral[0],
  borderDefault: color.neutral[200],
  borderSubtle: color.neutral[100],
  borderStrong: color.neutral[300],
  actionPrimaryBackground: color.ops.blue[600],
  actionPrimaryHover: color.ops.blue[700],
  actionPrimaryActive: color.ops.blue[800],
  actionPrimaryText: color.neutral[0],
  actionPrimarySubtle: color.ops.blue[50],
  actionPrimarySubtleText: color.ops.blue[700],
  actionSecondaryBackground: color.neutral[0],
  actionSecondaryHover: color.ops.blue[50],
  actionSecondaryText: color.neutral[900],
  actionSecondaryBorder: color.neutral[200],
  actionSaveBackground: color.semantic.success[700],
  actionDangerBackground: color.semantic.danger[600],
  focusRing: color.ops.blue[500],
  statusSuccessBackground: color.semantic.success[50],
  statusSuccessText: color.semantic.success[700],
  statusWarningBackground: color.semantic.warning[50],
  statusWarningText: color.semantic.warning[600],
  statusDangerBackground: color.semantic.danger[50],
  statusDangerText: color.semantic.danger[700],
  statusInfoBackground: color.ops.blue[50],
  statusInfoText: color.ops.blue[700],
  statusPendingBackground: color.neutral[100],
  statusPendingText: color.neutral[700],
  statusProcessingBackground: color.ops.blue[50],
  statusProcessingText: color.ops.blue[700],
  statusCompletedBackground: color.semantic.success[50],
  statusCompletedText: color.semantic.success[700],
  statusCancelledBackground: color.neutral[100],
  statusCancelledText: color.neutral[600],
  statusRefundedBackground: color.semantic.warning[50],
  statusRefundedText: color.semantic.warning[600],
  layoutPageGutter: `${space[5]}px`,
  layoutContentMax: '880px',
  // Ops density: tighter controls and rows for information-heavy screens
  densityControlHeight: `${space[8]}px`,
  densityRowHeight: `${space[10]}px`,
  densityFontSize: `${fontSize.sm.size}px`,
  densityFontLine: `${fontSize.sm.lineHeight}px`,
  radiusControl: `${radius.sm}px`,
  radiusPanel: `${radius.md}px`,
  shadowPanel: shadow.xs,
  shadowOverlay: shadow.md,
};

export const semanticThemes: Record<ThemeName, ThemeSemanticTokens> = {
  storefront: STOREFRONT,
  operations: OPERATIONS,
};

export function getSemanticTokens(theme: ThemeName): ThemeSemanticTokens {
  return semanticThemes[theme];
}
