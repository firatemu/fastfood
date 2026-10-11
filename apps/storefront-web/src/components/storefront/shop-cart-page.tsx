'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { merchandiseSubtotalMinor, payableMinor } from '../../lib/pricing-preview';
import { fetchLoyaltyPoints } from '../../lib/storefront/account';
import { LOYALTY_PROGRAM_NAME } from '../../lib/storefront/brand-copy';
import {
  addProductToCart,
  clearCart,
  fetchCart,
  fetchCartQuote,
  removeCartLine,
  updateCartLineQuantity,
  type Cart,
} from '../../lib/storefront/cart';
import {
  readCartDeliveryNote,
  readUseLoyaltyIntent,
  writeCartDeliveryNote,
  writeUseLoyaltyIntent,
} from '../../lib/storefront/cart-intent';
import { fetchCustomerBranches, type CustomerBranch } from '../../lib/storefront/discover';
import { formatDeliveryWindow } from '../../lib/storefront/format';
import { useStorefrontCoupon } from '../../lib/storefront/use-storefront-coupon';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { RequireCustomer } from './account-shell';
import { CartLineCard } from './cart-line-card';
import { CouponForm } from './coupon-form';
import { MaterialIcon } from './material-icon';
import { ShopEmpty, ShopError, ShopSkeleton } from './shop-states';
import { useStorefrontChrome } from './storefront-chrome';

const STEPS = [
  { n: 1, label: 'Sepet', href: '/cart', active: true },
  { n: 2, label: 'Teslimat & Adres', href: '/checkout', active: false },
  { n: 3, label: 'Ödeme', href: '/checkout', active: false },
  { n: 4, label: 'Onay', href: null, active: false },
] as const;

export function ShopCartPage() {
  return (
    <RequireCustomer>
      <ShopCartContents />
    </RequireCustomer>
  );
}

function ShopCartContents() {
  const { home, refreshCart } = useStorefrontChrome();
  const [cart, setCart] = useState<Cart | null>(null);
  const [quoteMinor, setQuoteMinor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [note, setNote] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState<string | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [clearing, setClearing] = useState(false);

  useDeferredLoad(() => {
    void (async () => {
      try {
        const next = await fetchCart();
        setCart(next);
        try {
          const quote = await fetchCartQuote();
          setQuoteMinor(quote.subtotalMinor);
        } catch {
          setQuoteMinor(null);
        }
        setNote(readCartDeliveryNote());
        setUseLoyalty(readUseLoyaltyIntent());
        if (isCustomerAuthenticated()) {
          const points = await fetchLoyaltyPoints().catch(() => null);
          setLoyaltyPoints(points);
        } else {
          setLoyaltyPoints(null);
        }
        const nextBranches = await fetchCustomerBranches().catch(() => []);
        setBranches(nextBranches);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [nonce]);

  const lines = cart?.lineItems ?? [];
  const snapshotSubtotal = merchandiseSubtotalMinor(lines);
  const merchandiseMinor = quoteMinor ?? snapshotSubtotal;
  const currency = lines[0]?.currencySnapshot ?? 'TRY';
  const coupon = useStorefrontCoupon(merchandiseMinor, currency);
  const payable = payableMinor(merchandiseMinor, coupon.discountMinor);
  const itemCount = lines.reduce((n, line) => n + line.quantity, 0);
  const branch = home?.branch ?? null;
  const branchDetail = branches.find((item) => item.id === branch?.id) ?? branches[0] ?? null;
  const eta = branch
    ? formatDeliveryWindow(branch.estimatedDeliveryMinutesMin, branch.estimatedDeliveryMinutesMax)
    : null;
  const minOrder = BigInt(branchDetail?.minOrderMinor ?? '0');
  const merch = BigInt(merchandiseMinor);
  const minRemaining = minOrder > merch ? minOrder - merch : 0n;
  const minPct = minOrder > 0n ? Math.min(100, Math.round(Number((merch * 100n) / minOrder))) : 100;
  const inCart = new Set(lines.map((line) => line.productId));
  const sideCategoryIds = new Set(
    (home?.categories ?? [])
      .filter((category) =>
        /yan|side|icecek|drink|sos|extra/i.test(`${category.slug} ${category.name}`),
      )
      .map((category) => category.id),
  );
  const upsells = (home?.products ?? [])
    .filter((product) => product.isAvailable && !inCart.has(product.id))
    .sort(
      (a, b) =>
        Number(sideCategoryIds.has(b.categoryId)) - Number(sideCategoryIds.has(a.categoryId)),
    )
    .slice(0, 3);

  async function refreshTotals(next: Cart) {
    setCart(next);
    await refreshCart();
    try {
      const quote = await fetchCartQuote();
      setQuoteMinor(quote.subtotalMinor);
    } catch {
      setQuoteMinor(merchandiseSubtotalMinor(next.lineItems));
    }
  }

  async function mutate(lineId: string, work: () => Promise<Cart>) {
    setBusyId(lineId);
    try {
      await refreshTotals(await work());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onClear() {
    if (clearing || lines.length === 0) return;
    setClearing(true);
    try {
      const next = await clearCart(lines);
      setCart(next ?? { ...(cart as Cart), lineItems: [] });
      await refreshCart();
      setQuoteMinor('0');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClearing(false);
    }
  }

  async function onAddUpsell(productId: string) {
    setBusyId(productId);
    try {
      await refreshTotals(await addProductToCart(productId, 1));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (status === 'loading' && !cart) return <ShopSkeleton />;
  if (status === 'error' && !cart) {
    return (
      <ShopError
        title="Sepet yüklenemedi"
        message={error ?? 'Sepet alınamadı.'}
        surface="cart"
        onRetry={() => setNonce((n) => n + 1)}
      />
    );
  }
  if (lines.length === 0) {
    return (
      <ShopEmpty
        title="Sepetin boş"
        message="Menüden bir smash seç, özelleştir, sonra burada topla."
        actionHref="/"
        actionLabel="Menüye dön"
        surface="cart"
      />
    );
  }

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="cart">
      <div className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg lg:py-space-xl">
        <div className="mb-space-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-md">
            <div className="flex items-baseline gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg uppercase text-on-surface tracking-wider">
                SEPETİM
              </h1>
              <span className="font-label-md text-label-md uppercase text-secondary-container px-2.5 py-1 rounded-full bg-secondary-container/10">
                {lines.length} Çeşit Lezzet
              </span>
            </div>
            <nav
              className="flex items-center gap-2 sm:gap-4 font-label-md text-label-md uppercase overflow-x-auto pb-1 sm:pb-0"
              aria-label="Sipariş adımları"
            >
              {STEPS.map((step, index) => (
                <span key={step.n} className="contents">
                  {index > 0 ? (
                    <span className="text-surface-container-highest shrink-0">/</span>
                  ) : null}
                  {step.href && !step.active ? (
                    <Link
                      href={step.href}
                      className="flex items-center gap-2 text-on-surface-variant/50 shrink-0"
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm">
                        {step.n}
                      </span>
                      <span>{step.label}</span>
                    </Link>
                  ) : (
                    <div
                      className={
                        step.active
                          ? 'flex items-center gap-2 text-primary-container font-bold shrink-0'
                          : 'flex items-center gap-2 text-on-surface-variant/50 shrink-0'
                      }
                    >
                      <span
                        className={
                          step.active
                            ? 'flex items-center justify-center w-6 h-6 rounded-full bg-primary-container text-surface-container-lowest font-label-sm font-black shadow-sm'
                            : 'flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm'
                        }
                      >
                        {step.n}
                      </span>
                      <span>{step.label}</span>
                    </div>
                  )}
                </span>
              ))}
            </nav>
          </div>
          {minOrder > 0n ? (
            <div className="w-full bg-surface-container-low rounded-xl p-space-md flex flex-col gap-2 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface">
                <div className="flex items-center gap-2">
                  <MaterialIcon
                    name="local_shipping"
                    className="text-secondary-container text-base animate-pulse"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface">
                    {minRemaining > 0n ? (
                      <>
                        Minimum siparişe{' '}
                        <strong className="text-secondary-container font-semibold">
                          {formatTryMinor(minRemaining.toString(), currency)}
                        </strong>{' '}
                        kaldı.{' '}
                        <span className="text-on-surface-variant hidden sm:inline">
                          ({formatTryMinor(minOrder.toString(), currency)} ve üzeri)
                        </span>
                      </>
                    ) : (
                      <>Minimum sipariş tutarına ulaştın.</>
                    )}
                    {coupon.deliveryWaived ? (
                      <span className="block sm:inline sm:ml-1 text-on-surface-variant">
                        Teslimat ücreti kuponu checkout’ta uygulanır.
                      </span>
                    ) : null}
                  </span>
                </div>
                <span className="font-label-sm text-secondary-container font-bold tracking-wider">
                  %{minPct}
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-container rounded-full transition-all duration-500"
                  style={{ width: `${minPct}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg lg:gap-space-xl items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                  Sipariş Edilen Ürünler
                </span>
                <button
                  className="font-label-sm text-label-sm text-on-surface-variant/70 hover:text-error transition-colors flex items-center gap-1 disabled:opacity-40"
                  type="button"
                  disabled={clearing}
                  onClick={() => void onClear()}
                >
                  <MaterialIcon name="delete_sweep" className="text-sm" />
                  Sepeti Temizle
                </button>
              </div>
              {lines.map((line) => (
                <CartLineCard
                  key={line.id}
                  line={line}
                  busy={busyId === line.id}
                  onQuantity={(quantity) =>
                    void mutate(line.id, () => updateCartLineQuantity(line.id, quantity))
                  }
                  onRemove={() => void mutate(line.id, () => removeCartLine(line.id))}
                />
              ))}
              {error ? <p className="font-body-sm text-error">{error}</p> : null}
            </div>

            {upsells.length > 0 ? (
              <div className="mt-space-md bg-surface-container-low/60 rounded-2xl p-space-md lg:p-space-lg flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="recommend" className="text-secondary-container text-xl" />
                    <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
                      Burger Yanına Harika Gider
                    </h3>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">
                    Tek tıkla sepete ekle
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {upsells.map((item) => (
                    <div
                      key={item.id}
                      className="bg-surface-container rounded-xl p-space-sm flex flex-col justify-between hover:bg-surface-container-high transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.imageAlt ?? item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <MaterialIcon
                              name="lunch_dining"
                              className="w-full h-full p-3 text-on-surface-variant"
                            />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-md text-label-md text-on-surface truncate font-bold">
                            {item.name}
                          </span>
                          {item.volumeMl || item.weightGrams ? (
                            <span className="font-label-sm text-[10px] text-on-surface-variant">
                              {item.volumeMl ? `${item.volumeMl} ml` : `${item.weightGrams} g`}
                            </span>
                          ) : null}
                          <span className="font-label-md text-label-md text-secondary-container font-semibold mt-0.5">
                            {formatTryMinor(item.basePriceMinor, item.currency)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="mt-3 w-full py-1.5 px-space-sm rounded-lg bg-surface-container-highest hover:bg-secondary-container hover:text-on-secondary-container text-on-surface font-label-sm text-label-sm uppercase font-semibold transition-all flex items-center justify-center gap-1 disabled:opacity-40"
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void onAddUpsell(item.id)}
                      >
                        <MaterialIcon name="add" className="text-sm" />
                        Ekle
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-2">
              <div className="flex items-center gap-2 text-on-surface">
                <MaterialIcon name="notes" className="text-primary text-base" />
                <label
                  htmlFor="cart-kitchen-note"
                  className="font-label-md text-label-md uppercase"
                >
                  Mutfak & Kurye Notu Ekle
                </label>
              </div>
              <input
                id="cart-kitchen-note"
                className="w-full px-space-md py-2.5 bg-surface-container rounded-lg text-on-surface placeholder:text-on-surface-variant/50 font-body-sm text-body-sm outline-none focus:bg-surface-container-high focus:ring-1 focus:ring-primary-container transition-colors"
                placeholder="Örn: Zili çalmayın lütfen, soslar ayrı paketlensin..."
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  writeCartDeliveryNote(event.target.value);
                }}
              />
              <span className="font-label-sm text-[10px] text-on-surface-variant">
                Checkout adımına taşınır. Fiyatı değiştirmez.
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-28">
            <div className="bg-surface-container-low rounded-2xl p-space-lg flex flex-col gap-space-md shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-space-xs">
                <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wider">
                  SİPARİŞ ÖZETİ
                </h2>
                {branch ? (
                  <span className="font-label-sm text-label-sm text-secondary-container bg-secondary-container/10 px-2 py-0.5 rounded uppercase font-bold">
                    {branch.name}
                  </span>
                ) : null}
              </div>

              {coupon.status === 'valid' && coupon.code ? (
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Promosyon / İndirim Kodu
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
                    <div className="flex items-center gap-2">
                      <MaterialIcon
                        name="local_activity"
                        className="text-primary-container text-lg"
                      />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-black tracking-wider text-on-surface">
                          {coupon.code}
                        </span>
                        <span className="font-label-sm text-[10px] text-primary-container">
                          {coupon.message}
                        </span>
                      </div>
                    </div>
                    <button
                      className="font-label-sm text-label-sm text-on-surface-variant/60 hover:text-error transition-colors px-2 py-1"
                      type="button"
                      onClick={() => coupon.clear()}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Promosyon / İndirim Kodu
                  </span>
                  <CouponForm
                    code={coupon.code}
                    onCodeChange={coupon.setCode}
                    status={coupon.status}
                    message={coupon.message}
                    onApply={coupon.apply}
                  />
                </div>
              )}

              {loyaltyPoints && BigInt(loyaltyPoints) > 0n ? (
                <div className="p-3 rounded-xl bg-surface-container flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-secondary">
                      <MaterialIcon name="stars" className="text-base" />
                      <span className="font-label-sm text-label-sm uppercase font-bold">
                        {LOYALTY_PROGRAM_NAME}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                      {loyaltyPoints} puan
                    </span>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      className="w-4 h-4 rounded bg-surface-container-highest text-secondary-container accent-secondary-container cursor-pointer"
                      type="checkbox"
                      checked={useLoyalty}
                      onChange={(event) => {
                        setUseLoyalty(event.target.checked);
                        writeUseLoyaltyIntent(event.target.checked);
                      }}
                    />
                    <span className="font-body-sm text-[13px] text-on-surface-variant leading-snug">
                      Puanı checkout’ta kullanmayı dene. Asıl tutar quote’dur.
                    </span>
                  </label>
                </div>
              ) : null}

              <div className="flex flex-col gap-2.5 pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                <div className="flex justify-between items-center">
                  <span>Ürünler Toplamı ({itemCount} Adet)</span>
                  <span className="font-label-md text-on-surface font-semibold">
                    {formatTryMinor(merchandiseMinor, currency)}
                  </span>
                </div>
                {BigInt(coupon.discountMinor) > 0n ? (
                  <div className="flex justify-between items-center text-primary-container">
                    <span className="flex items-center gap-1">
                      Kupon İndirimi
                      {coupon.code ? (
                        <span className="text-[10px] px-1 rounded bg-primary-container/20">
                          {coupon.code}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-label-md font-bold">
                      -{formatTryMinor(coupon.discountMinor, currency)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center">
                  <span>Teslimat Ücreti</span>
                  <span className="font-label-sm text-secondary-container font-bold uppercase">
                    {coupon.deliveryWaived ? 'ÜCRETSİZ' : 'Ödemede'}
                  </span>
                </div>
              </div>

              <div className="pt-space-sm flex justify-between items-baseline bg-surface-container-high/40 p-space-md rounded-xl">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Genel Toplam
                  </span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant/70">
                    KDV ve Vergiler Dahil · checkout kesinler
                  </span>
                </div>
                <span className="font-headline-md text-headline-md text-secondary-container tracking-tight leading-none">
                  {formatTryMinor(payable, currency)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="w-full py-3 px-space-md rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-label-lg uppercase tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(254,179,0,0.35)] hover:brightness-110 transition-all group"
                data-ff-checkout-cta
              >
                ADRES & ÖDEMEYE GEÇ
                <MaterialIcon
                  name="arrow_forward"
                  className="text-lg group-hover:translate-x-1 transition-transform"
                />
              </Link>

              <div className="flex flex-col gap-2 pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                <div className="flex items-center gap-2.5">
                  <MaterialIcon
                    name="local_fire_department"
                    className="text-secondary-container text-base shrink-0"
                  />
                  <span className="text-xs">
                    <strong className="text-on-surface">Termal Sıcak Kutu Garantisi:</strong> Döküm
                    ızgara sıcaklığında teslim.
                  </span>
                </div>
                {eta ? (
                  <div className="flex items-center gap-2.5">
                    <MaterialIcon
                      name="timer"
                      className="text-secondary-container text-base shrink-0"
                    />
                    <span className="text-xs">
                      <strong className="text-on-surface">{eta} Ekspres Teslimat:</strong>{' '}
                      {branch?.name ?? 'Seçili şube'} çevresi.
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2.5">
                  <MaterialIcon
                    name="shield"
                    className="text-secondary-container text-base shrink-0"
                  />
                  <span className="text-xs">
                    <strong className="text-on-surface">Güvenli Ödeme:</strong> iyzico 3-D Secure.
                    PAN bu sayfada yok.
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/legal#alerjen-rehberi"
              className="p-space-md rounded-xl bg-surface-container-low/60 flex items-center justify-between text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="flex items-center gap-2">
                <MaterialIcon name="info" className="text-sm" />
                <span className="font-label-sm text-label-sm uppercase tracking-wider">
                  Alerjen & Pişirme Bilgilendirmesi
                </span>
              </span>
              <MaterialIcon name="chevron_right" className="text-sm" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
