import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyBlock, ErrorBlock, LoadingBlock, MustardButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { formatTryMinor } from '../../lib/money';
import { isNegativeTrackerKind } from '../../lib/order-status';
import { fetchMyOrders } from '../../lib/orders';
import type { CustomerOrder } from '../../lib/schemas';
import { formatStorefrontDateTime } from '../../lib/tracking-map';
import { useAuthBootstrap, useCustomerSession } from '../../lib/use-session';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function OrdersTabRoute() {
  const insets = useSafeAreaInsets();
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
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.headline}>Siparişler</Text>
        <Text style={styles.body}>Geçmiş siparişler için giriş gerekir. Misafir sepeti ve ödeme açık kalır.</Text>
        <MustardButton
          label="Giriş yap / kayıt ol"
          onPress={() => router.push({ pathname: '/auth', params: { next: '/(tabs)/orders' } })}
        />
      </ScrollView>
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
        <ErrorBlock title="Siparişler yüklenemedi" message={error ?? 'Tekrar dene.'} onRetry={load} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
      <Text style={styles.headline}>Siparişler</Text>
      {orders.length === 0 ? (
        <EmptyBlock title="Henüz sipariş yok" message="Menüden ilk BURGER HOME siparişini ver." />
      ) : (
        orders.map((order) => {
          const negative = isNegativeTrackerKind(order.trackerKind);
          const pickup = order.fulfillmentMode === 'PICKUP';
          return (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              accessibilityLabel={`${order.displayNumber ?? order.id} ${order.statusLabel ?? order.status}`}
              onPress={() => router.push(`/orders/${order.id}`)}
              style={styles.card}
            >
              <View style={styles.row}>
                <Text style={styles.number}>{order.displayNumber ?? order.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={[styles.status, negative && styles.negative]}>{order.statusLabel ?? order.status}</Text>
              </View>
              <Text style={styles.meta}>
                {pickup ? 'Gel al' : 'Teslimat'}
                {order.branch?.name ? ` · ${order.branch.name}` : ''}
              </Text>
              {order.itemSummary ? <Text style={styles.summary}>{order.itemSummary}</Text> : null}
              <View style={styles.row}>
                <Text style={styles.when}>
                  {order.createdAt ? formatStorefrontDateTime(order.createdAt) : ''}
                </Text>
                {order.finalPayableMinor ? (
                  <Text style={styles.total}>{formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')}</Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.outline} />
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' },
  scroll: { paddingHorizontal: space.gutter, gap: 12 },
  headline: { fontFamily: fonts.anton, fontSize: 32, color: colors.onSurface, textTransform: 'uppercase' },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 6,
    minHeight: minTouch,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  number: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  status: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.mustard, textTransform: 'uppercase' },
  negative: { color: colors.error },
  meta: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  summary: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.onSurface },
  when: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  total: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.mustard },
  actions: { alignItems: 'flex-end' },
});
