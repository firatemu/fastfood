import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Link, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authRouteParams } from '../lib/auth-nav';
import { useCustomerSession } from '../lib/use-session';
import { colors, fonts, hitSlop, minTouch, space } from '../theme';

import { useCartCount } from './use-cart-count';
import { useUnreadCount } from './use-unread-count';

export function AppHeader(props: {
  locationLabel: string;
  kitchenLiveCount?: number;
  onLocationPress?: () => void;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cartCount = useCartCount();
  const unreadCount = useUnreadCount();
  const session = useCustomerSession();
  const inner = (
    <View style={[styles.row, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandCol}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="hamburger" size={18} color={colors.mustard} />
          <Text style={styles.brand}>BURGER HOME</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Şubeler"
          hitSlop={hitSlop}
          onPress={props.onLocationPress ?? (() => router.push('/branches'))}
          style={styles.location}
        >
          <MaterialCommunityIcons name="map-marker" size={14} color={colors.flameDeep} />
          <Text style={styles.locationText} numberOfLines={1}>
            {props.locationLabel}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.outline} />
        </Pressable>
        {props.kitchenLiveCount && props.kitchenLiveCount > 0 ? (
          <Text style={styles.live}>Izgara · {props.kitchenLiveCount} sipariş</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Link
          href={session ? '/cart' : { pathname: '/auth', params: authRouteParams('/cart') }}
          asChild
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cartCount > 0 ? `Sepet, ${cartCount} ürün` : 'Sepet'}
            style={styles.iconBtn}
            hitSlop={hitSlop}
          >
            <MaterialCommunityIcons name="cart-outline" size={20} color={colors.onSurface} />
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : String(cartCount)}</Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
        <Link href="/account/notifications" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bildirimler"
            style={styles.iconBtn}
            hitSlop={hitSlop}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={colors.onSurface} />
            {unreadCount > 0 ? (
              <View style={styles.pip} accessibilityLabel={`${unreadCount} okunmamış bildirim`} />
            ) : null}
          </Pressable>
        </Link>
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={40} tint="dark" style={styles.wrap}>
        {inner}
      </BlurView>
    );
  }
  return <View style={[styles.wrap, styles.androidWrap]}>{inner}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: space.gutter,
    paddingBottom: space.sm,
  },
  androidWrap: { backgroundColor: 'rgba(18,19,22,0.92)' },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  brandCol: { flex: 1, minWidth: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: {
    fontFamily: fonts.anton,
    fontSize: 22,
    letterSpacing: 0.6,
    color: colors.mustard,
  },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: {
    flexShrink: 1,
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.onSurface,
  },
  live: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.flame,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actions: { flexDirection: 'row', gap: space.sm },
  iconBtn: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.flameDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 9,
    color: colors.white,
  },
  pip: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.flameDeep,
  },
});
