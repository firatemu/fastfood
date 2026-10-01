import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  testID?: string;
  theme: NativeTheme;
}

export function Switch(props: SwitchProps) {
  const { checked, onChange, label, disabled = false, testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && !disabled ? styles.pressed : null]}
    >
      <View
        style={[styles.track, checked ? styles.trackOn : null, disabled ? styles.disabled : null]}
        accessibilityElementsHidden
      >
        <View style={[styles.thumb, checked ? styles.thumbOn : null]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2], minHeight: 44 },
    pressed: { opacity: 0.85 },
    track: {
      width: 44,
      height: 24,
      borderRadius: 9999,
      backgroundColor: theme.tokens.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
      padding: 2,
      justifyContent: 'center',
    },
    trackOn: {
      backgroundColor: theme.tokens.actionPrimaryBackground,
      borderColor: theme.tokens.actionPrimaryBackground,
    },
    disabled: { opacity: 0.6 },
    thumb: {
      width: 18,
      height: 18,
      borderRadius: 9999,
      backgroundColor: theme.tokens.surfaceCard,
    },
    thumbOn: { transform: [{ translateX: 20 }] },
    label: { color: theme.tokens.textPrimary, fontSize: theme.fontSize.md.size },
  });
}
