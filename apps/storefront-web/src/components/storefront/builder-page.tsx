'use client';

import Link from 'next/link';
import { useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import {
  configuredPreviewUnitMinor,
  defaultModifierSelection,
  incompleteRequiredGroupNames,
  requiredSelectionsMet,
  selectedConfigurationLabels,
  toggleModifierSelection,
} from '../../lib/modifiers';
import { formatTryMinor, multiplyMinor } from '../../lib/money';
import { merchandiseSubtotalMinor } from '../../lib/pricing-preview';
import { BUILDER_BANNER } from '../../lib/storefront/brand-copy';
import { addConfiguredProductToCart, fetchCart, type Cart } from '../../lib/storefront/cart';
import { fetchBuilderProduct, type BuilderProduct } from '../../lib/storefront/discover';
import { useStorefrontCoupon } from '../../lib/storefront/use-storefront-coupon';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { MaterialIcon } from './material-icon';
import { ModifierGroupCard } from './modifier-group';
import { OrderSummaryCard } from './order-summary-card';
import { QuantityStepper } from './quantity-stepper';
import { RemovalSelector } from './removal-selector';
import { ShopError, ShopSkeleton } from './shop-states';
import { useStorefrontChrome } from './storefront-chrome';

export function BuilderPage() {
  const { refreshCart } = useStorefrontChrome();
  const [product, setProduct] = useState<BuilderProduct | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'notfound'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [removals, setRemovals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nonce, setNonce] = useState(0);

  useDeferredLoad(() => {
    void (async () => {
      try {
        const [detail, currentCart] = await Promise.all([
          fetchBuilderProduct(),
          fetchCart().catch(() => null),
        ]);
        setProduct(detail);
        setCart(currentCart);
        setSelectedByGroup(defaultModifierSelection(detail.modifierGroups));
        setRemovals([]);
        setQuantity(1);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [nonce]);

  const groups = product?.modifierGroups ?? [];
  const previewUnit = product
    ? configuredPreviewUnitMinor(product.basePriceMinor, [], null, groups, selectedByGroup)
    : '0';
  const previewLine = product ? multiplyMinor(previewUnit, quantity) : '0';
  const currency = product?.currency ?? 'TRY';
  const canAdd =
    Boolean(product?.isAvailable) &&
    requiredSelectionsMet(groups, selectedByGroup, [], null) &&
    !submitting;
  const chips = selectedConfigurationLabels(groups, selectedByGroup, null, []);
  const incomplete = incompleteRequiredGroupNames(groups, selectedByGroup, [], null);
  const cartMerchandise = merchandiseSubtotalMinor(cart?.lineItems ?? []);
  const combinedMerchandise = (BigInt(cartMerchandise) + BigInt(previewLine)).toString();
  const coupon = useStorefrontCoupon(combinedMerchandise, currency);

  async function addConfigured() {
    if (!product || !canAdd) return;
    setSubmitting(true);
    try {
      const next = await addConfiguredProductToCart({
        productId: product.id,
        quantity,
        unitPriceMinorSnapshot: previewUnit,
        currencySnapshot: currency,
        modifierGroups: groups,
        selectedByGroup,
        removalIngredientIds: removals,
      });
      setCart(next);
      await refreshCart();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading' && !product) return <ShopSkeleton />;
  if (status === 'error' || !product) {
    return (
      <ShopError
        title="Oluşturucu yok"
        message={error ?? 'Özel burger ürünü tanımlı değil.'}
        onRetry={() => setNonce((n) => n + 1)}
      />
    );
  }

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="builder">
      <div className="relative w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-md lg:py-space-xl">
        <p className="font-label-sm uppercase text-primary-container">{BUILDER_BANNER.kicker}</p>
        <h1 className="font-headline-lg text-headline-lg uppercase mt-1">{product.name}</h1>
        {product.description ? (
          <p className="font-body-md text-on-surface-variant mt-2 max-w-3xl">{product.description}</p>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start mt-space-lg">
          <form
            className="lg:col-span-8 flex flex-col gap-space-md"
            onSubmit={(event) => {
              event.preventDefault();
              void addConfigured();
            }}
          >
            {groups.map((group, index) => (
              <ModifierGroupCard
                key={group.id}
                group={group}
                step={index + 1}
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
              step={groups.length + 1}
              onToggle={(id) =>
                setRemovals((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
              }
            />
            <div className="flex items-center justify-between p-space-md rounded-2xl bg-surface-container-high gap-space-sm">
              <div>
                <p className="font-label-sm uppercase text-on-surface-variant">Önizleme</p>
                <p className="font-headline-sm text-primary">{formatTryMinor(previewLine, currency)}</p>
                {chips.length > 0 ? (
                  <p className="font-body-sm text-on-surface-variant mt-1">
                    {chips.map((chip) => chip.label).join(' · ')}
                  </p>
                ) : null}
              </div>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>
            <button
              className="pdp-cta flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl bg-primary-container text-on-primary-container font-label-md uppercase disabled:opacity-40"
              type="submit"
              disabled={!canAdd}
              data-ff-add-to-cart
            >
              <MaterialIcon name="sync_saved_locally" className="text-lg" />
              {submitting ? 'Ekleniyor' : 'Sepete Ekle'}
            </button>
            {!product.isAvailable ? (
              <p className="font-body-sm text-error">Bu ürün seçilen şubede yok.</p>
            ) : incomplete.length > 0 ? (
              <p className="font-body-sm text-on-surface-variant" data-ff-builder-incomplete>
                Seçmen gerekenler: {incomplete.join(', ')}
              </p>
            ) : null}
          </form>
          <div className="lg:col-span-4 lg:sticky lg:top-24">
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
              onApplyCoupon={() => void coupon.apply()}
              ctaHref="/cart"
              ctaLabel="Sepete git"
              lineCountLabel={`${(cart?.lineItems.length ?? 0) + 1} kalem`}
              draft={
                <p className="font-body-sm text-on-surface-variant">
                  Taslak: {product.name} × {quantity} — {formatTryMinor(previewLine, currency)}
                </p>
              }
            />
            <Link href="/" className="block mt-space-sm font-label-sm uppercase text-on-surface-variant">
              Menüye dön
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
