'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

import { getCustomerId } from '../../lib/api';
import {
  getDeliveryLocation,
  subscribeDeliveryLocation,
  type DeliveryLocation,
} from '../../lib/delivery-location';
import { errorMessage } from '../../lib/load-state';
import type { branchSchema, checkoutQuoteSchema } from '../../lib/schemas';
import { listCustomerAddresses, type CustomerAddress } from '../../lib/storefront/addresses';
import { GRILL_LIVE_LABEL } from '../../lib/storefront/brand-copy';
import { fetchCart, type Cart } from '../../lib/storefront/cart';
import { readCartDeliveryNote, readUseLoyaltyIntent } from '../../lib/storefront/cart-intent';
import {
  fetchCheckoutQuote,
  fetchCheckoutSlots,
  fetchLoyaltyBalance,
  fetchPaymentMethods,
  fetchStorefrontBranches,
  initializeCheckoutPayment,
  type FulfillmentMode,
} from '../../lib/storefront/checkout';
import { writePaymentSummary } from '../../lib/storefront/payment-summary';
import { useStorefrontCoupon } from '../../lib/storefront/use-storefront-coupon';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { CheckoutSection } from './checkout-section';
import { CheckoutSummary } from './checkout-summary';
import { DeliveryAddressCard } from './delivery-address-card';
import { DeliveryBranchSelector } from './delivery-branch-selector';
import { DeliveryScheduleSelector } from './delivery-schedule-selector';
import { FulfillmentSelector } from './fulfillment-selector';
import { MaterialIcon } from './material-icon';
import { OrderPreferences } from './order-preferences';
import { PaymentMethodSelector } from './payment-method-selector';
import { PickupBranchSelector } from './pickup-branch-selector';
import { ShopEmpty, ShopError, ShopSkeleton } from './shop-states';
import { useStorefrontChrome } from './storefront-chrome';
import { TipSelector } from './tip-selector';

type Quote = z.infer<typeof checkoutQuoteSchema>;
type Branch = z.infer<typeof branchSchema>;

export function CheckoutPage() {
  const router = useRouter();
  const { refreshCart } = useStorefrontChrome();
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [location, setLocation] = useState<DeliveryLocation>(getDeliveryLocation);
  const [mode, setMode] = useState<FulfillmentMode>('DELIVERY');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pickupBranchId, setPickupBranchId] = useState<string | null>(null);
  const [deliveryBranchId, setDeliveryBranchId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'asap' | 'scheduled'>('asap');
  const [slots, setSlots] = useState<Array<{ startAt: string; label: string }>>([]);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [buildingAccessCode, setBuildingAccessCode] = useState('');
  const [eco, setEco] = useState(true);
  const [contactless, setContactless] = useState(false);
  const [tipMinor, setTipMinor] = useState('0');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [methods, setMethods] = useState<
    Array<{ code: string; label: string; available: boolean; disabledReason?: string | null }>
  >([]);
  const [payMethod, setPayMethod] = useState('iyzico_hosted');
  const [paying, setPaying] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState<string | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const sessionIdRef = useRef<string | undefined>(undefined);
  const authenticated = Boolean(getCustomerId());

  useDeferredLoad(() => {
    void (async () => {
      try {
        const [nextCart, nextBranches, nextMethods] = await Promise.all([
          fetchCart(),
          fetchStorefrontBranches().catch(() => []),
          fetchPaymentMethods().catch(() => []),
        ]);
        setCart(nextCart);
        setBranches(nextBranches);
        setPickupBranchId(nextBranches.find((item) => item.isAcceptingOrders)?.id ?? null);
        setMethods(nextMethods);
        if (authenticated) {
          const saved = await listCustomerAddresses().catch(() => []);
          setAddresses(saved);
          const def = saved.find((item) => item.isDefault) ?? saved[0];
          if (def) {
            setAddressId(def.id);
            setDeliveryNote(def.deliveryNote ?? '');
            setBuildingAccessCode(def.accessCode ?? '');
          }
          const points = await fetchLoyaltyBalance().catch(() => null);
          setLoyaltyPoints(points);
        }
        const cartNote = readCartDeliveryNote();
        if (cartNote) setDeliveryNote(cartNote);
        if (readUseLoyaltyIntent()) setUseLoyalty(true);
        setStatus('ready');
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [nonce]);

  useEffect(() => subscribeDeliveryLocation(() => setLocation(getDeliveryLocation())), []);

  const lines = cart?.lineItems ?? [];
  const merchandise = quote?.merchandiseGrossSubtotalMinor ?? '0';
  const coupon = useStorefrontCoupon(merchandise, quote?.currency ?? 'TRY');
  const quoteInputsRef = useRef({
    coupon,
    addresses,
    location,
    mode,
    pickupBranchId,
    deliveryBranchId,
    tipMinor,
    eco,
    contactless,
    buildingAccessCode,
    deliveryNote,
    scheduleMode,
    scheduledFor,
    useLoyalty,
    loyaltyPoints,
    addressId,
    guestName,
    guestPhone,
    authenticated,
  });
  useEffect(() => {
    quoteInputsRef.current = {
      coupon,
      addresses,
      location,
      mode,
      pickupBranchId,
      deliveryBranchId,
      tipMinor,
      eco,
      contactless,
      buildingAccessCode,
      deliveryNote,
      scheduleMode,
      scheduledFor,
      useLoyalty,
      loyaltyPoints,
      addressId,
      guestName,
      guestPhone,
      authenticated,
    };
  });

  const quoteKey = useMemo(
    () =>
      JSON.stringify({
        mode,
        pickupBranchId,
        deliveryBranchId,
        lat: location.latitude,
        lng: location.longitude,
        tipMinor,
        eco,
        contactless,
        deliveryNote,
        buildingAccessCode,
        scheduledFor: scheduleMode === 'scheduled' ? scheduledFor : null,
        coupon: coupon.code,
        couponStatus: coupon.status,
        useLoyalty,
        loyaltyPoints,
        addressId,
        guestName,
        guestPhone,
      }),
    [
      mode,
      pickupBranchId,
      deliveryBranchId,
      location.latitude,
      location.longitude,
      tipMinor,
      eco,
      contactless,
      deliveryNote,
      buildingAccessCode,
      scheduleMode,
      scheduledFor,
      coupon.code,
      coupon.status,
      useLoyalty,
      loyaltyPoints,
      addressId,
      guestName,
      guestPhone,
    ],
  );

  useEffect(() => {
    if (status !== 'ready' || lines.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setQuoteLoading(true);
        setQuoteError(null);
        const input = quoteInputsRef.current;
        const selected = input.addresses.find((item) => item.id === input.addressId);
        try {
          const next = await fetchCheckoutQuote({
            fulfillmentMode: input.mode,
            latitude:
              input.mode === 'DELIVERY'
                ? (selected?.latitude ?? input.location.latitude)
                : undefined,
            longitude:
              input.mode === 'DELIVERY'
                ? (selected?.longitude ?? input.location.longitude)
                : undefined,
            pickupBranchId:
              input.mode === 'PICKUP' ? (input.pickupBranchId ?? undefined) : undefined,
            deliveryBranchId:
              input.mode === 'DELIVERY' ? (input.deliveryBranchId ?? undefined) : undefined,
            couponCode: input.coupon.status === 'valid' ? input.coupon.code : undefined,
            tipMinor: input.tipMinor,
            ecoPackaging: input.eco,
            contactless: input.mode === 'DELIVERY' ? input.contactless : false,
            buildingAccessCode: input.buildingAccessCode || null,
            deliveryNote: input.deliveryNote || null,
            scheduledFor: input.scheduleMode === 'scheduled' ? input.scheduledFor : null,
            checkoutSessionId: sessionIdRef.current,
            addressLabel: selected?.label ?? input.location.label,
            guestName: input.authenticated ? null : input.guestName || null,
            guestPhone: input.authenticated ? null : input.guestPhone || null,
            loyaltyRequestedMinor:
              input.useLoyalty && input.loyaltyPoints ? input.loyaltyPoints : undefined,
            loyaltyAvailablePoints:
              input.useLoyalty && input.loyaltyPoints ? input.loyaltyPoints : undefined,
          });
          if (!cancelled) {
            sessionIdRef.current = next.checkoutSessionId;
            setQuote(next);
          }
        } catch (err) {
          if (!cancelled) {
            setQuote(null);
            setQuoteError(errorMessage(err));
          }
        } finally {
          if (!cancelled) setQuoteLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [quoteKey, status, lines.length]);

  useEffect(() => {
    const branchId = quote?.branchId ?? pickupBranchId;
    if (!branchId) return;
    void fetchCheckoutSlots(branchId)
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]));
  }, [quote?.branchId, pickupBranchId, mode]);

  async function pay() {
    if (!quote?.checkoutSessionId || !quote.minimumOrderEligible || paying) return;
    setPaying(true);
    setError(null);
    try {
      const init = await initializeCheckoutPayment({
        checkoutSessionId: quote.checkoutSessionId,
        amountMinor: quote.finalPayableMinor,
        currency: quote.currency,
      });
      if (init.providerPaymentId) {
        window.sessionStorage.setItem('ff_provider_payment_id', init.providerPaymentId);
      }
      if (init.redirectUrl) {
        window.sessionStorage.setItem('ff_iyzico_redirect', init.redirectUrl);
      } else {
        window.sessionStorage.removeItem('ff_iyzico_redirect');
      }
      writePaymentSummary({
        lines,
        currency: quote.currency,
        branchName: quote.branchName,
        merchandiseGrossSubtotalMinor: quote.merchandiseGrossSubtotalMinor,
        cartDiscountTotalMinor: quote.cartDiscountTotalMinor,
        pickupDiscountMinor: quote.pickupDiscountMinor,
        deliveryFeeMinor: quote.deliveryFeeMinor,
        tipMinor: quote.tipMinor,
        loyaltyRedeemedMinor: quote.loyaltyRedeemedMinor,
        finalPayableMinor: quote.finalPayableMinor,
      });
      await refreshCart();
      if (init.redirectUrl) {
        // ADR-022: card entry and 3-D Secure happen on iyzico's hosted page.
        window.location.assign(init.redirectUrl);
        return;
      }
      router.push(`/payment/${quote.checkoutSessionId}`);
    } catch (err) {
      setError(errorMessage(err));
      setPaying(false);
    }
  }

  if (status === 'loading' && !cart) return <ShopSkeleton />;
  if (status === 'error' && !cart) {
    return (
      <ShopError
        title="Ödeme yüklenemedi"
        message={error ?? ''}
        onRetry={() => setNonce((n) => n + 1)}
      />
    );
  }
  if (lines.length === 0) {
    return (
      <main className="w-full pt-24 pb-16 bg-[#0a0c14] min-h-screen text-neutral-100" data-ff-surface="checkout">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ShopEmpty
            title="Sepetin boş"
            message="Ödeme için önce menüden gurme burgerlerimizi ve lezzetlerimizi ekle."
            actionHref="/"
            actionLabel="Menüye dön"
          />
          <a
            href="/account/support"
            className="mt-6 flex items-center justify-between p-4 rounded-xl bg-[#12151f]/85 border border-white/[0.08] text-neutral-300 hover:border-amber-400/40 transition-all max-w-md mx-auto"
            data-ff-support-entry="checkout"
          >
            <span className="font-sans text-sm text-neutral-300">Canlı destek</span>
            <span className="font-anton text-xs uppercase tracking-wider text-amber-400">Canlı Destek</span>
          </a>
        </div>
      </main>
    );
  }

  const etaLabel =
    quote?.etaMinutesMin !== undefined
      ? `${quote.etaMinutesMin} - ${quote.etaMinutesMax} Dakika İçinde`
      : 'Hazırlık süresi hesaplanıyor';
  const payDisabled =
    !quote ||
    !quote.minimumOrderEligible ||
    quoteLoading ||
    Boolean(quoteError) ||
    (mode === 'DELIVERY' && !location.serviceable && !addressId) ||
    (scheduleMode === 'scheduled' && !scheduledFor) ||
    payMethod !== 'iyzico_hosted';

  return (
    <main className="w-full pt-24 pb-20 bg-[#0a0c14] min-h-screen text-neutral-100 relative" data-ff-surface="checkout">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(254,179,0,0.12),rgba(255,255,255,0))] pointer-events-none" />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-neutral-400 font-anton text-xs uppercase tracking-widest mb-2">
              <span className="text-amber-400">Sepet</span>
              <MaterialIcon name="chevron_right" className="text-xs text-neutral-600" />
              <span className="text-white">Ödeme & Teslimat</span>
              <MaterialIcon name="chevron_right" className="text-xs text-neutral-600" />
              <span className="text-neutral-500">Onay</span>
            </div>
            <h1 className="font-anton text-3xl sm:text-4xl md:text-5xl uppercase text-white tracking-wide drop-shadow-sm">
              Siparişi Tamamla
            </h1>
          </div>
          <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(254,179,0,0.1)] self-start md:self-auto">
            <MaterialIcon name="local_fire_department" className="text-amber-400 text-lg" filled />
            <span className="font-anton text-amber-400 text-xs uppercase tracking-wider">{GRILL_LIVE_LABEL}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <CheckoutSection step={1} title="Teslimat Yolu & Adres" verified={!quoteError}>
              <FulfillmentSelector mode={mode} onChange={setMode} />
              {mode === 'DELIVERY' ? (
                <>
                  <DeliveryAddressCard
                    location={location}
                    addresses={addresses}
                    selectedAddressId={addressId}
                    onSelectAddress={(id) => {
                      setAddressId(id);
                      setDeliveryBranchId(null);
                    }}
                    deliveryNote={deliveryNote}
                    onDeliveryNote={setDeliveryNote}
                    buildingAccessCode={buildingAccessCode}
                    onBuildingAccessCode={setBuildingAccessCode}
                    guestName={guestName}
                    guestPhone={guestPhone}
                    onGuestName={setGuestName}
                    onGuestPhone={setGuestPhone}
                    authenticated={authenticated}
                  />
                  <DeliveryBranchSelector
                    branches={quote?.serviceableBranches}
                    selectedBranchId={deliveryBranchId ?? quote?.branchId ?? null}
                    onSelectBranch={(id) => setDeliveryBranchId(id)}
                    currentBranchName={quote?.branchName}
                  />
                </>
              ) : (
                <PickupBranchSelector
                  branches={branches}
                  selectedId={pickupBranchId}
                  onSelect={setPickupBranchId}
                />
              )}
            </CheckoutSection>

            <CheckoutSection
              step={2}
              title={mode === 'PICKUP' ? 'Hazırlama Zamanı' : 'Teslimat Zamanı'}
            >
              <DeliveryScheduleSelector
                mode={scheduleMode}
                onMode={setScheduleMode}
                slots={slots}
                scheduledFor={scheduledFor}
                onScheduledFor={setScheduledFor}
                etaLabel={etaLabel}
              />
            </CheckoutSection>

            <CheckoutSection title="Sipariş Tercihleri">
              <OrderPreferences
                ecoPackaging={eco}
                onEco={setEco}
                contactless={contactless}
                onContactless={setContactless}
                showContactless={mode === 'DELIVERY'}
              />
            </CheckoutSection>

            <CheckoutSection
              step={3}
              title="Ödeme Yöntemi"
              trailing={
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">
                  <MaterialIcon name="lock" className="text-xs" />
                  <span className="font-anton text-[10px] uppercase tracking-wider">3D Secure</span>
                </div>
              }
            >
              <PaymentMethodSelector
                methods={methods}
                selected={payMethod}
                onSelect={setPayMethod}
              />
              <div className="p-4 rounded-xl bg-[#0e111a]/90 border border-white/[0.08] mb-space-md flex items-center gap-3">
                <MaterialIcon name="shield" className="text-amber-400 text-xl shrink-0" filled />
                <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                  Kart numarası BURGER HOME sunucularında toplanmaz. Ödeme iyzico 3-D Secure / hosted güvenli altyapısında tamamlanır.
                </p>
              </div>
              {mode === 'DELIVERY' ? (
                <TipSelector
                  value={tipMinor}
                  onChange={setTipMinor}
                  currency={quote?.currency ?? 'TRY'}
                />
              ) : null}
            </CheckoutSection>

            {quoteError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-sans">
                {quoteError}
              </div>
            ) : null}
            {error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-sans">
                {error}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
            <CheckoutSummary
              lines={lines}
              quote={quote}
              quoteLoading={quoteLoading}
              couponCode={coupon.code}
              onCouponCode={coupon.setCode}
              couponStatus={coupon.status}
              couponMessage={coupon.message}
              onApplyCoupon={coupon.apply}
              onPay={() => void pay()}
              paying={paying}
              payDisabled={payDisabled}
              loyaltyPoints={loyaltyPoints}
              useLoyalty={useLoyalty}
              onUseLoyalty={setUseLoyalty}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
