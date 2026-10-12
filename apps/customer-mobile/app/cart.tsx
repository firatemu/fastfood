import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { QtyStepper } from '../components/qty-stepper';
import { RequireCustomer } from '../components/require-customer';
import { StackHeader } from '../components/stack-header';
import { StickyCta, stickyCtaReserve } from '../components/sticky-cta';
import { EmptyBlock, ErrorBlock, LoadingBlock, SecondaryButton } from '../components/ui';
import { formatApiError } from '../lib/api';
import { clearCart, fetchCart, fetchCartQuote, updateCartLineQuantity } from '../lib/cart';
import { cartLineChips, cartLineTitle, cartLineUnitMinor } from '../lib/cart-present';
import { getStoredCouponCode, setStoredCouponCode } from '../lib/coupon-store';
import { formatTryMinor, multiplyMinor } from '../lib/money';
import { payableMinor, previewCouponDiscount } from '../lib/pricing-preview';
import { validateCoupon } from '../lib/promotions';
import type { Cart, PromotionValidate } from '../lib/schemas';
import { colors, fonts, hitSlop, minTouch, radius, space } from '../theme';

export default function CartRoute() {
  return (
    <RequireCustomer next="/cart">
      <CartScreen />
    </RequireCustomer>
  );
}

function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [quoteMinor, setQuoteMinor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [code, setCode] = useState(getStoredCouponCode());
  const [couponStatus, setCouponStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'rejected'>(
    'idle',
  );
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [promo, setPromo] = useState<PromotionValidate | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await fetchCart();
      setCart(next);
      try {
        const quote = await fetchCartQuote();
        setQuoteMinor(quote.subtotalMinor);
      } catch {
        setQuoteMinor(null);
      }
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
      setStatus('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
      const sub = AppState.addEventListener('change', (next) => {
        if (next === 'active') void reload();
      });
      return () => sub.remove();
    }, [reload]),
  );

  const lines = cart?.lineItems ?? [];
  const snapshotSubtotal = lines.reduce((acc, line) => {
    return acc + BigInt(multiplyMinor(cartLineUnitMinor(line), line.quantity));
  }, 0n).toString();
  const merchandiseMinor = quoteMinor ?? snapshotSubtotal;
  const currency = lines[0]?.currencySnapshot ?? 'TRY';
  const preview = promo
    ? previewCouponDiscount({
        merchandiseMinor,
        kind: promo.kind,
        discountMinor: promo.discountMinor,
        discountPercentBps: promo.discountPercentBps,
        minMerchandiseMinor: promo.minMerchandiseMinor,
      })
    : { discountMinor: '0', minMet: true, deliveryWaived: false };
  const payable = payableMinor(merchandiseMinor, preview.discountMinor);
  const itemCount = lines.reduce((n, line) => n + line.quantity, 0);
  const uiCouponStatus =
    couponStatus === 'valid' && promo && !preview.minMet ? 'rejected' : couponStatus;

  async function applyCoupon() {
    const nextCode = code.trim();
    if (!nextCode) return;
    setCouponStatus('validating');
    try {
      const data = await validateCoupon(nextCode);
      const next = previewCouponDiscount({
        merchandiseMinor,
        kind: data.kind,
        discountMinor: data.discountMinor,
        discountPercentBps: data.discountPercentBps,
        minMerchandiseMinor: data.minMerchandiseMinor,
      });
      setPromo(data);
      setCode(data.code);
      setStoredCouponCode(data.code);
      if (!next.minMet) {
        setCouponStatus('rejected');
        setCouponMessage(`Minimum sipariş: ${formatTryMinor(data.minMerchandiseMinor, currency)}`);
        return;
      }
      setCouponStatus('valid');
      if (next.deliveryWaived) {
        setCouponMessage(`${data.code} teslimat ücretini ödeme adımında düşürür.`);
      } else if (BigInt(next.discountMinor) > 0n) {
        setCouponMessage(
          `${data.code} koduyla ${formatTryMinor(next.discountMinor, currency)} indirim aktif.`,
        );
      } else {
        setCouponMessage(`${data.code} uygulandı.`);
      }
    } catch {
      setPromo(null);
      setStoredCouponCode(null);
      setCouponStatus('invalid');
      setCouponMessage('Kupon geçersiz, süresi dolmuş veya bulunamadı.');
    }
  }

  async function changeQty(lineId: string, quantity: number) {
    setBusyId(lineId);
    try {
      await updateCartLineQuantity(lineId, quantity);
      await reload();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <StackHeader title="Sepetim" />
      {status === 'loading' && !cart ? (
        <View style={styles.padded}>
          <LoadingBlock label="Sepet yükleniyor…" />
        </View>
      ) : status === 'error' && !cart ? (
        <View style={styles.padded}>
          <ErrorBlock
            title="Sepet alınamadı"
            message={error ?? 'Sepet yanıt vermedi.'}
            onRetry={() => {
              setStatus('loading');
              void reload();
            }}
          />
        </View>
      ) : lines.length === 0 ? (
        <View style={styles.padded}>
          <EmptyBlock title="Sepet boş" message="Menüden bir smash ekleyerek başla." />
          <View style={{ marginTop: 16 }}>
            <SecondaryButton label="Menüye dön" onPress={() => router.replace('/')} />
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scroll, { paddingBottom: stickyCtaReserve + 24 }]}
          >
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <View style={styles.rowBetween}>
              <Text style={styles.section}>Sepetim ({itemCount} ürün)</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sepeti temizle"
                hitSlop={hitSlop}
                onPress={() => {
                  setBusyId('clear');
                  void clearCart(lines)
                    .then(() => reload())
                    .catch((err: unknown) => setError(formatApiError(err)))
                    .finally(() => setBusyId(null));
                }}
              >
                <Text style={styles.clear}>Temizle</Text>
              </Pressable>
            </View>

            {lines.map((line) => {
              const unavailable = line.isAvailable === false;
              const chips = cartLineChips(line);
              const lineTotal = multiplyMinor(cartLineUnitMinor(line), line.quantity);
              return (
                <View key={line.id} style={[styles.line, unavailable && styles.lineOff]}>
                  {line.imageUrl ? (
                    <Image
                      source={{ uri: line.imageUrl }}
                      style={styles.thumb}
                      contentFit="cover"
                      accessibilityLabel={cartLineTitle(line)}
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]} />
                  )}
                  <View style={styles.lineBody}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.lineName} numberOfLines={2}>
                        {cartLineTitle(line)}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Satırı sil"
                        hitSlop={hitSlop}
                        disabled={busyId === line.id}
                        onPress={() => void changeQty(line.id, 0)}
                      >
                        <Text style={styles.remove}>Sil</Text>
                      </Pressable>
                    </View>
                    {chips.length > 0 ? (
                      <View style={styles.chips}>
                        {chips.map((chip) => (
                          <Text key={chip.label} style={[styles.chip, chip.priced && styles.chipPriced]}>
                            {chip.label}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {unavailable ? (
                      <Text style={styles.unavailable}>Bu satır şu an siparişe kapalı.</Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Özelleştirmeyi düzenle"
                      accessibilityHint="Ürünün seçeneklerini açar"
                      hitSlop={hitSlop}
                      onPress={() => router.push(`/products/${line.productId}`)}
                      style={styles.customize}
                    >
                      <MaterialCommunityIcons name="tune-variant" size={14} color={colors.mustard} />
                      <Text style={styles.customizeLabel}>ÖZELLEŞTİRMEYİ DÜZENLE</Text>
                    </Pressable>
                    <View style={styles.lineFooter}>
                      <QtyStepper
                        value={line.quantity}
                        min={0}
                        onChange={(next) => void changeQty(line.id, next)}
                      />
                      <Text style={styles.linePrice}>
                        {formatTryMinor(lineTotal, line.currencySnapshot)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.card}>
              <Text style={styles.section}>Kupon</Text>
              <View style={styles.couponRow}>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="Kupon kodu"
                  placeholderTextColor={colors.ash}
                  style={styles.couponInput}
                  accessibilityLabel="Kupon kodu"
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={couponStatus === 'validating'}
                  onPress={() => void applyCoupon()}
                  style={styles.couponBtn}
                >
                  <Text style={styles.couponBtnText}>
                    {couponStatus === 'validating' ? '…' : 'Uygula'}
                  </Text>
                </Pressable>
              </View>
              {couponMessage ? (
                <Text
                  style={
                    uiCouponStatus === 'valid'
                      ? styles.couponOk
                      : styles.couponBad
                  }
                >
                  {couponMessage}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>Sipariş özeti</Text>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Ürünler toplamı</Text>
                <Text style={styles.sumValue}>{formatTryMinor(merchandiseMinor, currency)}</Text>
              </View>
              {BigInt(preview.discountMinor) > 0n ? (
                <View style={styles.sumRow}>
                  <Text style={styles.sumDiscount}>Kupon indirimi</Text>
                  <Text style={styles.sumDiscount}>
                    −{formatTryMinor(preview.discountMinor, currency)}
                  </Text>
                </View>
              ) : null}
              {preview.deliveryWaived ? (
                <Text style={styles.hint}>Teslimat ücreti kuponu ödeme adımında uygulanır.</Text>
              ) : (
                <Text style={styles.hint}>Teslimat ücreti ödeme adımında hesaplanır.</Text>
              )}
              <View style={styles.payable}>
                <Text style={styles.kdv}>Ödenecek (ürünler)</Text>
                <Text style={styles.payableValue}>{formatTryMinor(payable, currency)}</Text>
              </View>
            </View>
          </ScrollView>
          <StickyCta
            label="Adres & ödemeye geç"
            priceLabel={formatTryMinor(payable, currency)}
            disabled={busyId !== null}
            onPress={() => router.push('/checkout')}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter, gap: space.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  section: {
    fontFamily: fonts.jakartaBold,
    fontSize: 18,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  clear: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.flame },
  err: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  line: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  lineOff: { opacity: 0.55 },
  thumb: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  thumbFallback: { backgroundColor: colors.surfaceLow },
  lineBody: { flex: 1, minWidth: 0, gap: 6 },
  lineName: { flex: 1, fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface },
  remove: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.ash },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  chipPriced: { color: colors.mustard },
  unavailable: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.error },
  /** 30dp visual + hitSlop keeps the effective target at 46dp, over the 44 minimum. */
  customize: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 30,
  },
  customizeLabel: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.mustard },
  lineFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  linePrice: { fontFamily: fonts.anton, fontSize: 22, color: colors.mustard, fontVariant: ['tabular-nums'] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    paddingHorizontal: space.md,
    fontFamily: fonts.jakarta,
  },
  couponBtn: {
    minWidth: minTouch + 24,
    minHeight: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  couponBtnText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onMustard,
    textTransform: 'uppercase',
  },
  couponOk: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.mustard },
  couponBad: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumLabel: { fontFamily: fonts.jakarta, fontSize: 15, color: colors.ash },
  sumValue: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  sumDiscount: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.flame },
  hint: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  payable: {
    marginTop: 8,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    padding: space.sm,
  },
  kdv: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.ash,
  },
  payableValue: { fontFamily: fonts.anton, fontSize: 28, color: colors.mustard, fontVariant: ['tabular-nums'] },
});
