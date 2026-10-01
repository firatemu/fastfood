import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { NativeTheme } from './theme.js';

export type ButtonVariant = 'primary' | 'secondary' | 'save' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  children: ReactNode;
  theme: NativeTheme;
}

/**
 * Canonical Button primitive for React Native.
 * Phase 0 foundation only.
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    onPress,
    accessibilityLabel,
    testID,
    children,
    theme,
  } = props;
  const styles = createStyles(theme);
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {leftIcon}
      <Text style={[styles.label, styles[`label_${size}`]]}>{children}</Text>
      {rightIcon}
    </Pressable>
  );
}

function createStyles(theme: NativeTheme) {
  const { space, radius, fontSize, tokens } = theme;
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    size_sm: { paddingHorizontal: space[4], height: 36 },
    size_md: { paddingHorizontal: space[4], height: 44 },
    size_lg: { paddingHorizontal: space[5], height: 52 },
    variant_primary: {
      backgroundColor: tokens.actionPrimaryBackground,
    },
    variant_secondary: {
      backgroundColor: tokens.actionSecondaryBackground,
      borderColor: tokens.borderDefault,
    },
    variant_save: {
      backgroundColor: tokens.actionSaveBackground,
    },
    variant_danger: {
      backgroundColor: tokens.actionDangerBackground,
    },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.6 },
    label: {
      fontWeight: '600',
      color: tokens.textPrimary,
    },
    label_sm: { fontSize: fontSize.sm.size },
    label_md: { fontSize: fontSize.md.size },
    label_lg: { fontSize: fontSize.lg.size },
  });
}
