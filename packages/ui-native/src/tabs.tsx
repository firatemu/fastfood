import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface TabsItem {
  id: string;
  label: string;
  panel: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabsItem[];
  defaultId?: string;
  ariaLabel: string;
  theme: NativeTheme;
}

export function Tabs(props: TabsProps) {
  const { items, defaultId, ariaLabel, theme } = props;
  const initial = defaultId ?? items[0]?.id ?? '';
  const [active, setActive] = useState(initial);
  const styles = createStyles(theme);
  return (
    <View accessibilityRole="tablist" accessibilityLabel={ariaLabel}>
      <View style={styles.list}>
        {items.map((it) => (
          <Pressable
            key={it.id}
            onPress={() => !it.disabled && setActive(it.id)}
            disabled={it.disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: it.id === active, disabled: !!it.disabled }}
            accessibilityLabel={it.label}
            style={({ pressed }) => [
              styles.tab,
              it.id === active ? styles.tabActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.tabLabel, it.id === active ? styles.tabLabelActive : null]}>
              {it.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {items.map((it) => (
        <View
          key={it.id}
          accessibilityRole="none"
          accessibilityElementsHidden={it.id !== active}
          style={[styles.panel, it.id !== active ? styles.panelHidden : null]}
        >
          {it.panel}
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    list: {
      flexDirection: 'row',
      borderBottomColor: theme.tokens.borderDefault,
      borderBottomWidth: 1,
    },
    tab: {
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      minHeight: 44,
      justifyContent: 'center',
    },
    tabActive: { borderBottomColor: theme.tokens.actionPrimaryBackground, borderBottomWidth: 2 },
    pressed: { opacity: 0.85 },
    tabLabel: { color: theme.tokens.textSecondary, fontWeight: '600' },
    tabLabelActive: { color: theme.tokens.textPrimary },
    panel: { paddingVertical: theme.space[3] },
    panelHidden: { display: 'none' },
  });
}
