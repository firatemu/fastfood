'use client';

import Link from 'next/link';

import { formatDeltaMinor, formatTryMinor } from '../../lib/money';
import { lineSubtotalMinor } from '../../lib/pricing-preview';
import type { Cart } from '../../lib/storefront/cart';

import { MaterialIcon } from './material-icon';
import { QuantityStepper } from './quantity-stepper';

type Line = Cart['lineItems'][number];

export function CartLineCard({
  line,
  onQuantity,
  onRemove,
  busy,
  compact = false,
}: {
  line: Line;
  onQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const name = line.productName ?? 'Ürün';
  const customized =
    line.modifiers.length > 0 || line.removals.length > 0 || Boolean(line.variantName);
  const extrasMinor = line.modifiers.reduce(
    (acc, mod) => acc + BigInt(mod.priceDeltaMinorSnapshot),
    0n,
  );
  const extrasTotal = (extrasMinor * BigInt(Math.max(0, line.quantity))).toString();
  const baseTotal = (
    BigInt(line.unitPriceMinorSnapshot) * BigInt(Math.max(0, line.quantity))
  ).toString();
  const total = lineSubtotalMinor(line.unitPriceMinorSnapshot, line.modifiers, line.quantity);
  const unavailable = line.isAvailable === false;

  if (compact) {
    return (
      <div
        className="flex flex-col p-space-sm rounded-xl bg-surface-container-low gap-2"
        data-ff-cart-line={line.id}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
              {line.imageUrl ? (
                <img className="w-full h-full object-cover" alt="" src={line.imageUrl} />
              ) : (
                <MaterialIcon name="lunch_dining" className="text-on-surface-variant" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface break-words">
                {name}
              </span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                Adet: {line.quantity}
              </span>
            </div>
          </div>
          <span className="font-label-md text-label-md text-on-surface shrink-0">
            {formatTryMinor(total, line.currencySnapshot)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-surface-container-low hover:bg-surface-container transition-all duration-300 rounded-xl p-space-md flex flex-col sm:flex-row gap-space-md shadow-sm"
      data-ff-cart-line={line.id}
    >
      <div className="relative w-full sm:w-32 sm:h-32 h-44 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest">
        {line.imageUrl ? (
          <img
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt=""
            src={line.imageUrl}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MaterialIcon name="lunch_dining" className="text-4xl text-on-surface-variant" />
          </div>
        )}
        {customized ? (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[10px] uppercase font-bold tracking-wide shadow-md">
            Özel Seçim
          </span>
        ) : null}
      </div>
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-tight truncate">
              {name}
            </h2>
            {onRemove ? (
              <button
                className="text-on-surface-variant/60 hover:text-error transition-colors p-1 disabled:opacity-40"
                title="Ürünü Çıkar"
                type="button"
                disabled={busy}
                onClick={onRemove}
                aria-label="Ürünü çıkar"
              >
                <MaterialIcon name="close" className="text-lg" />
              </button>
            ) : null}
          </div>
          {line.variantName ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
              {line.variantName}
            </p>
          ) : null}
          {line.modifiers.length > 0 || line.removals.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {line.modifiers.map((mod) => (
                <span
                  key={mod.modifierId}
                  className="px-2 py-0.5 rounded bg-surface-container-high text-secondary-container font-label-sm text-[11px] font-medium flex items-center gap-1"
                >
                  <MaterialIcon name="add_circle" className="text-xs" />
                  {mod.name ?? 'Ekstra'}
                  {BigInt(mod.priceDeltaMinorSnapshot) > 0n
                    ? ` (${formatDeltaMinor(mod.priceDeltaMinorSnapshot, line.currencySnapshot)})`
                    : ''}
                </span>
              ))}
              {line.removals.map((removal) => (
                <span
                  key={removal.ingredientId}
                  className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] flex items-center gap-1"
                >
                  <MaterialIcon name="remove_circle" className="text-xs text-error" />
                  {removal.name ?? 'Çıkarma'}
                </span>
              ))}
            </div>
          ) : null}
          {unavailable ? (
            <p className="font-body-sm text-xs text-error">Bu ürün şu an bu şubede yok.</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between pt-space-sm mt-space-xs gap-space-sm">
          <Link
            href={`/products/${line.productId}`}
            className="font-label-sm text-label-sm text-secondary hover:text-secondary-container transition-colors inline-flex items-center gap-1"
          >
            <MaterialIcon name="tune" className="text-xs" />
            Özelleştirmeyi Düzenle
          </Link>
          <div className="flex items-center gap-space-md">
            {onQuantity ? (
              <QuantityStepper value={line.quantity} onChange={onQuantity} size="compact" />
            ) : (
              <span className="font-label-sm text-on-surface-variant">Adet: {line.quantity}</span>
            )}
            <div className="text-right min-w-[70px]">
              <span
                className={`font-headline-sm text-headline-sm ${
                  extrasMinor > 0n ? 'text-secondary-container' : 'text-on-surface'
                }`}
              >
                {formatTryMinor(total, line.currencySnapshot)}
              </span>
              {extrasMinor > 0n ? (
                <span className="block font-label-sm text-[10px] text-on-surface-variant">
                  {formatTryMinor(baseTotal, line.currencySnapshot)} +{' '}
                  {formatTryMinor(extrasTotal, line.currencySnapshot)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
