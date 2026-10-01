import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchPaymentStatus } from '../../lib/checkout';
import { isCheckoutSessionId } from '../../lib/deep-link';
import { formatTryMinor } from '../../lib/money';
import { readPaymentSummary } from '../../lib/payment-session';
import { isPaymentTerminalStatus, postPaymentNavigation, shouldPollPayment } from '../../lib/payment-status';
import type { PaymentStatus } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function PaymentStatusRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkoutId: string }>();
  const checkoutId = Array.isArray(params.checkoutId) ? params.checkoutId[0] : params.checkoutId;
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<PaymentStatus | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const summary = readPaymentSummary();
  const valid = isCheckoutSessionId(checkoutId);
  const loopRef = useRef(0);

  useEffect(() => {
    if (!valid || !checkoutId) return;
    let mounted = true;
    let appState = AppState.currentState;
    let status = 'PENDING';
    let inFlight = false;
    loopRef.current += 1;
    const loopId = loopRef.current;

    async function tick() {
      if (inFlight) return;
      if (!shouldPollPayment({ status, appState, mounted })) return;
      inFlight = true;
      try {
        const data = await fetchPaymentStatus(checkoutId);
        if (!mounted || loopId !== loopRef.current) return;
        status = data.status;
        setAttempt(data);
        setLoad('ready');
        setError(null);
        const nav = postPaymentNavigation(data.status, data.orderId ?? null);
        if (nav.kind === 'confirmation' && nav.href) {
          router.replace(nav.href);
        }
      } catch (err) {
        if (!mounted || loopId !== loopRef.current) return;
        setError(formatApiError(err));
        setLoad((prev) => (prev === 'ready' ? 'ready' : 'error'));
      } finally {
        inFlight = false;
      }
    }

    void tick();
    const interval = setInterval(() => void tick(), 2000);
    const sub = AppState.addEventListener('change', (next) => {
      const resume = appState !== 'active' && next === 'active';
      appState = next;
      if (resume) void tick();
    });
    return () => {
      mounted = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [checkoutId, valid, router, pollTick]);

  if (!valid) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Ödeme" onBack={() => router.replace('/checkout')} />
        <View style={styles.padded}>
          <ErrorBlock title="Geçersiz ödeme bağlantısı" message="Checkout kimliği doğrulanamadı." />
        </View>
      </View>
    );
  }

  if (load === 'loading' && !attempt) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Güvenli ödeme" onBack={() => router.replace('/checkout')} />
        <LoadingBlock label="Ödeme durumu kontrol ediliyor…" />
      </View>
    );
  }

  if (load === 'error' && !attempt) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Güvenli ödeme" onBack={() => router.replace('/checkout')} />
        <View style={styles.padded}>
          <ErrorBlock
            title="Ödeme durumu alınamadı"
            message={error ?? ''}
            onRetry={() => {
              setLoad('loading');
              setPollTick((n) => n + 1);
            }}
          />
        </View>
      </View>
    );
  }

  const status = attempt?.status ?? 'PENDING';
  const failed = status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED';
  const pending = !isPaymentTerminalStatus(status);
  const amount = summary?.finalPayableMinor ?? attempt?.amountMinor ?? '0';
  const currency = summary?.currency ?? attempt?.currency ?? 'TRY';
  const redirectUrl = summary?.redirectUrl;

  return (
    <View style={styles.screen}>
      <StackHeader title="Güvenli ödeme" onBack={() => router.replace('/checkout')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <MaterialCommunityIcons
            name={failed ? 'alert-circle-outline' : pending ? 'lock-outline' : 'check-circle-outline'}
            size={32}
            color={failed ? colors.error : colors.mustard}
          />
          <Text style={styles.title}>
            {status === 'EXPIRED'
              ? 'Oturum doldu'
              : failed
                ? 'Ödeme tamamlanamadı'
                : 'iyzico 3-D Secure'}
          </Text>
          <Text style={styles.body}>
            {status === 'EXPIRED'
              ? 'Ödeme süresi doldu. Checkout’tan yeniden başla.'
              : failed
                ? 'Kart reddedildi veya işlem iptal edildi. Yeni bir ödeme başlatılmadı.'
                : 'Kart bilgisi uygulamada toplanmaz. Hosted sayfayı tarayıcıda tamamla; durum sunucudan doğrulanır.'}
          </Text>
          <Text style={styles.amount}>{formatTryMinor(amount, currency)}</Text>
          <Text style={styles.meta}>Durum: {status}</Text>
          {error ? <Text style={styles.err}>{error}</Text> : null}
          {pending && redirectUrl ? (
            <MustardButton
              label="Hosted ödemeyi aç"
              onPress={() => void Linking.openURL(redirectUrl).catch(() => undefined)}
            />
          ) : null}
          {pending ? (
            <SecondaryButton
              label="Durumu yenile"
              onPress={() => setPollTick((n) => n + 1)}
            />
          ) : null}
          {failed ? (
            <MustardButton label="Checkout’a dön" onPress={() => router.replace('/checkout')} />
          ) : null}
        </View>
        {summary?.lines.length ? (
          <View style={styles.card}>
            <Text style={styles.section}>Sipariş</Text>
            {summary.lines.map((line) => (
              <Text key={line.id} style={styles.body}>
                {line.quantity}× {line.productName ?? 'Ürün'}
              </Text>
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/checkout')}
          style={styles.ghost}
        >
          <Text style={styles.ghostLabel}>Ödemeyi kapat — sipariş oluşmadı</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter, gap: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  title: { fontFamily: fonts.jakartaBold, fontSize: 22, color: colors.onSurface, textTransform: 'uppercase' },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  amount: { fontFamily: fonts.anton, fontSize: 32, color: colors.mustard },
  meta: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  err: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  section: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.onSurface, textTransform: 'uppercase' },
  ghost: { minHeight: minTouch, alignItems: 'center', justifyContent: 'center' },
  ghostLabel: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.ash, textTransform: 'uppercase' },
});
