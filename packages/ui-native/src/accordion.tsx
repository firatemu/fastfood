import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NativeTheme } from './theme.js';

export interface AccordionItem {
  id: string;
  title: string;
  panel: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  multiple?: boolean;
  theme: NativeTheme;
}

export function Accordion(props: AccordionProps) {
  const { items, multiple = false, theme } = props;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const styles = createStyles(theme);
  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (!multiple) {
        next.clear();
        next.add(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
  return (
    <View style={styles.list}>
      {items.map((it) => {
        const expanded = open.has(it.id);
        return (
          <View key={it.id} style={styles.item}>
            <Pressable
              onPress={() => toggle(it.id)}
              disabled={it.disabled}
              accessibilityRole="button"
              accessibilityState={{ expanded, disabled: !!it.disabled }}
              style={({ pressed }) => [styles.trigger, pressed ? styles.pressed : null]}
            >
              <Text style={styles.title}>{it.title}</Text>
              <Text style={styles.chev}>{expanded ? '−' : '+'}</Text>
            </Pressable>
            {!expanded ? null : (
              <View accessibilityRole="none" style={styles.panel}>
                {it.panel}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    list: {
      borderRadius: theme.radius.md,
      borderColor: theme.tokens.borderDefault,
      borderWidth: 1,
      overflow: 'hidden',
    },
    item: { borderBottomColor: theme.tokens.borderDefault, borderBottomWidth: 1 },
    trigger: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      minHeight: 44,
      backgroundColor: theme.tokens.surfaceCard,
    },
    pressed: { opacity: 0.85 },
    title: { color: theme.tokens.textPrimary, fontWeight: '600' },
    chev: { color: theme.tokens.textSecondary, fontSize: theme.fontSize.lg.size },
    panel: { padding: theme.space[3] },
  });
}
