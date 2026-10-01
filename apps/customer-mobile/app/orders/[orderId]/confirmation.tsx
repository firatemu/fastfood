import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ApiError } from '@fastfood/api-client';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StackHeader } from '../../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../../components/ui';
import { formatApiError } from '../../../lib/api';
import { fetchOrderConfirmation } from '../../../lib/checkout';
import { formatTryMinor } from '../../../lib/money';
import { presentOrderItems } from '../../../lib/quote-present';
import type { OrderConfirmation } from '../../../lib/schemas';
import { colors, fonts, radius, space } from '../../../theme';

export default function OrderConfirmationRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderConfirmation | null>(null);

  const load = useCallback(() => {
    if (!orderId) return;
    setStatus('loading');
    void (async () => {
      try {
        const data = await fetchOrderConfirmation(orderId);
        setOrder(data);
        setStatus('ready');
        setError(null);
      } catch (err) {
        const message = formatApiError(err);
        setError(
          err instanceof ApiError && err.envelope.error.code === 'INTERNAL_ERROR'
            ? 'Onay bilgisi yüklenemedi.'
            : message,
        );
        setStatus('error');
      }
    })();
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (status === 'loading' && !order) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Onay" onBack={() => router.replace('/')} />
        <LoadingBlock label="Sipariş onaylanıyor…" />
      </View>
    );
  }

  if (status === 'error' || !order) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Onay" onBack={() => router.replace('/')} />
        <View style={styles.padded}>
          <ErrorBlock title="Sipariş bulunamadı" message={error ?? ''} onRetry={load} />
        </View>
      </View>
    );
  }

  const pickup = order.fulfillmentMode === 'PICKUP';
  const shortId = order.id.slice(0, 8).toUpperCase();
  const items = presentOrderItems(order.items);

  return (
    <View style={styles.screen}>
      <StackHeader title="Sipariş alındı" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="check-circle" size={36} color={colors.mustard} />
          <Text style={styles.kicker}>Afiyet olsun</Text>
          <Text style={styles.body}>
            Sipariş no <Text style={styles.strong}>{shortId}</Text>
          </Text>
          <View style={styles.grid}>
            <View style={styles.cell}>
              <Text style={styles.meta}>Teslimat</Text>
              <Text style={styles.strong}>{pickup ? 'Gel-al' : 'Adrese teslimat'}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.meta}>Şube</Text>
              <Text style={styles.strong}>{order.branch?.name ?? '—'}</Text>
            </View>
          </View>
          {order.branch?.addressLine ? (
            <Text style={styles.body}>{order.branch.addressLine}</Text>
          ) : null}
          {order.scheduledFor ? (
            <Text style={styles.body}>
              Planlanan saat: {new Date(order.scheduledFor).toLocaleString('tr-TR')}
            </Text>
          ) : order.branch?.etaMinutesMin !== undefined ? (
            <Text style={styles.eta}>
              Tahmini {order.branch.etaMinutesMin}–{order.branch.etaMinutesMax} dk
            </Text>
          ) : null}
          {items.map((item) => (
            <Text key={`${item.title}-${item.quantity}`} style={styles.body}>
              {item.quantity}× {item.title}
            </Text>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.total}>{formatTryMinor(order.finalPayableMinor, order.currency)}</Text>
          </View>
          <MustardButton
            label="Siparişi takip et"
            onPress={() => router.replace(`/orders/${order.id}`)}
          />
          <SecondaryButton label="Menüye dön" onPress={() => router.replace('/')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  kicker: { fontFamily: fonts.anton, fontSize: 32, color: colors.onSurface, textTransform: 'uppercase' },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  strong: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  meta: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.ash, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: space.sm, gap: 4 },
  eta: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.mustard },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: space.sm,
  },
  totalLabel: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface, textTransform: 'uppercase' },
  total: { fontFamily: fonts.anton, fontSize: 28, color: colors.mustard },
});
