import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastProps {
  variant?: ToastVariant;
  title: string;
  description?: string;
  onDismiss?: () => void;
  testID?: string;
  theme: NativeTheme;
}

export function Toast(props: ToastProps) {
  const { variant = 'info', title, description, onDismiss, testID, theme } = props;
  const styles = createStyles(theme);
  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'none';
  return (
    <View testID={testID} accessibilityRole={role} style={styles.base}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bildirimi kapat"
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismiss, pressed ? styles.pressed : null]}
        >
          <Text style={styles.dismissLabel}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: theme.space[3],
      backgroundColor: theme.tokens.surfaceCard,
      borderColor: theme.tokens.borderDefault,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      gap: theme.space[3],
    },
    body: { flex: 1 },
    title: { fontWeight: '700', color: theme.tokens.textPrimary, fontSize: theme.fontSize.md.size },
    desc: {
      color: theme.tokens.textSecondary,
      fontSize: theme.fontSize.sm.size,
      marginTop: theme.space[1],
    },
    dismiss: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.85 },
    dismissLabel: { fontSize: theme.fontSize.lg.size, color: theme.tokens.textSecondary },
  });
}
