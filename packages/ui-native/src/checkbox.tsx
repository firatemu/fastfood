import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  invalid?: boolean;
  testID?: string;
  theme: NativeTheme;
}

export function Checkbox(props: CheckboxProps) {
  const { checked, onChange, label, disabled = false, invalid = false, testID, theme } = props;
  const styles = createStyles(theme);
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && !disabled ? styles.pressed : null]}
    >
      <View
        style={[
          styles.box,
          checked ? styles.boxChecked : null,
          invalid ? styles.boxInvalid : null,
          disabled ? styles.disabled : null,
        ]}
        accessibilityElementsHidden
      >
        {checked ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2], minHeight: 44 },
    pressed: { opacity: 0.85 },
    box: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tokens.surfaceCard,
    },
    boxChecked: {
      backgroundColor: theme.tokens.actionPrimaryBackground,
      borderColor: theme.tokens.actionPrimaryBackground,
    },
    boxInvalid: { borderColor: theme.tokens.actionDangerBackground },
    disabled: { opacity: 0.6 },
    check: { color: theme.tokens.actionPrimaryText, fontSize: 14, lineHeight: 14 },
    label: { color: theme.tokens.textPrimary, fontSize: theme.fontSize.md.size },
  });
}
