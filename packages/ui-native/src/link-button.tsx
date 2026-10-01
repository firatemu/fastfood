import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { NativeTheme } from './theme.js';

export type LinkButtonVariant = 'primary' | 'secondary' | 'danger';

export interface LinkButtonProps {
  variant?: LinkButtonVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  children: ReactNode;
  theme: NativeTheme;
}

export function LinkButton(props: LinkButtonProps) {
  const { variant = 'primary', onPress, accessibilityLabel, testID, children, theme } = props;
  const styles = createStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <Text style={[styles.label, styles[`variant_${variant}`]]}>{children}</Text>
    </Pressable>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    label: {
      fontSize: theme.fontSize.md.size,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    variant_primary: { color: theme.tokens.actionPrimaryBackground },
    variant_secondary: { color: theme.tokens.textPrimary },
    variant_danger: { color: theme.tokens.actionDangerBackground },
    pressed: { opacity: 0.7 },
  });
}
