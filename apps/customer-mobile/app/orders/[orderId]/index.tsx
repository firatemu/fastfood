import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ApiError } from '@fastfood/api-client';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StackHeader } from '../../../components/stack-header';
import { TrackingMapEmbed } from '../../../components/tracking-map-embed';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../../components/ui';
import { formatApiError } from '../../../lib/api';
import { TRACKING_EXIT_HREF } from '../../../lib/content-map';
import { reorderHeadline, reorderOpensCart } from '../../../lib/engagement-map';
import { formatTryMinor } from '../../../lib/money';
import { isNegativeTrackerKind } from '../../../lib/order-status';
import { fetchOrderTracking, reorderOrder } from '../../../lib/orders';
import type { OrderTracking, ReorderResult } from '../../../lib/schemas';
import { formatStorefrontDateTime, trackingMapView } from '../../../lib/tracking-map';
import { decideTrackingPoll } from '../../../lib/tracking-poll';
import { colors, fonts, minTouch, radius, space } from '../../../theme';

function stageIcon(key: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (key === 'received') return 'check-circle';
  if (key === 'grilling') return 'fire';
  if (key === 'courier' || key === 'ready') return 'motorbike';
  return 'home';
}

export default function OrderTrackingRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reorder, setReorder] = useState<ReorderResult | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  const exitTracking = useCallback(() => {
    router.replace(TRACKING_EXIT_HREF);
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitTracking();
      return true;
    });
    return () => sub.remove();
  }, [exitTracking]);

  const load = useCallback(() => {
    if (!orderId) return;
    void (async () => {
      try {
        const view = await fetchOrderTracking(orderId);
        setOrder(view);
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.status === 401 ||
            err.status === 404 ||
            err.envelope.error.code === 'NOT_FOUND' ||
            err.envelope.error.code === 'AUTH_UNAUTHENTICATED')
        ) {
          setStatus('missing');
          return;
        }
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (appActive && order?.trackingActive) load();
  }, [appActive, load, order?.trackingActive]);

  useEffect(() => {
    const decision = decideTrackingPoll({
      trackingActive: order?.trackingActive ?? false,
      pollIntervalMs: order?.pollIntervalMs,
      appActive,
    });
    if (decision !== 'poll' || !order?.pollIntervalMs) return;
    const id = setInterval(() => {
      load();
    }, order.pollIntervalMs);
    return () => clearInterval(id);
  }, [appActive, load, order?.pollIntervalMs, order?.trackingActive]);

  async function onReorder() {
    if (!orderId || reorderBusy) return;
    setReorderBusy(true);
    try {
      const result = await reorderOrder(orderId);
      setReorder(result);
      if (result.status === 'success') {
        router.push('/cart');
      }
    } catch (err) {
      setReorder({
        status: 'unavailable',
        cartId: null,
        restoredCount: 0,
        reviewCount: 0,
        unavailableCount: 0,
        items: [
          {
            productId: '',
            productName: '',
            quantity: 0,
            outcome: 'product_unavailable',
            historicalUnitPriceMinor: '0',
            currentUnitPriceMinor: null,
            message: formatApiError(err),
          },
        ],
      });
    } finally {
      setReorderBusy(false);
    }
  }

  if (status === 'loading' && !order) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Takip" onBack={exitTracking} />
        <LoadingBlock label="Sipariş yükleniyor…" />
      </View>
    );
  }

  if (status === 'missing') {
    return (
      <View style={styles.screen}>
        <StackHeader title="Takip" onBack={exitTracking} />
        <View style={styles.padded}>
          <ErrorBlock title="Sipariş bulunamadı" message="Bu sipariş yok veya erişim yok." />
          <SecondaryButton label="Siparişlerime dön" onPress={exitTracking} />
        </View>
      </View>
    );
  }

  if (status === 'error' || !order) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Takip" onBack={exitTracking} />
        <View style={styles.padded}>
          <ErrorBlock title="Takip yüklenemedi" message={error ?? ''} onRetry={load} />
        </View>
      </View>
    );
  }

  const negative = isNegativeTrackerKind(order.trackerKind);
  const pickup = order.fulfillmentMode === 'PICKUP';
  const map = pickup
    ? { state: 'no-location' as const, url: null }
    : trackingMapView({
        courier: order.location,
        destination: order.destination,
      });
  const locationState = !order.courier
    ? 'courier-pending'
    : !order.location
      ? 'no-location'
      : order.location.freshness;
  const liveLabel = negative ? order.statusLabel : order.trackingActive ? 'Canlı Takip' : order.statusLabel;

  return (
    <View style={styles.screen}>
      <StackHeader title="Takip" onBack={exitTracking} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.liveChip}>
              <View style={[styles.dot, order.trackingActive && !negative ? styles.dotLive : styles.dotOff]} />
              <Text style={styles.liveLabel}>{liveLabel}</Text>
            </View>
            {order.eta.remainingMinutes != null ? (
              <View accessibilityLabel={pickup ? 'Tahmini hazır' : 'Tahmini varış'}>
                <Text style={styles.etaMeta}>{pickup ? 'Tahmini hazır' : 'Tahmini varış'}</Text>
                <Text style={styles.etaValue}>
                  {order.eta.remainingMinutes === 0 ? 'Tamamlandı' : `${order.eta.remainingMinutes} dk`}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.number}>{order.displayNumber}</Text>
          {order.branch ? <Text style={styles.meta}>{order.branch.name}</Text> : null}

          {negative ? (
            <View style={styles.negativeBox} accessibilityLabel={order.statusLabel}>
              <Text style={styles.negativeTitle}>{order.statusLabel}</Text>
              <Text style={styles.body}>
                {order.timeline.find((event) => event.customerReason)?.customerReason ??
                  'Sipariş tamamlanamadı. Destek için hesap sayfasındaki iletişim kanallarını kullanın.'}
              </Text>
              <Text style={styles.meta}>{formatStorefrontDateTime(order.createdAt)}</Text>
            </View>
          ) : (
            <View style={styles.stepper} accessibilityLabel="Sipariş aşamaları">
              {order.stages.map((stage) => {
                const active = stage.state === 'active';
                const done = stage.state === 'done';
                return (
                  <View key={stage.key} style={styles.step} accessibilityLabel={`${stage.label} ${stage.state}`}>
                    <View style={[styles.stepIcon, active && styles.stepActive, done && styles.stepDone]}>
                      <MaterialCommunityIcons
                        name={stageIcon(stage.key)}
                        size={16}
                        color={active || done ? colors.onMustard : colors.ash}
                      />
                    </View>
                    <Text style={[styles.stepLabel, active && styles.stepLabelOn]}>{stage.label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {pickup ? (
            <View style={styles.subcard}>
              <Text style={styles.kicker}>Gel al</Text>
              <Text style={styles.strong}>{order.branch?.name ?? 'Şube'}</Text>
              {order.branch?.addressLine ? <Text style={styles.body}>{order.branch.addressLine}</Text> : null}
              {order.scheduledFor ? (
                <Text style={styles.body}>Planlanan: {formatStorefrontDateTime(order.scheduledFor)}</Text>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.subcard}>
                <Text style={styles.kicker}>Görevli kurye</Text>
                {order.courier ? (
                  <>
                    <Text style={styles.strong}>{order.courier.displayName}</Text>
                    <Text style={styles.body}>
                      {locationState === 'stale'
                        ? 'Konum gecikmeli — son kayıt gösteriliyor'
                        : locationState === 'current'
                          ? 'Canlı konum'
                          : 'Konum henüz yok'}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.body}>Kurye henüz atanmadı.</Text>
                )}
                <View style={styles.ctaRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Destek mesajı"
                    onPress={() => router.push({ pathname: '/account/support', params: { orderId: order.id } })}
                    style={styles.ghost}
                  >
                    <Text style={styles.ghostLabel}>Mesaj</Text>
                  </Pressable>
                  <View style={styles.ghostDisabled} accessibilityLabel="Maskeli arama yok">
                    <Text style={styles.ghostMuted}>Ara yok</Text>
                  </View>
                </View>
              </View>
              <TrackingMapEmbed
                url={map.url}
                state={map.state}
                courierAssigned={Boolean(order.courier)}
                locationFreshness={order.location?.freshness ?? null}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Sipariş</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.line}>
              <Text style={styles.body}>
                {item.quantity}× {item.productName}
              </Text>
              <Text style={styles.meta}>{formatTryMinor(item.lineGrossMinor, order.currency)}</Text>
            </View>
          ))}
          <Text style={styles.total}>Toplam {formatTryMinor(order.finalPayableMinor, order.currency)}</Text>
          <MustardButton
            label={reorderBusy ? 'Kontrol ediliyor…' : 'Tekrar sipariş'}
            loading={reorderBusy}
            onPress={() => void onReorder()}
          />
          <SecondaryButton label="Geçmiş" onPress={exitTracking} />
          {pickup ? (
            <SecondaryButton
              label="Destek"
              onPress={() => router.push({ pathname: '/account/support', params: { orderId: order.id } })}
            />
          ) : null}
          {reorder && reorder.status !== 'success' ? (
            <View style={styles.subcard}>
              <Text style={styles.strong}>{reorderHeadline(reorder.status)}</Text>
              {reorder.items.map((item, index) => (
                <Text key={`${item.productId}-${index}`} style={styles.body}>
                  {item.productName || 'Kalem'}: {item.message}
                </Text>
              ))}
              {reorderOpensCart(reorder) ? (
                <SecondaryButton label="Sepete git" onPress={() => router.push('/cart')} />
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter, gap: 12 },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLive: { backgroundColor: colors.mustard },
  dotOff: { backgroundColor: colors.outline },
  liveLabel: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.mustard, textTransform: 'uppercase' },
  etaMeta: { fontFamily: fonts.jakartaBold, fontSize: 10, color: colors.ash, textTransform: 'uppercase' },
  etaValue: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.mustard },
  number: { fontFamily: fonts.anton, fontSize: 28, color: colors.onSurface, textTransform: 'uppercase' },
  meta: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  strong: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  negativeBox: { backgroundColor: colors.errorContainer, borderRadius: radius.md, padding: space.md, gap: 6 },
  negativeTitle: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onErrorContainer, textTransform: 'uppercase' },
  stepper: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: { backgroundColor: colors.mustard },
  stepDone: { backgroundColor: colors.mustardPressed },
  stepLabel: { fontFamily: fonts.jakartaBold, fontSize: 10, color: colors.ash, textAlign: 'center', textTransform: 'uppercase' },
  stepLabelOn: { color: colors.mustard },
  subcard: { backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: space.md, gap: 6 },
  kicker: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.ash, textTransform: 'uppercase' },
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ghost: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostDisabled: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  ghostLabel: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.white, textTransform: 'uppercase' },
  ghostMuted: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.ash, textTransform: 'uppercase' },
  section: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface, textTransform: 'uppercase' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  total: { fontFamily: fonts.anton, fontSize: 24, color: colors.mustard },
});
