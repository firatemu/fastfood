import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StackHeader } from '../components/stack-header';
import { StickyCta, stickyCtaReserve } from '../components/sticky-cta';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/ui';
import { formatApiError } from '../lib/api';
import { fetchCart } from '../lib/cart';
import { cartLineTitle } from '../lib/cart-present';
import {
  checkDeliveryServiceability,
  fetchCheckoutQuote,
  fetchCheckoutSlots,
  fetchLoyaltyBalance,
  fetchPaymentMethods,
  fetchStorefrontBranches,
  initializeCheckoutPayment,
} from '../lib/checkout';
import {
  buildCheckoutQuotePayload,
  operationalPayMethod,
  paymentInitIdempotencyKey,
  tipMinorFromPreset,
  type FulfillmentMode,
  type ScheduleMode,
  type TipPreset,
} from '../lib/checkout-map';
import { getStoredCouponCode } from '../lib/coupon-store';
import { DEFAULT_DELIVERY_LOCATION, getDeliveryLocation } from '../lib/delivery-location';
import { formatTryMinor } from '../lib/money';
import { snapshotFromQuote, writePaymentSummary } from '../lib/payment-session';
import { quotePresentationRows } from '../lib/quote-present';
import type { Branch, Cart, CheckoutQuote, PaymentMethod } from '../lib/schemas';
import { getCustomerSession } from '../lib/session';
import { colors, fonts, minTouch, radius, space } from '../theme';

const TIP_CHIPS: TipPreset[] = ['none', '15', '25', '50', 'custom'];

export default function CheckoutRoute() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FulfillmentMode>('DELIVERY');
  const [location, setLocation] = useState(getDeliveryLocation);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pickupBranchId, setPickupBranchId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('asap');
  const [slots, setSlots] = useState<Array<{ startAt: string; label: string }>>([]);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [eco, setEco] = useState(true);
  const [contactless, setContactless] = useState(false);
  const [tipPreset, setTipPreset] = useState<TipPreset>('none');
  const [customTip, setCustomTip] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payMethod, setPayMethod] = useState('iyzico_hosted');
  const [paying, setPaying] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState<string | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const payingRef = useRef(false);
  const authenticated = Boolean(getCustomerSession());
  const tipMinor = tipMinorFromPreset(tipPreset, customTip);
  const couponCode = getStoredCouponCode();

  const reload = useCallback(async () => {
    try {
      const [nextCart, nextBranches, nextMethods] = await Promise.all([
        fetchCart(),
        fetchStorefrontBranches().catch(() => [] as Branch[]),
        fetchPaymentMethods().catch(() => [] as PaymentMethod[]),
      ]);
      setCart(nextCart);
      setBranches(nextBranches);
      setPickupBranchId((prev) => prev ?? nextBranches.find((item) => item.isAcceptingOrders)?.id ?? null);
      setMethods(nextMethods);
      setPayMethod(operationalPayMethod(nextMethods));
      const loc = getDeliveryLocation();
      try {
        const checked = await checkDeliveryServiceability(loc.latitude, loc.longitude, loc.label);
        setLocation(checked);
      } catch {
        setLocation(loc.latitude ? loc : DEFAULT_DELIVERY_LOCATION);
      }
      if (authenticated) {
        const points = await fetchLoyaltyBalance().catch(() => null);
        setLoyaltyPoints(points);
      } else {
        setLoyaltyPoints(null);
        setUseLoyalty(false);
      }
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
      setStatus('error');
    }
  }, [authenticated]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const quoteKey = useMemo(
    () =>
      JSON.stringify({
        mode,
        pickupBranchId,
        lat: location.latitude,
        lng: location.longitude,
        tipMinor,
        eco,
        contactless,
        deliveryNote,
        accessCode,
        scheduledFor: scheduleMode === 'scheduled' ? scheduledFor : null,
        couponCode,
        useLoyalty,
        loyaltyPoints,
        guestName,
        guestPhone,
      }),
    [
      mode,
      pickupBranchId,
      location.latitude,
      location.longitude,
      tipMinor,
      eco,
      contactless,
      deliveryNote,
      accessCode,
      scheduleMode,
      scheduledFor,
      couponCode,
      useLoyalty,
      loyaltyPoints,
      guestName,
      guestPhone,
    ],
  );

  useEffect(() => {
    if (status !== 'ready' || !cart?.lineItems.length) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setQuoteLoading(true);
        try {
          const next = await fetchCheckoutQuote(
            buildCheckoutQuotePayload({
              fulfillmentMode: mode,
              latitude: location.latitude,
              longitude: location.longitude,
              pickupBranchId,
              couponCode,
              tipMinor,
              scheduledFor,
              scheduleMode,
              ecoPackaging: eco,
              contactless,
              deliveryNote,
              buildingAccessCode: accessCode,
              guestName: authenticated ? '' : guestName,
              guestPhone: authenticated ? '' : guestPhone,
              checkoutSessionId: sessionIdRef.current,
              addressLabel: location.label,
              loyaltyRequestedMinor: useLoyalty ? loyaltyPoints : null,
            }),
          );
          if (cancelled) return;
          sessionIdRef.current = next.checkoutSessionId;
          setQuote(next);
          setQuoteError(null);
        } catch (err) {
          if (cancelled) return;
          setQuote(null);
          setQuoteError(formatApiError(err));
        } finally {
          if (!cancelled) setQuoteLoading(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    quoteKey,
    status,
    cart?.lineItems.length,
    accessCode,
    authenticated,
    contactless,
    couponCode,
    deliveryNote,
    eco,
    guestName,
    guestPhone,
    location.label,
    location.latitude,
    location.longitude,
    loyaltyPoints,
    mode,
    pickupBranchId,
    scheduleMode,
    scheduledFor,
    tipMinor,
    useLoyalty,
  ]);

  useEffect(() => {
    const branchId = quote?.branchId ?? pickupBranchId;
    if (!branchId) return;
    void fetchCheckoutSlots(branchId)
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]));
  }, [quote?.branchId, pickupBranchId]);

  const lines = cart?.lineItems ?? [];
  const currency = quote?.currency ?? lines[0]?.currencySnapshot ?? 'TRY';
  const etaLabel =
    quote?.etaMinutesMin !== undefined
      ? `${quote.etaMinutesMin}–${quote.etaMinutesMax} dk`
      : 'Hazırlık süresi hesaplanıyor';
  const presented = quote ? quotePresentationRows(quote) : null;
  const payDisabled =
    paying ||
    quoteLoading ||
    !quote?.checkoutSessionId ||
    Boolean(presented?.payBlocked) ||
    Boolean(quoteError) ||
    (mode === 'DELIVERY' && !location.serviceable) ||
    (scheduleMode === 'scheduled' && !scheduledFor) ||
    payMethod !== 'iyzico_hosted';

  async function pay() {
    if (payDisabled || !quote?.checkoutSessionId || payingRef.current) return;
    payingRef.current = true;
    setPaying(true);
    setError(null);
    try {
      const fresh = await fetchCheckoutQuote(
        buildCheckoutQuotePayload({
          fulfillmentMode: mode,
          latitude: location.latitude,
          longitude: location.longitude,
          pickupBranchId,
          couponCode,
          tipMinor,
          scheduledFor,
          scheduleMode,
          ecoPackaging: eco,
          contactless,
          deliveryNote,
          buildingAccessCode: accessCode,
          guestName: authenticated ? '' : guestName,
          guestPhone: authenticated ? '' : guestPhone,
          checkoutSessionId: quote.checkoutSessionId,
          addressLabel: location.label,
          loyaltyRequestedMinor: useLoyalty ? loyaltyPoints : null,
        }),
      );
      sessionIdRef.current = fresh.checkoutSessionId;
      setQuote(fresh);
      if (!fresh.checkoutSessionId || !fresh.minimumOrderEligible) {
        throw new Error('Ödeme için geçerli bir teklif yok.');
      }
      const init = await initializeCheckoutPayment({
        checkoutSessionId: fresh.checkoutSessionId,
        amountMinor: fresh.finalPayableMinor,
        currency: fresh.currency,
        idempotencyKey: paymentInitIdempotencyKey(fresh.checkoutSessionId),
      });
      writePaymentSummary({
        ...snapshotFromQuote(fresh, lines),
        providerPaymentId: init.providerPaymentId,
        redirectUrl: init.redirectUrl,
      });
      router.push(`/payment/${fresh.checkoutSessionId}`);
      payingRef.current = false;
      setPaying(false);
    } catch (err) {
      setError(formatApiError(err));
      payingRef.current = false;
      setPaying(false);
    }
  }

  if (status === 'loading' && !cart) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Ödeme" />
        <LoadingBlock label="Checkout yükleniyor…" />
      </View>
    );
  }
  if (status === 'error' && !cart) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Ödeme" />
        <View style={styles.padded}>
          <ErrorBlock title="Checkout alınamadı" message={error ?? ''} onRetry={() => void reload()} />
        </View>
      </View>
    );
  }
  if (lines.length === 0) {
    return (
      <View style={styles.screen}>
        <StackHeader title="Ödeme" />
        <View style={styles.padded}>
          <EmptyBlock title="Sepet boş" message="Ödeme için önce menüden ürün ekle." />
        </View>
      </View>
    );
  }

  const pickupBranches = branches.filter((item) => item.isAcceptingOrders);
  const methodList =
    methods.length > 0
      ? methods
      : [{ code: 'iyzico_hosted', label: 'iyzico 3-D Secure', available: true, disabledReason: null }];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackHeader title="Sipariş & ödeme" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: stickyCtaReserve + 24 }]}
      >
        <View style={styles.steps}>
          <Text style={styles.stepOn}>1 Sepet</Text>
          <Text style={styles.stepOn}>2 Ödeme</Text>
          <Text style={styles.stepOff}>3 Onay</Text>
        </View>

        <View style={styles.toggle}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('DELIVERY')}
            style={[styles.toggleBtn, mode === 'DELIVERY' && styles.toggleOn]}
          >
            <MaterialCommunityIcons
              name="moped"
              size={18}
              color={mode === 'DELIVERY' ? colors.onMustard : colors.onSurfaceVariant}
            />
            <Text style={[styles.toggleText, mode === 'DELIVERY' && styles.toggleTextOn]}>
              Adrese teslimat
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('PICKUP')}
            style={[styles.toggleBtn, mode === 'PICKUP' && styles.toggleOn]}
          >
            <MaterialCommunityIcons
              name="storefront-outline"
              size={18}
              color={mode === 'PICKUP' ? colors.onMustard : colors.onSurfaceVariant}
            />
            <View>
              <Text style={[styles.toggleText, mode === 'PICKUP' && styles.toggleTextOn]}>Gel-al</Text>
              <Text style={styles.pickupHint}>Şube indirimi sunucu hesaplar</Text>
            </View>
          </Pressable>
        </View>

        {mode === 'DELIVERY' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Teslimat adresi</Text>
            <Text style={styles.strong}>{location.label}</Text>
            <Text style={styles.muted}>
              {location.serviceable
                ? 'Bu konum servis alanında.'
                : 'Bu konum şu an servis dışında — ödeme kapalı.'}
            </Text>
            {!authenticated ? (
              <View style={styles.gap}>
                <TextInput
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Ad soyad"
                  placeholderTextColor={colors.ash}
                  style={styles.input}
                  accessibilityLabel="Ad soyad"
                />
                <TextInput
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  placeholder="Telefon"
                  placeholderTextColor={colors.ash}
                  keyboardType="phone-pad"
                  style={styles.input}
                  accessibilityLabel="Telefon"
                />
              </View>
            ) : null}
            <TextInput
              value={deliveryNote}
              onChangeText={setDeliveryNote}
              placeholder="Kuryeye teslimat notu"
              placeholderTextColor={colors.ash}
              style={styles.input}
              accessibilityLabel="Teslimat notu"
            />
            <TextInput
              value={accessCode}
              onChangeText={setAccessCode}
              placeholder="Bina / kapı kodu"
              placeholderTextColor={colors.ash}
              style={styles.input}
              accessibilityLabel="Kapı kodu"
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gel-al şubesi</Text>
            {pickupBranches.map((branch) => {
              const on = pickupBranchId === branch.id;
              return (
                <Pressable
                  key={branch.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setPickupBranchId(branch.id)}
                  style={[styles.row, on && styles.rowOn]}
                >
                  <View style={[styles.radio, on && styles.radioOn]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strong}>{branch.name}</Text>
                    <Text style={styles.muted}>{branch.addressLine}</Text>
                  </View>
                </Pressable>
              );
            })}
            {pickupBranches.length === 0 ? (
              <Text style={styles.muted}>Sipariş kabul eden şube yok.</Text>
            ) : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{mode === 'PICKUP' ? 'Hazırlama zamanı' : 'Teslimat zamanı'}</Text>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: scheduleMode === 'asap' }}
            onPress={() => setScheduleMode('asap')}
            style={[styles.row, scheduleMode === 'asap' && styles.rowOn]}
          >
            <View style={[styles.radio, scheduleMode === 'asap' && styles.radioOn]} />
            <View>
              <Text style={styles.strong}>Hemen teslimat</Text>
              <Text style={styles.mustard}>{etaLabel}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: scheduleMode === 'scheduled' }}
            onPress={() => setScheduleMode('scheduled')}
            style={[styles.row, scheduleMode === 'scheduled' && styles.rowOn]}
          >
            <View style={[styles.radio, scheduleMode === 'scheduled' && styles.radioOn]} />
            <Text style={styles.strong}>İleri bir saate planla</Text>
          </Pressable>
          {scheduleMode === 'scheduled'
            ? slots.map((slot) => (
                <Pressable
                  key={slot.startAt}
                  onPress={() => setScheduledFor(slot.startAt)}
                  style={[styles.slot, scheduledFor === slot.startAt && styles.rowOn]}
                >
                  <Text style={styles.slotText}>{slot.label}</Text>
                </Pressable>
              ))
            : null}
          {scheduleMode === 'scheduled' && slots.length === 0 ? (
            <Text style={styles.muted}>Uygun slot yok — hemen teslimatı dene.</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.strong}>Doğa dostu paketleme</Text>
              <Text style={styles.muted}>Plastik çatal ve ıslak mendil istemiyorum.</Text>
            </View>
            <Switch
              value={eco}
              onValueChange={setEco}
              trackColor={{ false: colors.surfaceHighest, true: colors.mustard }}
              thumbColor={colors.white}
            />
          </View>
          {mode === 'DELIVERY' ? (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.strong}>Temassız teslimat</Text>
                <Text style={styles.muted}>Kapıya bırakılsın.</Text>
              </View>
              <Switch
                value={contactless}
                onValueChange={setContactless}
                trackColor={{ false: colors.surfaceHighest, true: colors.mustard }}
                thumbColor={colors.white}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ödeme yöntemi</Text>
          <Text style={styles.muted}>
            Kart numarası BURGER HOME’da toplanmaz. Ödeme iyzico 3-D Secure / hosted akışında tamamlanır.
          </Text>
          <View style={styles.methodGrid}>
            {methodList.map((method) => {
              const on = payMethod === method.code && method.available;
              return (
                <Pressable
                  key={method.code}
                  disabled={!method.available}
                  onPress={() => {
                    if (method.available) setPayMethod(method.code);
                  }}
                  style={[styles.method, on && styles.methodOn, !method.available && styles.disabled]}
                >
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  {!method.available ? (
                    <Text style={styles.methodOff}>{method.disabledReason ?? 'Kapalı'}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {mode === 'DELIVERY' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kuryeye bahşiş</Text>
            <View style={styles.tipGrid}>
              {TIP_CHIPS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setTipPreset(preset)}
                  style={[styles.tip, tipPreset === preset && styles.tipOn]}
                >
                  <Text style={[styles.tipText, tipPreset === preset && styles.tipTextOn]}>
                    {preset === 'none' ? 'Yok' : preset === 'custom' ? 'Özel' : `+${preset} ₺`}
                  </Text>
                </Pressable>
              ))}
            </View>
            {tipPreset === 'custom' ? (
              <TextInput
                value={customTip}
                onChangeText={setCustomTip}
                keyboardType="decimal-pad"
                placeholder="Tutar (₺)"
                placeholderTextColor={colors.ash}
                style={styles.input}
                accessibilityLabel="Özel bahşiş"
              />
            ) : null}
          </View>
        ) : null}

        {authenticated && loyaltyPoints ? (
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.strong}>Club puanı kullan</Text>
                <Text style={styles.muted}>{loyaltyPoints} puan — sunucu uygunluğunu doğrular.</Text>
              </View>
              <Switch
                value={useLoyalty}
                onValueChange={setUseLoyalty}
                trackColor={{ false: colors.surfaceHighest, true: colors.mustard }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sipariş özeti ({lines.reduce((n, l) => n + l.quantity, 0)} ürün)</Text>
          {lines.map((line) => (
            <View key={line.id} style={styles.sumRow}>
              <Text style={styles.muted} numberOfLines={1}>
                {line.quantity}× {cartLineTitle(line)}
              </Text>
            </View>
          ))}
          {presented && quote ? (
            <View style={styles.totals}>
              {presented.rows.map((row) => (
                <View key={row.key} style={styles.sumRow}>
                  <Text style={row.kind === 'subtract' ? styles.discount : styles.muted}>
                    {row.key === 'coupon' && couponCode ? `Kupon (${couponCode})` : row.label}
                  </Text>
                  <Text style={row.kind === 'subtract' ? styles.discount : styles.strong}>
                    {row.key === 'delivery' && BigInt(row.amountMinor) === 0n
                      ? 'Ücretsiz / ödeme adımı'
                      : `${row.kind === 'subtract' ? '−' : ''}${formatTryMinor(row.amountMinor, currency)}`}
                  </Text>
                </View>
              ))}
              {presented.payBlocked ? (
                <Text style={styles.err}>Minimum sipariş tutarı karşılanmadı.</Text>
              ) : null}
            </View>
          ) : quoteLoading ? (
            <Text style={styles.muted}>Sunucu teklifi hesaplanıyor…</Text>
          ) : null}
        </View>
        {quoteError ? <Text style={styles.err}>{quoteError}</Text> : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </ScrollView>
      <StickyCta
        label="Siparişi onayla"
        loadingLabel="Hazırlanıyor…"
        priceLabel={quote ? formatTryMinor(quote.finalPayableMinor, currency) : '—'}
        disabled={payDisabled}
        loading={paying}
        hint={
          !location.serviceable && mode === 'DELIVERY'
            ? 'Adres servis dışında.'
            : (quoteError ?? undefined)
        }
        onPress={payDisabled ? undefined : () => void pay()}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter, gap: space.md },
  steps: { flexDirection: 'row', gap: 12 },
  stepOn: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.mustard, textTransform: 'uppercase' },
  stepOff: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.ash, textTransform: 'uppercase' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  toggleOn: { backgroundColor: colors.mustard },
  toggleText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  toggleTextOn: { color: colors.onMustard },
  pickupHint: { fontFamily: fonts.jakartaBold, fontSize: 9, color: colors.mustard },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 13,
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  strong: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface },
  muted: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  mustard: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.mustard },
  gap: { gap: 8 },
  input: {
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    paddingHorizontal: space.md,
    fontFamily: fonts.jakarta,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
  },
  rowOn: { backgroundColor: colors.surfaceHigh },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
  },
  radioOn: { borderColor: colors.mustard, backgroundColor: colors.mustard },
  slot: { padding: space.sm, borderRadius: radius.md, backgroundColor: colors.surfaceLow },
  slotText: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.onSurface },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodGrid: { flexDirection: 'row', gap: 8 },
  method: {
    flex: 1,
    minHeight: minTouch + 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  methodOn: { backgroundColor: colors.surfaceHigh },
  methodLabel: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.onSurface, textAlign: 'center' },
  methodOff: { fontFamily: fonts.jakarta, fontSize: 10, color: colors.ash, textAlign: 'center' },
  disabled: { opacity: 0.45 },
  tipGrid: { flexDirection: 'row', gap: 8 },
  tip: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipOn: { backgroundColor: colors.flame },
  tipText: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.onSurface },
  tipTextOn: { color: colors.white },
  totals: { gap: 6, backgroundColor: colors.surfaceLow, borderRadius: radius.md, padding: space.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  discount: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.flame },
  err: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
});
