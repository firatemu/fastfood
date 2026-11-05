import { ApiError } from '@fastfood/api-client';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScrollToTopFab, useScrollToTop } from '../../components/scroll-to-top';
import { EmptyBlock, ErrorBlock, LoadingBlock, MustardButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { haptic } from '../../lib/haptics';
import { formatTryMinor } from '../../lib/money';
import { isNegativeTrackerKind } from '../../lib/order-status';
import { fetchMyOrders } from '../../lib/orders';
import type { CustomerOrder } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { useAuthBootstrap, useCustomerSession } from '../../lib/use-session';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function OrdersTabRoute() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const top = useScrollToTop();
  const router = useRouter();
  const session = useCustomerSession();
  const bootstrap = useAuthBootstrap();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) {
      setOrders([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    void fetchMyOrders()
      .then((next) => {
        setOrders(next);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.envelope?.error?.code === 'AUTH_UNAUTHENTICATED')
        ) {
          setOrders([]);
          setStatus('idle');
          return;
        }
        setError(formatApiError(err));
        setStatus('error');
      });
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (bootstrap === 'pending') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingBlock label="Oturum kontrol ediliyor…" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.screenRoot}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headline}>SİPARİŞLERİM</Text>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: space.lg, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <View style={styles.guestCard}>
            <View style={styles.guestIconCircle}>
              <MaterialCommunityIcons name="account-lock-outline" size={32} color={colors.mustard} />
            </View>
            <Text style={styles.guestTitle}>Giriş Yapın</Text>
            <Text style={styles.body}>
              Geçmiş ve aktif siparişlerinizi takip etmek için BURGER HOME hesabınıza giriş yapın.
            </Text>
            <View style={{ width: '100%', marginTop: space.sm }}>
              <MustardButton
                label="Giriş yap / Kayıt ol"
                onPress={() => router.push({ pathname: '/auth', params: { next: '/(tabs)/orders' } })}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingBlock label="Siparişler yükleniyor…" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, padding: space.margin }]}>
        <ErrorBlock
          title="Siparişler Alınamadı"
          message={error ?? 'Lütfen tekrar deneyin.'}
          onRetry={load}
        />
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.headline}>Siparişlerim</Text>
          <View style={styles.orderCountBadge}>
            <Text style={styles.orderCountText}>{orders.length} Sipariş</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={top.onScroll}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: space.md, paddingBottom: insets.bottom + 32 },
        ]}
      >
        {orders.length === 0 ? (
          <EmptyBlock
            title="Henüz Sipariş Yok"
            message="BURGER HOME'un alevde ızgara burgerlerini keşfetmek için menüye göz at."
            icon="receipt-text-outline"
            actionLabel="Menüye Göz At"
            onAction={() => router.replace('/')}
          />
        ) : (
          orders.map((order) => {
            const negative = isNegativeTrackerKind(order.trackerKind);
            const isDelivered = order.status === 'DELIVERED';
            const pickup = order.fulfillmentMode === 'PICKUP';
            return (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                accessibilityLabel={`${order.displayNumber ?? order.id} ${order.statusLabel ?? order.status}`}
                onPress={() => {
                  haptic.light();
                  router.push(`/orders/${order.id}`);
                }}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.row}>
                  <View style={styles.orderNoRow}>
                    <MaterialCommunityIcons
                      name={pickup ? 'shopping' : 'motorbike'}
                      size={18}
                      color={colors.mustard}
                    />
                    <Text style={styles.number}>
                      {order.displayNumber ?? order.id.slice(0, 8).toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isDelivered
                        ? styles.statusPillOk
                        : negative
                          ? styles.statusPillDanger
                          : styles.statusPillActive,
                    ]}
                  >
                    {!isDelivered && !negative ? <View style={styles.livePulseDot} /> : null}
                    <Text
                      style={[
                        styles.statusText,
                        isDelivered
                          ? styles.statusTextOk
                          : negative
                            ? styles.statusTextDanger
                            : styles.statusTextActive,
                      ]}
                    >
                      {order.statusLabel ?? order.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.meta}>
                  {pickup ? 'Gel-Al Şube' : 'Adrese Teslimat'}
                  {order.branch?.name ? ` · ${order.branch.name}` : ''}
                </Text>

                {order.itemSummary ? (
                  <Text style={styles.summary} numberOfLines={2}>
                    {order.itemSummary}
                  </Text>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.when}>
                    {order.createdAt ? formatStorefrontDateTime(order.createdAt) : ''}
                  </Text>
                  <View style={styles.priceRow}>
                    {order.finalPayableMinor ? (
                      <Text style={styles.total}>
                        {formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')}
                      </Text>
                    ) : null}
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <ScrollToTopFab visible={top.visible} scrollRef={scrollRef} bottom={insets.bottom + 88} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.md,
    backgroundColor: 'rgba(15, 16, 20, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  root: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' },
  scroll: { paddingHorizontal: space.gutter, gap: 12 },
  headline: {
    fontFamily: fonts.anton,
    fontSize: 28,
    color: colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderCountBadge: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  orderCountText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurface,
  },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  guestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairlineBright,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  guestTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 18,
    color: colors.onSurface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.md,
    gap: 8,
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.hairlineBright,
  },
  cardPressed: {
    backgroundColor: colors.surfaceHigh,
    transform: [{ scale: 0.98 }],
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  orderNoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  number: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusPillOk: {
    backgroundColor: colors.okContainer,
    borderColor: colors.okBorder,
  },
  statusPillDanger: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.dangerBorder,
  },
  statusPillActive: {
    backgroundColor: colors.mustardBloom,
    borderColor: colors.mustardGlow,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mustard,
  },
  statusText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusTextOk: { color: colors.ok },
  statusTextDanger: { color: colors.danger },
  statusTextActive: { color: colors.mustard },
  meta: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.onSurfaceVariant },
  summary: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.onSurface, lineHeight: 18 },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: 2,
  },
  when: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.onSurfaceVariant },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  total: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.mustard, fontVariant: ['tabular-nums'] },
});