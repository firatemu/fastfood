import { StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface StepperProps {
  steps: string[];
  current: number;
  theme: NativeTheme;
}

export function Stepper(props: StepperProps) {
  const { steps, current, theme } = props;
  const styles = createStyles(theme);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="İlerleme" style={styles.row}>
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <View
            key={s}
            style={[styles.item, i === current ? styles.itemActive : null]}
            accessibilityState={{ selected: i === current }}
          >
            <View
              style={[
                styles.indicator,
                state === 'active' ? styles.indicatorActive : null,
                state === 'done' ? styles.indicatorDone : null,
              ]}
            >
              <Text
                style={[styles.indicatorText, state === 'done' ? styles.indicatorTextDone : null]}
              >
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.label, i === current ? styles.labelActive : null]}>{s}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: theme.space[3], alignItems: 'center' },
    item: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
    itemActive: {},
    indicator: {
      width: 24,
      height: 24,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: theme.tokens.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tokens.surfaceCard,
    },
    indicatorActive: { borderColor: theme.tokens.actionPrimaryBackground },
    indicatorDone: {
      backgroundColor: theme.tokens.actionSaveBackground,
      borderColor: theme.tokens.actionSaveBackground,
    },
    indicatorText: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    indicatorTextDone: { color: theme.tokens.actionPrimaryText },
    label: { color: theme.tokens.textSecondary, fontSize: theme.fontSize.sm.size },
    labelActive: { color: theme.tokens.textPrimary, fontWeight: '700' },
  });
}
