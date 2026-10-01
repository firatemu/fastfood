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
import { addConfiguredProductToCart, addProductToCart, fetchCart, type Cart } from '../../lib/storefront/cart';
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
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [committedFingerprint, setCommittedFingerprint] = useState<string | null>(null);
  const [busyUpsell, setBusyUpsell] = useState<string | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  useDeferredLoad(() => {
    if (!idOrSlug) return;
    void (async () => {
      try {
        const [detail, currentCart] = await Promise.all([fetchProductDetail(idOrSlug), fetchCart().catch(() => null)]);
        setProduct(detail);
        setCart(currentCart);
        setSelectedByGroup(defaultModifierSelection(detail.modifierGroups));
        setVariantId(detail.variants.length > 1 ? detail.variants[0]?.id ?? null : detail.variants[0]?.id ?? null);
        setRemovals([]);
        setQuantity(1);
        setMediaIndex(0);
        setCommittedFingerprint(null);
        setFeedback(null);
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.envelope.error.code === 'NOT_FOUND')) {
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
        <div className="absolute top-12 left-1/4 w-96 h-96 bg-primary-container/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-secondary-container/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
          <nav
            className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant min-w-0"
            aria-label="Sayfa konumu"
          >
            <Link href="/" className="hover:text-on-surface transition-colors">
              Menü
            </Link>
            {product.categoryName ? (
              <>
                <MaterialIcon name="chevron_right" className="text-xs" />
                <span className="text-on-surface-variant/70 truncate">{product.categoryName}</span>
              </>
            ) : null}
            <MaterialIcon name="chevron_right" className="text-xs" />
            <span className="text-primary font-semibold truncate">{product.name}</span>
          </nav>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high/80 backdrop-blur-md">
            <MaterialIcon
              name="local_fire_department"
              className={`text-secondary-container text-sm ${kitchenLive ? 'animate-spin' : ''}`}
            />
            <span className="font-label-sm text-label-sm text-on-surface tracking-wide uppercase">
              {GRILL_LIVE_LABEL}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            <div className="relative w-full rounded-2xl bg-surface-container overflow-hidden shadow-2xl p-space-md lg:p-space-lg">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center">
                <div className="md:col-span-6 relative flex justify-center items-center">
                  <div className="absolute top-2 right-2 z-20">
                    <FavoriteButton productId={product.id} />
                  </div>
                  <div className="absolute w-56 h-56 rounded-full bg-primary-container/20 blur-2xl" />
                  {hero ? (
                    <img
                      className="relative z-10 w-full max-w-sm rounded-xl object-cover shadow-2xl hover:scale-105 transition-transform duration-500 ease-out aspect-square"
                      alt={mediaAlts[mediaIndex] ?? product.name}
                      src={hero.url}
                    />
                  ) : (
                    <div className="relative z-10 w-full max-w-sm aspect-square rounded-xl bg-surface-container-high" />
                  )}
                  {product.badge ? (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md">
                      <MaterialIcon name="stars" className="text-secondary-container text-sm" />
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
                        {product.badge}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="md:col-span-6 flex flex-col gap-space-xs min-w-0">
                  <div className="flex items-baseline justify-between gap-space-sm">
                    <span className="font-label-sm text-label-sm uppercase text-primary tracking-widest truncate">
                      {product.eyebrow ?? product.categoryName ?? 'BURGER HOME'}
                    </span>
                    {rating ? (
                      <div className="flex items-center gap-1 text-secondary-container shrink-0">
                        <MaterialIcon name="star" className="text-sm" filled />
                        <span className="font-label-md text-label-md text-on-surface">{rating}</span>
                        {(product.ratingCount ?? 0) > 0 ? (
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            ({product.ratingCount} değerlendirme)
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-wide leading-tight break-words">
                    {product.name}
                  </h1>
                  {product.description ? (
                    <p className="font-body-md text-body-md text-on-surface-variant">{product.description}</p>
                  ) : null}
                  <ProductSpecChips
                    kcal={product.kcal}
                    proteinGrams={product.proteinGrams}
                    allergens={product.allergens}
                  />
                  <div className="flex items-center justify-between pt-space-sm mt-space-xs border-t border-surface-bright/20 gap-space-sm">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                        Porsiyon Fiyatı
                      </span>
                      <span className="pdp-accent-price font-headline-md text-headline-md text-primary font-bold">
                        {formatTryMinor(previewUnit, currency)}
                      </span>
                    </div>
                    <QuantityStepper value={quantity} onChange={setQuantity} />
                  </div>
                  {!product.isAvailable ? (
                    <p className="font-body-sm text-error">Bu ürün seçilen şubede şu an yok.</p>
                  ) : null}
                </div>
              </div>
              {product.media.length > 1 ? (
                <div className="flex gap-2 mt-space-md overflow-x-auto">
                  {product.media.map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 ${
                        index === mediaIndex ? 'ring-2 ring-primary-container' : ''
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
                    setSelectedByGroup((current) => toggleModifierSelection(groups, current, group.id, modifierId))
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
              <div className="flex items-center justify-between p-space-md rounded-2xl bg-surface-container-high gap-space-sm">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                    Özelleştirilmiş Ürün Toplamı
                  </span>
                  <span className="pdp-accent-price font-headline-sm text-headline-sm text-primary">
                    {formatTryMinor(previewLine, currency)}
                  </span>
                </div>
                <button
                  className="pdp-cta flex items-center gap-2 px-space-lg py-3 rounded-xl bg-primary-container hover:brightness-110 text-on-primary-container font-label-md text-label-md uppercase tracking-wider shadow-lg shadow-primary-container/30 active:scale-[0.98] transition-all disabled:opacity-40"
                  type="submit"
                  disabled={!canAdd}
                  data-ff-add-to-cart
                >
                  <MaterialIcon name="sync_saved_locally" className="text-lg" />
                  <span>{submitting ? 'Ekleniyor' : 'Sepete Ekle'}</span>
                </button>
              </div>
              {incomplete.length > 0 && product.isAvailable ? (
                <p className="font-body-sm text-on-surface-variant">
                  Seçmen gerekenler: {incomplete.join(', ')}
                </p>
              ) : null}
              {feedback ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
                  <p className={feedback.kind === 'success' ? 'text-secondary-container' : 'text-error'}>
                    {feedback.text}
                  </p>
                  {feedback.kind === 'success' ? (
                    <div className="flex flex-wrap gap-space-sm">
                      <Link
                        href="/"
                        className="font-label-sm text-label-sm uppercase text-on-surface-variant hover:text-on-surface"
                      >
                        Alışverişe devam et
                      </Link>
                      <Link
                        href="/cart"
                        className="font-label-sm text-label-sm uppercase text-secondary-container hover:underline"
                      >
                        Sepete git
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm py-space-xs">
              {PDP_QUALITY_STRIP.map((item) => (
                <div key={item.title} className="flex items-center gap-space-xs p-3 rounded-xl bg-surface-container-low">
                  <MaterialIcon name={item.icon} className={item.iconClass} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface">{item.title}</span>
                    <span className="font-body-sm text-xs text-on-surface-variant">{item.body}</span>
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
                <div className="flex flex-col p-space-sm rounded-xl bg-surface-container-low gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
                        {hero ? (
                          <img src={hero.url} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface break-words">
                          {product.name}
                        </span>
                        <span className="font-body-sm text-xs text-secondary-container">Özelleştirilmiş</span>
                      </div>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface shrink-0">
                      {formatTryMinor(previewLine, currency)}
                    </span>
                  </div>
                  {chips.length > 0 ? (
                    <div className="flex flex-wrap gap-1 text-[11px] font-body-sm text-on-surface-variant/80 pl-2 border-l-2 border-primary/40">
                      {chips.map((chip, index) => (
                        <span key={`${chip.label}-${index}`} className={chip.priced ? 'text-primary-fixed-dim' : undefined}>
                          {index > 0 ? '• ' : ''}
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Adet: {quantity}</span>
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
