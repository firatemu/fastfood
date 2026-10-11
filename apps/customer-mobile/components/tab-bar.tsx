import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import type { ComponentProps, ReactElement } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, minTouch } from '../theme';

const ITEMS: {
  name: string;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { name: 'index', label: 'Menü', icon: 'food' },
  { name: 'search', label: 'Arama', icon: 'magnify' },
  { name: 'orders', label: 'Siparişler', icon: 'shopping' },
  { name: 'account', label: 'Profil', icon: 'account' },
];

const FALLBACK_TAB = ITEMS[0];

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function BurgerTabBar({ state, navigation }: TabBarProps): ReactElement {
  const insets = useSafeAreaInsets();
  if (!FALLBACK_TAB) {
    return <View />;
  }
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const meta = ITEMS.find((item) => item.name === route.name) ?? FALLBACK_TAB;
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.item}
          >
            <MaterialCommunityIcons
              name={meta.icon}
              size={22}
              color={focused ? colors.mustard : colors.onSurfaceVariant}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    minHeight: 80,
    paddingTop: 8,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(18,19,22,0.92)' : colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  item: {
    flex: 1,
    minHeight: minTouch + 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.onSurfaceVariant,
  },
  labelActive: { color: colors.mustard },
});
