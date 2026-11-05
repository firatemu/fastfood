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
            <div className="flex items-center gap-3">
              <h1 className="font-anton text-3xl md:text-4xl uppercase text-white tracking-wide">
                SEPETİM
              </h1>
              <span className="font-anton text-xs uppercase text-amber-400 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 font-bold">
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
                    <span className="text-white/20 shrink-0">/</span>
                  ) : null}
                  {step.href && !step.active ? (
                    <Link
                      href={step.href}
                      className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors shrink-0"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 text-neutral-400 font-anton text-sm">
                        {step.n}
                      </span>
                      <span className="font-label-sm text-xs">{step.label}</span>
                    </Link>
                  ) : (
                    <div
                      className={
                        step.active
                          ? 'flex items-center gap-2 text-amber-400 font-bold shrink-0'
                          : 'flex items-center gap-2 text-neutral-500 shrink-0'
                      }
                    >
                      <span
                        className={
                          step.active
                            ? 'flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-neutral-950 font-anton text-sm font-bold shadow-[0_2px_10px_rgba(254,179,0,0.4)]'
                            : 'flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 text-neutral-500 font-anton text-sm'
                        }
                      >
                        {step.n}
                      </span>
                      <span className="font-label-sm text-xs">{step.label}</span>
                    </div>
                  )}
                </span>
              ))}
            </nav>
          </div>
          {minOrder > 0n ? (
            <div className="w-full bg-[#12151f]/85 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between font-label-sm text-label-sm text-white">
                <div className="flex items-center gap-2.5">
                  <MaterialIcon
                    name="local_shipping"
                    className="text-amber-400 text-lg animate-pulse"
                  />
                  <span className="font-body-sm text-sm text-neutral-200">
                    {minRemaining > 0n ? (
                      <>
                        Minimum siparişe{' '}
                        <strong className="text-amber-400 font-anton text-base">
                          {formatTryMinor(minRemaining.toString(), currency)}
                        </strong>{' '}
                        kaldı.{' '}
                        <span className="text-neutral-400 hidden sm:inline text-xs">
                          ({formatTryMinor(minOrder.toString(), currency)} ve üzeri)
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-400 font-semibold">Minimum sipariş tutarına ulaştınız.</span>
                    )}
                    {coupon.deliveryWaived ? (
                      <span className="block sm:inline sm:ml-2 text-amber-400/80 text-xs">
                        Teslimat ücreti kuponu checkout’ta uygulanır.
                      </span>
                    ) : null}
                  </span>
                </div>
                <span className="font-anton text-base text-amber-400 tracking-wider">
                  %{minPct}
                </span>
              </div>
              <div className="w-full bg-white/[0.06] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/[0.05]">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full shadow-[0_0_12px_rgba(254,179,0,0.5)] transition-all duration-500"
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
                <span className="font-anton text-lg text-white uppercase tracking-wider">
                  Sipariş Edilen Ürünler
                </span>
                <button
                  className="font-label-sm text-xs text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer font-medium"
                  type="button"
                  disabled={clearing}
                  onClick={() => void onClear()}
                >
                  <MaterialIcon name="delete_sweep" className="text-base" />
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
              <div className="mt-space-md bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 md:p-6 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MaterialIcon name="recommend" className="text-amber-400 text-xl" />
                    <h3 className="font-anton text-xl text-white uppercase tracking-wide">
                      Burger Yanına Harika Gider
                    </h3>
                  </div>
                  <span className="font-label-sm text-xs text-neutral-400 hidden sm:inline">
                    Tek tıkla sepete ekle
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {upsells.map((item) => (
                    <div
                      key={item.id}
                      className="bg-neutral-950/70 border border-white/[0.07] hover:border-amber-400/35 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-neutral-900/80 transition-all group shadow-inner"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10 flex items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.imageAlt ?? item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <MaterialIcon
                              name="lunch_dining"
                              className="text-amber-400/60 text-2xl"
                            />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-anton text-base text-white truncate font-medium">
                            {item.name}
                          </span>
                          {item.volumeMl || item.weightGrams ? (
                            <span className="font-label-sm text-[10px] text-neutral-400">
                              {item.volumeMl ? `${item.volumeMl} ml` : `${item.weightGrams} g`}
                            </span>
                          ) : null}
                          <span className="font-anton text-base text-amber-400 font-semibold mt-0.5">
                            {formatTryMinor(item.basePriceMinor, item.currency)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="mt-3 w-full py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-400/30 hover:bg-amber-400 hover:text-neutral-950 text-amber-400 font-anton text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
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

            <div className="bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-2.5 shadow-xl">
              <div className="flex items-center gap-2 text-white">
                <MaterialIcon name="notes" className="text-amber-400 text-base" />
                <label
                  htmlFor="cart-kitchen-note"
                  className="font-anton text-sm text-white uppercase tracking-wider"
                >
                  Mutfak & Kurye Notu Ekle
                </label>
              </div>
              <input
                id="cart-kitchen-note"
                className="w-full px-4 py-3 bg-[#0d1017] border border-white/10 rounded-xl text-white placeholder:text-neutral-500 font-body-sm text-sm outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all"
                placeholder="Örn: Zili çalmayın lütfen, soslar ayrı paketlensin..."
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  writeCartDeliveryNote(event.target.value);
                }}
              />
              <span className="font-label-sm text-[11px] text-neutral-400">
                Checkout adımına taşınır. Fiyatı değiştirmez.
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-28">
            <div className="bg-[#12151f]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-5 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h2 className="font-anton text-2xl text-white uppercase tracking-wide">
                  SİPARİŞ ÖZETİ
                </h2>
                {branch ? (
                  <span className="font-anton text-xs text-amber-400 bg-amber-500/15 border border-amber-400/30 px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                    {branch.name}
                  </span>
                ) : null}
              </div>

              {coupon.status === 'valid' && coupon.code ? (
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-xs text-neutral-400 uppercase tracking-wider">
                    Promosyon / İndirim Kodu
                  </span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex items-center gap-2.5">
                      <MaterialIcon
                        name="local_activity"
                        className="text-amber-400 text-lg"
                      />
                      <div className="flex flex-col">
                        <span className="font-anton text-sm tracking-wider text-white">
                          {coupon.code}
                        </span>
                        <span className="font-label-sm text-[11px] text-amber-400 font-medium">
                          {coupon.message}
                        </span>
                      </div>
                    </div>
                    <button
                      className="font-label-sm text-xs text-neutral-400 hover:text-red-400 transition-colors px-2 py-1 font-semibold cursor-pointer"
                      type="button"
                      onClick={() => coupon.clear()}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-xs text-neutral-400 uppercase tracking-wider">
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
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-amber-500/30 flex flex-col gap-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400">
                      <MaterialIcon name="stars" className="text-base" />
                      <span className="font-anton text-sm uppercase tracking-wide">
                        {LOYALTY_PROGRAM_NAME}
                      </span>
                    </div>
                    <span className="font-anton text-sm text-amber-400 font-bold">
                      {loyaltyPoints} puan
                    </span>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      className="w-4 h-4 rounded bg-[#0d1017] text-amber-400 accent-amber-400 cursor-pointer"
                      type="checkbox"
                      checked={useLoyalty}
                      onChange={(event) => {
                        setUseLoyalty(event.target.checked);
                        writeUseLoyaltyIntent(event.target.checked);
                      }}
                    />
                    <span className="font-body-sm text-[12px] text-neutral-300 leading-snug">
                      Puanı checkout’ta kullanmayı dene. Asıl tutar quote’dur.
                    </span>
                  </label>
                </div>
              ) : null}

              <div className="flex flex-col gap-2.5 pt-2 border-t border-white/[0.08] font-body-sm text-body-sm text-neutral-400">
                <div className="flex justify-between items-center">
                  <span>Ürünler Toplamı ({itemCount} Adet)</span>
                  <span className="text-white font-medium">
                    {formatTryMinor(merchandiseMinor, currency)}
                  </span>
                </div>
                {BigInt(coupon.discountMinor) > 0n ? (
                  <div className="flex justify-between items-center text-amber-400 font-bold">
                    <span className="flex items-center gap-1">
                      Kupon İndirimi
                      {coupon.code ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          {coupon.code}
                        </span>
                      ) : null}
                    </span>
                    <span>
                      -{formatTryMinor(coupon.discountMinor, currency)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center">
                  <span>Teslimat Ücreti</span>
                  <span className="text-amber-400 font-bold uppercase">
                    {coupon.deliveryWaived ? 'ÜCRETSİZ' : 'Ödemede'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-baseline bg-white/[0.04] border border-white/[0.08] p-4 rounded-2xl">
                <div className="flex flex-col">
                  <span className="font-anton text-lg text-white uppercase tracking-wider">
                    Genel Toplam
                  </span>
                  <span className="font-label-sm text-[10px] text-neutral-400">
                    KDV ve Vergiler Dahil · checkout kesinler
                  </span>
                </div>
                <span className="font-anton text-3xl md:text-4xl text-amber-400 tracking-tight leading-none drop-shadow-sm">
                  {formatTryMinor(payable, currency)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 font-anton text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_6px_25px_rgba(254,179,0,0.35)] hover:brightness-110 active:scale-95 transition-all group"
                data-ff-checkout-cta
              >
                <span>ADRES & ÖDEMEYE GEÇ</span>
                <MaterialIcon
                  name="arrow_forward"
                  className="text-xl group-hover:translate-x-1 transition-transform"
                />
              </Link>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-white/[0.08] font-body-sm text-xs text-neutral-400">
                <div className="flex items-center gap-2.5">
                  <MaterialIcon
                    name="local_fire_department"
                    className="text-amber-400 text-base shrink-0"
                  />
                  <span>
                    <strong className="text-white">Termal Sıcak Kutu Garantisi:</strong> Döküm
                    ızgara sıcaklığında teslim.
                  </span>
                </div>
                {eta ? (
                  <div className="flex items-center gap-2.5">
                    <MaterialIcon
                      name="timer"
                      className="text-amber-400 text-base shrink-0"
                    />
                    <span>
                      <strong className="text-white">{eta} Ekspres Teslimat:</strong>{' '}
                      {branch?.name ?? 'Seçili şube'} çevresi.
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2.5">
                  <MaterialIcon
                    name="shield"
                    className="text-amber-400 text-base shrink-0"
                  />
                  <span>
                    <strong className="text-white">Güvenli Ödeme:</strong> iyzico 3-D Secure.
                    PAN bu sayfada yok.
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/legal#alerjen-rehberi"
              className="p-4 rounded-2xl bg-[#12151f]/85 border border-white/[0.08] flex items-center justify-between text-neutral-300 hover:text-white hover:border-amber-400/30 transition-all shadow-md"
            >
              <span className="flex items-center gap-2">
                <MaterialIcon name="info" className="text-amber-400 text-base" />
                <span className="font-anton text-sm uppercase tracking-wider">
                  Alerjen & Pişirme Bilgilendirmesi
                </span>
              </span>
              <MaterialIcon name="chevron_right" className="text-base text-neutral-400" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
