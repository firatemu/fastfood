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
      <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="checkout">
        <div className="max-w-7xl mx-auto px-margin-sm py-space-lg">
          <ShopEmpty
            title="Sepetin boş"
            message="Ödeme için önce menüden ürün ekle."
            actionHref="/"
            actionLabel="Menüye dön"
          />
          <a
            href="/account/support"
            className="mt-space-md flex items-center justify-between p-3 rounded-xl bg-surface-container-low text-on-surface-variant"
            data-ff-support-entry="checkout"
          >
            <span className="font-body-sm">Canlı destek</span>
            <span className="font-label-sm uppercase text-secondary-container">Canlı Destek</span>
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
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="checkout">
      <div className="relative w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-md lg:py-space-xl">
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-primary-container/10 blur-[120px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm mb-space-md">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant font-label-sm uppercase tracking-wider mb-1">
              <span className="text-primary-container">Sepet</span>
              <MaterialIcon name="chevron_right" className="text-xs" />
              <span className="text-on-surface">Ödeme & Teslimat</span>
              <MaterialIcon name="chevron_right" className="text-xs" />
              <span className="opacity-50">Onay</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg uppercase text-on-surface tracking-tight">
              Siparişi Tamamla
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-lg">
            <MaterialIcon name="local_fire_department" className="text-primary-container" filled />
            <span className="font-label-md uppercase">{GRILL_LIVE_LABEL}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <div className="lg:col-span-7 flex flex-col gap-space-md">
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
            <CheckoutSection title="Sipariş tercihleri">
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
                <div className="flex items-center gap-1 text-primary-container">
                  <MaterialIcon name="lock" className="text-sm" />
                  <span className="font-label-sm text-[11px] uppercase">3D Secure</span>
                </div>
              }
            >
              <PaymentMethodSelector
                methods={methods}
                selected={payMethod}
                onSelect={setPayMethod}
              />
              <div className="p-space-md rounded-xl bg-surface-container mb-space-md">
                <p className="font-body-sm text-on-surface-variant">
                  Kart numarası BURGER HOME sayfasında toplanmaz. Ödeme iyzico 3-D Secure / hosted
                  akışında tamamlanır.
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
            {quoteError ? <p className="font-body-sm text-error">{quoteError}</p> : null}
            {error ? <p className="font-body-sm text-error">{error}</p> : null}
          </div>
          <div className="lg:col-span-5 flex flex-col gap-space-md lg:sticky lg:top-24">
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
