import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Link, useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authRouteParams } from '../lib/auth-nav';
import { haptic } from '../lib/haptics';
import { useCustomerSession } from '../lib/use-session';
import { colors, fonts, hitSlop, minTouch, radius, space } from '../theme';

import { useCartCount } from './use-cart-count';
import { useUnreadCount } from './use-unread-count';

export function AppHeader(props: {
  locationLabel?: string;
  kitchenLiveCount?: number;
  onLocationPress?: () => void;
  showLocation?: boolean;
}): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cartCount = useCartCount();
  const unreadCount = useUnreadCount();
  const session = useCustomerSession();
  const inner = (
    <View style={[styles.row, { paddingTop: insets.top + 6 }]}>
      <View style={styles.brandCol}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconWrap}>
            <MaterialCommunityIcons name="hamburger" size={17} color={colors.mustard} />
          </View>
          <Text style={styles.brand}>BURGER HOME</Text>
        </View>
        {props.showLocation && props.locationLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Şubeler"
            hitSlop={hitSlop}
            onPress={() => {
              haptic.light();
              if (props.onLocationPress) props.onLocationPress();
              else router.push('/branches');
            }}
            style={({ pressed }) => [styles.location, pressed && styles.locationPressed]}
          >
            <MaterialCommunityIcons name="map-marker" size={13} color={colors.flame} />
            <Text style={styles.locationText} numberOfLines={1}>
              {props.locationLabel}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={14} color={colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
        {props.kitchenLiveCount && props.kitchenLiveCount > 0 ? (
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.live}>Izgara · {props.kitchenLiveCount} sipariş</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Link href="/search" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menüde ara"
            onPress={() => haptic.light()}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={hitSlop}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurface} />
          </Pressable>
        </Link>
        <Link
          href={session ? '/cart' : { pathname: '/auth', params: authRouteParams('/cart') }}
          asChild
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cartCount > 0 ? `Sepet, ${cartCount} ürün` : 'Sepet'}
            onPress={() => haptic.light()}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
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
            onPress={() => haptic.light()}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
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
    width: '100%',
    zIndex: 20,
    paddingHorizontal: space.gutter,
    paddingBottom: space.sm,
    backgroundColor: 'rgba(15, 16, 20, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  androidWrap: {
    backgroundColor: 'rgba(15, 16, 20, 0.98)',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  brandCol: { flex: 1, minWidth: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandIconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.anton,
    fontSize: 22,
    letterSpacing: 0.6,
    color: colors.mustard,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  locationPressed: {
    backgroundColor: colors.surfaceHigh,
  },
  locationText: {
    flexShrink: 1,
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.onSurface,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.flameDeep,
  },
  live: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.flame,
    textTransform: 'uppercase',
  },
  actions: { flexDirection: 'row', gap: space.sm },
  iconBtn: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: colors.surfaceHigh,
    transform: [{ scale: 0.94 }],
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
