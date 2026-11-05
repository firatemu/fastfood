import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import type { ComponentProps, ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '../lib/haptics';
import { colors, fonts, minTouch, radius } from '../theme';

const ITEMS: {
  name: string;
  label: string;
  iconActive: ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconInactive: ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { name: 'index', label: 'Menü', iconActive: 'silverware-fork-knife', iconInactive: 'silverware-fork-knife' },
  { name: 'search', label: 'Arama', iconActive: 'magnify', iconInactive: 'magnify' },
  { name: 'orders', label: 'Siparişler', iconActive: 'receipt-text', iconInactive: 'receipt-text-outline' },
  { name: 'account', label: 'Profil', iconActive: 'account', iconInactive: 'account-outline' },
];

const FALLBACK_TAB = ITEMS[0];

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function BurgerTabBar({ state, navigation }: TabBarProps): ReactElement {
  const insets = useSafeAreaInsets();
  if (!FALLBACK_TAB) {
    return <View />;
  }
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const meta = ITEMS.find((item) => item.name === route.name) ?? FALLBACK_TAB;
        const focused = state.index === index;
        const onPress = () => {
          haptic.light();
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
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MaterialCommunityIcons
                name={focused ? meta.iconActive : meta.iconInactive}
                size={22}
                color={focused ? colors.mustard : colors.onSurfaceVariant}
              />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
            {focused ? <View style={styles.activeDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 74,
    paddingTop: 8,
    backgroundColor: 'rgba(15, 16, 20, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  item: {
    flex: 1,
    minHeight: minTouch + 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
  },
  itemPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.mustardBloom,
  },
  label: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.mustard,
    fontFamily: fonts.jakartaBold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.mustard,
    marginTop: 1,
  },
});
