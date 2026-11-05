'use client';

import { ApiError } from '@fastfood/api-client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import {
  configuredPreviewUnitMinor,
  defaultModifierSelection,
  incompleteRequiredGroupNames,
  requiredSelectionsMet,
  selectedConfigurationLabels,
  toggleModifierSelection,
  variantBasePriceMinor,
} from '../../lib/modifiers';
import { formatTryMinor, multiplyMinor } from '../../lib/money';
import { merchandiseSubtotalMinor } from '../../lib/pricing-preview';
import { GRILL_LIVE_LABEL, PDP_QUALITY_STRIP } from '../../lib/storefront/brand-copy';
import {
  addConfiguredProductToCart,
  addProductToCart,
  fetchCart,
  type Cart,
} from '../../lib/storefront/cart';
import { fetchProductDetail, type StorefrontProductDetail } from '../../lib/storefront/catalog';
import { formatRatingBps } from '../../lib/storefront/format';
import { useStorefrontCoupon } from '../../lib/storefront/use-storefront-coupon';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { FavoriteButton } from './favorite-button';
import { MaterialIcon } from './material-icon';
import { ModifierGroupCard } from './modifier-group';
import { OrderSummaryCard } from './order-summary-card';
import { ProductSpecChips } from './product-spec-chips';
import { QuantityStepper } from './quantity-stepper';
import { RemovalSelector } from './removal-selector';
import { ShopError, ShopSkeleton } from './shop-states';
import { useStorefrontChrome } from './storefront-chrome';
import { VariantSelector } from './variant-selector';

export function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const idOrSlug = params.id;
  const { refreshCart, home } = useStorefrontChrome();
  const [product, setProduct] = useState<StorefrontProductDetail | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'notfound'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [removals, setRemovals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [committedFingerprint, setCommittedFingerprint] = useState<string | null>(null);
  const [busyUpsell, setBusyUpsell] = useState<string | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  useDeferredLoad(() => {
    if (!idOrSlug) return;
    void (async () => {
      try {
        const [detail, currentCart] = await Promise.all([
          fetchProductDetail(idOrSlug),
          fetchCart().catch(() => null),
        ]);
        setProduct(detail);
        setCart(currentCart);
        setSelectedByGroup(defaultModifierSelection(detail.modifierGroups));
        setVariantId(
          detail.variants.length > 1
            ? (detail.variants[0]?.id ?? null)
            : (detail.variants[0]?.id ?? null),
        );
        setRemovals([]);
        setQuantity(1);
        setMediaIndex(0);
        setCommittedFingerprint(null);
        setFeedback(null);
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.status === 404 || err.envelope.error.code === 'NOT_FOUND')
        ) {
          setStatus('notfound');
          return;
        }
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [idOrSlug, nonce]);

  const groups = product?.modifierGroups ?? [];
  const variants = product?.variants ?? [];
  const previewUnit = product
    ? configuredPreviewUnitMinor(
        product.basePriceMinor,
        variants,
        variantId,
        groups,
        selectedByGroup,
      )
    : '0';
  const previewLine = product ? multiplyMinor(previewUnit, quantity) : '0';
  const currency = product?.currency ?? 'TRY';
  const configFingerprint = JSON.stringify({ quantity, variantId, selectedByGroup, removals });
  const showDraft = committedFingerprint !== configFingerprint;
  const canAdd =
    Boolean(product?.isAvailable) &&
    requiredSelectionsMet(groups, selectedByGroup, variants, variantId) &&
    !submitting &&
    showDraft;
  const variantName = variants.find((item) => item.id === variantId)?.name ?? null;
  const removalNames = (product?.removalOptions ?? [])
    .filter((item) => removals.includes(item.id))
    .map((item) => item.name);
  const chips = selectedConfigurationLabels(groups, selectedByGroup, variantName, removalNames);
  const incomplete = incompleteRequiredGroupNames(groups, selectedByGroup, variants, variantId);
  const cartMerchandise = merchandiseSubtotalMinor(cart?.lineItems ?? []);
  const combinedMerchandise = showDraft
    ? (BigInt(cartMerchandise) + BigInt(previewLine)).toString()
    : cartMerchandise;
  const coupon = useStorefrontCoupon(combinedMerchandise, currency);
  const rating = formatRatingBps(product?.averageRatingBps ?? null);
  const hero = product?.media[mediaIndex] ?? product?.media[0];
  const heroUrl =
    hero?.url?.includes('home-classic-burger') || product?.name?.toLowerCase().includes('classic')
      ? '/storefront/assets/brand/hero-smash-golden.jpg'
      : (hero?.url ?? '/storefront/assets/brand/hero-smash-golden.jpg');
  const kitchenLive = (home?.kitchenLiveCount ?? 0) > 0;

  const stepOffset = variants.length > 1 ? 1 : 0;
  const mediaAlts = useMemo(
    () => product?.media.map((item) => item.altText ?? item.alt ?? product.name) ?? [],
    [product],
  );

  async function refreshLocalCart() {
    const next = await fetchCart();
    setCart(next);
    await refreshCart();
  }

  async function addConfigured() {
    if (!product || !canAdd) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await addConfiguredProductToCart({
        productId: product.id,
        quantity,
        unitPriceMinorSnapshot: variantBasePriceMinor(product.basePriceMinor, variants, variantId),
        currencySnapshot: product.currency,
        productVariantId: variantId ?? undefined,
        modifierGroups: groups,
        selectedByGroup,
        removalIngredientIds: removals,
      });
      await refreshLocalCart();
      setCommittedFingerprint(configFingerprint);
      setFeedback({ kind: 'success', text: 'Sepete eklendi.' });
    } catch (err) {
      setFeedback({ kind: 'error', text: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function addUpsell(productId: string) {
    setBusyUpsell(productId);
    try {
      await addProductToCart(productId, 1);
      await refreshLocalCart();
    } catch (err) {
      setFeedback({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusyUpsell(null);
    }
  }

  if (status === 'loading' && !product) return <ShopSkeleton />;
  if (status === 'notfound') {
    return (
      <ShopError
        title="Ürün bulunamadı"
        message="Bu lezzet menüde yok veya yayından kalktı."
        onRetry={() => setNonce((n) => n + 1)}
      />
    );
  }
  if (status === 'error' || !product) {
    return (
      <ShopError
        title="Ürün yüklenemedi"
        message={error ?? 'Katalog yanıt vermedi.'}
        onRetry={() => setNonce((n) => n + 1)}
      />
    );
  }

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="product-detail">
      <div className="relative w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-md lg:py-space-xl">
        <div className="absolute top-12 left-1/4 w-96 h-96 bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-600/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
          <nav
            className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-wider text-neutral-400 min-w-0"
            aria-label="Sayfa konumu"
          >
            <Link href="/" className="hover:text-white transition-colors">
              Menü
            </Link>
            {product.categoryName ? (
              <>
                <MaterialIcon name="chevron_right" className="text-xs text-amber-400/60" />
                <span className="text-neutral-400 truncate">{product.categoryName}</span>
              </>
            ) : null}
            <MaterialIcon name="chevron_right" className="text-xs text-amber-400/60" />
            <span className="text-amber-400 font-semibold truncate">{product.name}</span>
          </nav>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/25 backdrop-blur-md">
            <MaterialIcon
              name="local_fire_department"
              className={`text-amber-400 text-sm ${kitchenLive ? 'animate-pulse' : ''}`}
            />
            <span className="font-label-sm text-xs text-amber-400 tracking-wider uppercase font-bold">
              {GRILL_LIVE_LABEL}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            <div className="relative w-full rounded-3xl bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-2xl p-5 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
                <div className="md:col-span-6 relative flex justify-center items-center rounded-2xl bg-gradient-to-b from-[#181d2c]/80 to-[#0e111a]/90 border border-white/[0.07] p-5 shadow-inner">
                  <div className="absolute top-3 right-3 z-20">
                    <FavoriteButton productId={product.id} />
                  </div>
                  <div className="absolute w-56 h-56 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
                  {heroUrl ? (
                    <img
                      className="relative z-10 w-full max-w-sm rounded-2xl object-cover shadow-[0_20px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(254,179,0,0.15)] hover:scale-105 transition-transform duration-500 ease-out aspect-square"
                      alt={mediaAlts[mediaIndex] ?? product.name}
                      src={heroUrl}
                    />
                  ) : (
                    <div className="relative z-10 w-full max-w-sm aspect-square rounded-2xl bg-white/[0.04]" />
                  )}
                  {product.badge ? (
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur-md shadow-md">
                      <MaterialIcon name="stars" className="text-amber-400 text-sm" />
                      <span className="font-label-sm text-xs uppercase tracking-wider text-amber-400 font-bold">
                        {product.badge}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="md:col-span-6 flex flex-col gap-3 min-w-0">
                  <div className="flex items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(254,179,0,0.8)]" />
                      <span className="font-label-sm text-xs uppercase text-amber-400 font-semibold tracking-widest truncate">
                        {product.eyebrow ?? product.categoryName ?? 'BURGER HOME'}
                      </span>
                    </div>
                    {rating ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-white shrink-0">
                        <MaterialIcon name="star" className="text-sm text-amber-400" filled />
                        <span className="font-anton text-sm text-amber-400">
                          {rating}
                        </span>
                        {(product.ratingCount ?? 0) > 0 ? (
                          <span className="font-body-sm text-xs text-neutral-400">
                            ({product.ratingCount})
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <h1 className="font-anton text-3xl md:text-4xl text-white uppercase tracking-wide leading-tight break-words">
                    {product.name}
                  </h1>
                  {product.description ? (
                    <p className="font-body-md text-sm md:text-base text-neutral-300 leading-relaxed">
                      {product.description}
                    </p>
                  ) : null}
                  <ProductSpecChips
                    kcal={product.kcal}
                    proteinGrams={product.proteinGrams}
                    allergens={product.allergens}
                  />
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/[0.08] gap-space-sm">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-xs text-neutral-400 uppercase tracking-wider">
                        Porsiyon Fiyatı
                      </span>
                      <span className="pdp-accent-price font-anton text-3xl md:text-4xl text-amber-400 drop-shadow-sm">
                        {formatTryMinor(previewUnit, currency)}
                      </span>
                    </div>
                    <QuantityStepper value={quantity} onChange={setQuantity} />
                  </div>
                  {!product.isAvailable ? (
                    <p className="font-body-sm text-xs text-red-400">Bu ürün seçilen şubede şu an yok.</p>
                  ) : null}
                </div>
              </div>
              {product.media.length > 1 ? (
                <div className="flex gap-2 mt-space-md overflow-x-auto">
                  {product.media.map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border transition-all ${
                        index === mediaIndex ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-white/10 opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => setMediaIndex(index)}
                    >
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <form
              className="flex flex-col gap-space-md"
              onSubmit={(event) => {
                event.preventDefault();
                void addConfigured();
              }}
            >
              <VariantSelector
                variants={variants}
                selectedId={variantId}
                onSelect={setVariantId}
                currency={currency}
                basePriceMinor={product.basePriceMinor}
                step={1}
              />
              {groups.map((group, index) => (
                <ModifierGroupCard
                  key={group.id}
                  group={group}
                  step={stepOffset + index + 1}
                  selectedIds={selectedByGroup[group.id] ?? []}
                  currency={currency}
                  onToggle={(modifierId) =>
                    setSelectedByGroup((current) =>
                      toggleModifierSelection(groups, current, group.id, modifierId),
                    )
                  }
                />
              ))}
              <RemovalSelector
                options={product.removalOptions}
                selectedIds={removals}
                step={stepOffset + groups.length + 1}
                onToggle={(id) =>
                  setRemovals((current) =>
                    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                  )
                }
              />
              <div className="flex items-center justify-between p-5 md:p-6 rounded-2xl bg-gradient-to-r from-[#181d2c]/95 via-[#121622]/95 to-[#0b0d14]/95 border border-amber-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(254,179,0,0.15)] gap-space-sm">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-xs text-neutral-400 uppercase tracking-wider">
                    Özelleştirilmiş Ürün Toplamı
                  </span>
                  <span className="pdp-accent-price font-anton text-2xl md:text-3xl text-amber-400 drop-shadow-sm">
                    {formatTryMinor(previewLine, currency)}
                  </span>
                </div>
                <button
                  className="pdp-cta flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 text-neutral-950 font-anton text-base md:text-lg uppercase tracking-wider shadow-[0_6px_25px_rgba(254,179,0,0.4)] active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
                  type="submit"
                  disabled={!canAdd}
                  data-ff-add-to-cart
                >
                  <MaterialIcon name="sync_saved_locally" className="text-xl" />
                  <span>{submitting ? 'Ekleniyor' : 'Sepete Ekle'}</span>
                </button>
              </div>
              {incomplete.length > 0 && product.isAvailable ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-400 text-xs font-semibold">
                  <MaterialIcon name="warning" className="text-base" />
                  <span>Lütfen zorunlu seçimleri tamamlayın: {incomplete.join(', ')}</span>
                </div>
              ) : null}
              {feedback ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
                  <p
                    className={
                      feedback.kind === 'success' ? 'text-secondary-container' : 'text-error'
                    }
                  >
                    {feedback.text}
                  </p>
                  {feedback.kind === 'success' ? (
                    <div className="flex flex-wrap gap-space-sm">
                      <Link
                        href="/"
                        className="font-label-sm text-label-sm uppercase text-neutral-400 hover:text-white"
                      >
                        Alışverişe devam et
                      </Link>
                      <Link
                        href="/cart"
                        className="font-label-sm text-label-sm uppercase text-amber-400 hover:underline font-bold"
                      >
                        Sepete git
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
              {PDP_QUALITY_STRIP.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#12151f]/85 border border-white/[0.08] backdrop-blur-xl hover:border-amber-400/30 transition-all shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    <MaterialIcon name={item.icon} className="text-xl" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-anton text-sm text-white uppercase tracking-wide">
                      {item.title}
                    </span>
                    <span className="font-body-sm text-xs text-neutral-400 line-clamp-1">
                      {item.body}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-24">
            <OrderSummaryCard
              lines={cart?.lineItems ?? []}
              currency={currency}
              merchandiseMinor={combinedMerchandise}
              discountMinor={coupon.discountMinor}
              deliveryWaived={coupon.deliveryWaived}
              couponCode={coupon.code}
              onCouponCode={coupon.setCode}
              couponStatus={coupon.status}
              couponMessage={coupon.message}
              onApplyCoupon={coupon.apply}
              ctaHref="/cart"
              ctaLabel="Sepete Git"
              lineCountLabel={`${(cart?.lineItems.length ?? 0) + (showDraft ? 1 : 0)} Kalem`}
              upsell={product.recommendations}
              onAddUpsell={(id) => void addUpsell(id)}
              busyId={busyUpsell}
              draft={
                showDraft ? (
                  <div className="flex flex-col p-3.5 rounded-xl bg-[#0d1017] border border-amber-500/30 gap-2 shadow-inner">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-white/10 overflow-hidden shrink-0">
                          {heroUrl ? (
                            <img src={heroUrl} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-md text-sm text-white font-semibold break-words">
                            {product.name}
                          </span>
                          <span className="font-body-sm text-xs text-amber-400 font-medium">
                            Özelleştirilmiş
                          </span>
                        </div>
                      </div>
                      <span className="font-anton text-base text-amber-400 shrink-0">
                        {formatTryMinor(previewLine, currency)}
                      </span>
                    </div>
                    {chips.length > 0 ? (
                      <div className="flex flex-wrap gap-1 text-[11px] font-body-sm text-neutral-400 pl-2.5 border-l-2 border-amber-400/50">
                        {chips.map((chip, index) => (
                          <span
                            key={`${chip.label}-${index}`}
                            className={chip.priced ? 'text-amber-400 font-semibold' : undefined}
                          >
                            {index > 0 ? '• ' : ''}
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-white/[0.06]">
                      <span>Adet: <strong className="text-white font-anton">{quantity}</strong></span>
                      <span className="text-amber-400/80 text-[11px]">Sipariş Taslağı</span>
                    </div>
                  </div>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
