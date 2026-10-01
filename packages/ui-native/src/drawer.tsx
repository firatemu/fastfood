import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface DrawerProps {
  open: boolean;
  title: string;
  side?: 'left' | 'right';
  onClose?: () => void;
  children: ReactNode;
  theme: NativeTheme;
}

export function Drawer(props: DrawerProps) {
  const { open, title, side = 'right', onClose, children, theme } = props;
  const styles = createStyles(theme);
  return (
    <RNModal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Arka plan"
        onPress={onClose}
        style={styles.overlay}
      >
        <Pressable
          accessibilityRole="none"
          onPress={() => undefined}
          style={[styles.panel, side === 'left' ? styles.left : styles.right]}
        >
          <View accessibilityRole="none" accessibilityLabel={title} style={styles.inner}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {onClose ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Kapat"
                  onPress={onClose}
                  style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.closeLabel}>×</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.body}>{children}</View>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
    panel: { width: '100%', maxWidth: 420, backgroundColor: theme.tokens.surfaceCard },
    left: { marginRight: 'auto' },
    right: { marginLeft: 'auto' },
    inner: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.space[5],
      paddingVertical: theme.space[4],
      borderBottomColor: theme.tokens.borderDefault,
      borderBottomWidth: 1,
    },
    title: { fontWeight: '700', fontSize: theme.fontSize.lg.size, color: theme.tokens.textPrimary },
    close: {
      padding: theme.space[2],
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.85 },
    closeLabel: { fontSize: theme.fontSize.xl.size, color: theme.tokens.textSecondary },
    body: { padding: theme.space[5] },
  });
}
