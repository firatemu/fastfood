import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { NativeTheme } from './theme.js';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  theme: NativeTheme;
}

export function IconButton(props: IconButtonProps) {
  const {
    variant = 'secondary',
    size = 'md',
    label,
    icon,
    onPress,
    disabled = false,
    accessibilityLabel,
    testID,
    theme,
  } = props;
  const styles = createStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon}
      <Text style={styles.srOnly}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
    },
    size_sm: { width: 32, height: 32 },
    size_md: { width: 40, height: 40 },
    size_lg: { width: 48, height: 48 },
    variant_primary: { backgroundColor: theme.tokens.actionPrimaryBackground },
    variant_secondary: {
      backgroundColor: theme.tokens.actionSecondaryBackground,
      borderColor: theme.tokens.borderDefault,
      borderWidth: 1,
    },
    variant_ghost: { backgroundColor: 'transparent' },
    variant_danger: { backgroundColor: theme.tokens.actionDangerBackground },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
    srOnly: {
      // Visually hidden but readable by AT (VoiceOver/TalkBack).
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
    },
  });
}
