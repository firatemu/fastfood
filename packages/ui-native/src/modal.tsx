import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
  theme: NativeTheme;
}

export function Modal(props: ModalProps) {
  const { open, title, onClose, children, footer, testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <RNModal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Arka plan"
        onPress={onClose}
        style={styles.overlay}
      >
        <Pressable accessibilityRole="none" onPress={() => undefined} style={styles.panel}>
          <View
            testID={testID}
            accessibilityRole="none"
            accessibilityLabel={title}
            style={styles.panelInner}
          >
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
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.space[4],
    },
    panel: { width: '100%', maxWidth: 520 },
    panelInner: {
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
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
    footer: {
      paddingHorizontal: theme.space[5],
      paddingVertical: theme.space[3],
      borderTopColor: theme.tokens.borderDefault,
      borderTopWidth: 1,
      backgroundColor: theme.tokens.surfaceSubtle,
    },
  });
}
