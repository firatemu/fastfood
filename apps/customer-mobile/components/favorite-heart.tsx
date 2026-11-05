import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFavorites } from '../lib/use-favorites';
import { haptic } from '../lib/haptics';
import { useCustomerSession } from '../lib/use-session';
import { colors, hitSlop, radius } from '../theme';

/**
 * Heart for a menu/search card. Product detail keeps its own control inside
 * `ProductConfigure`; this one covers the grids, which previously offered no
 * way to favorite anything without opening the product first.
 *
 * Like the product detail heart it stays visible to guests and sends them to
 * login, instead of hiding the feature until they already have a session.
 */
export function FavoriteHeart({
  productId,
  name,
}: {
  productId: string;
  name: string;
}): ReactElement | null {
  const router = useRouter();
  const session = useCustomerSession();
  const { ready, busy, isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(productId);
  const pending = busy.has(productId);

  // Nothing renders until the shared list resolves. An empty heart that flips a
  // moment later is worse than no heart at all.
  if (!ready) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? `${name} favorilerden çıkar` : `${name} favorilere ekle`}
        accessibilityState={{ selected: favorite, busy: pending }}
        disabled={pending}
        hitSlop={hitSlop}
        onPress={() => {
          haptic.medium();
          if (!session) {
            router.push({ pathname: '/auth', params: { next: `/products/${productId}` } });
            return;
          }
          toggle(productId);
        }}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons
          name={favorite ? 'heart' : 'heart-outline'}
          size={18}
          color={favorite ? colors.flame : colors.white}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 8, right: 8, zIndex: 5 },
  pressable: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 16, 20, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pressed: {
    backgroundColor: 'rgba(15, 16, 20, 0.95)',
    transform: [{ scale: 0.92 }],
  },
});
