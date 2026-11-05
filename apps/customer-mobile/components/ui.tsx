import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '../lib/haptics';
import { colors, minTouch, radius, space, type } from '../theme';

/**
 * Shared account-area controls.
 *
 * The shape of every screen here is the same: a quiet page title, a ledger of
 * hairline-separated rows, and at most one mustard action per screen. Keeping
 * that in one module is what stops the five account screens from drifting into
 * five different looks.
 */

export function MustardButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled || props.loading || !props.onPress}
      onPress={() => {
        haptic.light();
        props.onPress?.();
      }}
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.primaryPressed,
        props.disabled && styles.disabled,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={colors.onMustard} />
      ) : (
        <View style={styles.btnContent}>
          {props.icon ? (
            <MaterialCommunityIcons name={props.icon} size={18} color={colors.onMustard} />
          ) : null}
          <Text style={styles.primaryLabel}>{props.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function FlameButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled || props.loading || !props.onPress}
      onPress={() => {
        haptic.medium();
        props.onPress?.();
      }}
      style={({ pressed }) => [
        styles.flameBtn,
        pressed && styles.flameBtnPressed,
        props.disabled && styles.disabled,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.btnContent}>
          {props.icon ? (
            <MaterialCommunityIcons name={props.icon} size={18} color={colors.white} />
          ) : null}
          <Text style={styles.flameBtnLabel}>{props.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton(props: {
  label: string;
  onPress?: () => void;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        props.onPress?.();
      }}
      style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
    >
      <View style={styles.btnContent}>
        {props.icon ? (
          <MaterialCommunityIcons name={props.icon} size={18} color={colors.onSurface} />
        ) : null}
        <Text style={styles.secondaryLabel}>{props.label}</Text>
      </View>
    </Pressable>
  );
}

/** A quiet uppercase eyebrow. The screen's "where am I" line. */
export function SectionLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text style={styles.sectionLabel} accessibilityRole="header">
      {String(children).toUpperCase()}
    </Text>
  );
}

/** A page title. Jakarta, never Anton. */
export function PageTitle({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text style={styles.pageTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** The one sanctioned display figure per screen. */
export function Figure({ children }: { children: ReactNode }): ReactElement {
  return <Text style={styles.figure}>{children}</Text>;
}

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

const TONE_FG: Record<StatusTone, string> = {
  ok: colors.ok,
  warn: colors.warn,
  danger: colors.danger,
  info: colors.info,
  neutral: colors.onSurfaceVariant,
};
const TONE_BG: Record<StatusTone, string> = {
  ok: colors.okContainer,
  warn: colors.warnContainer,
  danger: colors.dangerContainer,
  info: colors.infoContainer,
  neutral: colors.surfaceHigh,
};
const TONE_LINE: Record<StatusTone, string> = {
  ok: colors.okBorder,
  warn: colors.warnBorder,
  danger: colors.dangerBorder,
  info: colors.infoBorder,
  neutral: colors.outlineVariant,
};

/**
 * A status pill. Always paired with a dot and always carrying its own hue —
 * the accent never means "warning", so "needs attention" cannot be mistaken
 * for "press here".
 */
export function StatusTag({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: StatusTone;
}): ReactElement {
  return (
    <View style={[styles.tag, { backgroundColor: TONE_BG[tone], borderColor: TONE_LINE[tone] }]}>
      <View style={[styles.tagDot, { backgroundColor: TONE_FG[tone] }]} />
      <Text style={[styles.tagLabel, { color: TONE_FG[tone] }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

/**
 * The ledger: a hairline-bordered box of rows. This is what replaced the card
 * stack on every account screen.
 */
export function Ledger({ children }: { children: ReactNode }): ReactElement {
  return <View style={styles.ledger}>{children}</View>;
}

export function LedgerRow(props: {
  label: string;
  hint?: string;
  value?: ReactNode;
  /** `last` removes the bottom hairline; `only` also drops the top padding. */
  edge?: 'first' | 'last' | 'only' | 'middle';
  onPress?: () => void;
  right?: ReactNode;
}): ReactElement {
  const body = (
    <>
      <View style={styles.rowKey}>
        <Text style={styles.rowLabel}>{props.label}</Text>
        {props.hint ? <Text style={styles.rowHint}>{props.hint}</Text> : null}
      </View>
      {props.right ?? (props.value ? <Text style={styles.rowValue}>{props.value}</Text> : null)}
    </>
  );

  const edgeStyle =
    props.edge === 'first' || props.edge === 'only'
      ? styles.rowEdgeFirst
      : props.edge === 'last'
        ? styles.rowEdgeLast
        : null;

  if (props.onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={props.onPress}
        style={({ pressed }) => [styles.row, edgeStyle, pressed && styles.rowPressed]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[styles.row, edgeStyle]}>{body}</View>;
}

export function LoadingBlock(props: { label?: string }): ReactElement {
  return (
    <View style={styles.block}>
      <ActivityIndicator color={colors.mustard} size="large" />
      {props.label ? <Text style={styles.blockText}>{props.label}</Text> : null}
    </View>
  );
}

export function ErrorBlock(props: {
  title: string;
  message: string;
  onRetry?: () => void;
}): ReactElement {
  return (
    <View style={styles.block}>
      <Text style={styles.errorTitle}>{props.title}</Text>
      <Text style={styles.blockText}>{props.message}</Text>
      {props.onRetry ? <SecondaryButton label="Yeniden dene" onPress={props.onRetry} /> : null}
    </View>
  );
}

export function EmptyBlock(props: {
  title: string;
  message: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  actionLabel?: string;
  onAction?: () => void;
}): ReactElement {
  return (
    <View style={styles.block}>
      {props.icon ? (
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name={props.icon} size={32} color={colors.onSurfaceVariant} />
        </View>
      ) : null}
      <Text style={styles.errorTitle}>{props.title}</Text>
      <Text style={styles.blockText}>{props.message}</Text>
      {props.actionLabel && props.onAction ? (
        <View style={{ marginTop: space.sm }}>
          <SecondaryButton label={props.actionLabel} onPress={props.onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function SkeletonBlock(props: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}): ReactElement {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width: props.width ?? '100%',
          height: props.height ?? 20,
          borderRadius: props.borderRadius ?? radius.sm,
        },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: colors.mustardPressed, transform: [{ scale: 0.98 }] },
  primaryLabel: { ...type.button, color: colors.onMustard },
  flameBtn: {
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.flame,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameBtnPressed: { backgroundColor: colors.ember, transform: [{ scale: 0.98 }] },
  flameBtnLabel: { ...type.button, color: colors.white },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondary: {
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: { backgroundColor: colors.surfaceHigh, transform: [{ scale: 0.98 }] },
  secondaryLabel: { ...type.button, color: colors.onSurface },
  disabled: { opacity: 0.4 },

  sectionLabel: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: space.xs,
  },
  pageTitle: { ...type.headlineXl, color: colors.onSurface },
  figure: { ...type.display, color: colors.onSurface },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  tagDot: { width: 5, height: 5, borderRadius: radius.full },
  tagLabel: { ...type.labelSm, fontSize: 10, lineHeight: 12 },

  ledger: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: space.row,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  rowEdgeFirst: { borderTopWidth: 0 },
  rowEdgeLast: { paddingBottom: 14 },
  rowPressed: { backgroundColor: colors.surfaceHigh },
  rowKey: { flex: 1, gap: 2 },
  rowLabel: { ...type.labelLg, color: colors.onSurface },
  rowHint: { ...type.bodySm, color: colors.onSurfaceVariant },
  rowValue: {
    ...type.labelLg,
    color: colors.onSurface,
    textAlign: 'right',
    flexShrink: 1,
  },

  block: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  skeleton: {
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
  },
  errorTitle: { ...type.headlineSm, color: colors.onSurface },
  blockText: { ...type.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
});
