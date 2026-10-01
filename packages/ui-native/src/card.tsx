import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export type CardElevation = 'flat' | 'raised' | 'floating';

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  elevation?: CardElevation;
  children?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  theme: NativeTheme;
}

export function Card(props: CardProps) {
  const {
    title,
    subtitle,
    footer,
    elevation = 'raised',
    children,
    testID,
    accessibilityLabel,
    theme,
  } = props;
  const styles = createStyles(theme);
  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, styles[`elevation_${elevation}`]]}
    >
      {title || subtitle ? (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: theme.radius.lg,
      borderColor: theme.color.neutral[200],
      borderWidth: 1,
      overflow: 'hidden',
    },
    elevation_flat: { shadowOpacity: 0 },
    elevation_raised: {
      shadowOpacity: 0.06,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      shadowColor: theme.color.neutral[950],
      elevation: 1,
    },
    elevation_floating: {
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      shadowColor: theme.color.neutral[950],
      elevation: 4,
    },
    header: {
      padding: theme.space[4],
      borderBottomColor: theme.color.neutral[200],
      borderBottomWidth: 1,
    },
    title: {
      fontSize: theme.fontSize.lg.size,
      fontWeight: '700',
      color: theme.tokens.textPrimary,
    },
    subtitle: {
      marginTop: theme.space[1],
      fontSize: theme.fontSize.sm.size,
      color: theme.tokens.textSecondary,
    },
    body: {
      padding: theme.space[5],
    },
    footer: {
      padding: theme.space[3],
      borderTopColor: theme.color.neutral[200],
      borderTopWidth: 1,
      backgroundColor: theme.tokens.surfaceSubtle,
    },
  });
}
