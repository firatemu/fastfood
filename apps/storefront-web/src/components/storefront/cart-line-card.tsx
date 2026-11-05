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
  const displayImageUrl =
    line.imageUrl?.includes('home-classic-burger') || line.productName?.toLowerCase().includes('classic')
      ? '/storefront/assets/brand/hero-smash-golden.jpg'
      : line.imageUrl;

  if (compact) {
    return (
      <div
        className="flex flex-col p-3 rounded-xl bg-white/[0.04] border border-white/10 gap-2"
        data-ff-cart-line={line.id}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {displayImageUrl ? (
                <img className="w-full h-full object-cover" alt="" src={displayImageUrl} />
              ) : (
                <MaterialIcon name="lunch_dining" className="text-amber-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-sm text-white font-semibold break-words">
                {name}
              </span>
              <span className="font-body-sm text-xs text-neutral-400">
                Adet: <strong className="text-white font-anton">{line.quantity}</strong>
              </span>
            </div>
          </div>
          <span className="font-anton text-base text-amber-400 shrink-0">
            {formatTryMinor(total, line.currencySnapshot)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] hover:border-amber-400/35 transition-all duration-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 shadow-xl"
      data-ff-cart-line={line.id}
    >
      <div className="relative w-full sm:w-32 sm:h-32 h-44 rounded-xl overflow-hidden shrink-0 bg-neutral-950/80 border border-white/10 p-2 flex items-center justify-center">
        {displayImageUrl ? (
          <img
            className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover:scale-105"
            alt=""
            src={displayImageUrl}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MaterialIcon name="lunch_dining" className="text-4xl text-amber-400/60" />
          </div>
        )}
        {customized ? (
          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-400 font-label-sm text-[10px] uppercase font-bold tracking-wider backdrop-blur-md shadow-md">
            Özel Seçim
          </span>
        ) : null}
      </div>
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-anton text-xl md:text-2xl text-white uppercase tracking-wide truncate group-hover:text-amber-400 transition-colors">
              {name}
            </h2>
            {onRemove ? (
              <button
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 cursor-pointer"
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
            <p className="font-body-sm text-sm text-neutral-400 font-medium line-clamp-1">
              {line.variantName}
            </p>
          ) : null}
          {line.modifiers.length > 0 || line.removals.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {line.modifiers.map((mod) => (
                <span
                  key={mod.modifierId}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-amber-400 font-label-sm text-xs font-semibold flex items-center gap-1.5"
                >
                  <MaterialIcon name="add_circle" className="text-xs text-amber-400" />
                  <span>{mod.name ?? 'Ekstra'}</span>
                  {BigInt(mod.priceDeltaMinorSnapshot) > 0n ? (
                    <span className="text-amber-300 font-anton">
                      ({formatDeltaMinor(mod.priceDeltaMinorSnapshot, line.currencySnapshot)})
                    </span>
                  ) : null}
                </span>
              ))}
              {line.removals.map((removal) => (
                <span
                  key={removal.ingredientId}
                  className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-label-sm text-xs flex items-center gap-1.5"
                >
                  <MaterialIcon name="remove_circle" className="text-xs text-red-400" />
                  <span>{removal.name ?? 'Çıkarma'}</span>
                </span>
              ))}
            </div>
          ) : null}
          {unavailable ? (
            <p className="font-body-sm text-xs text-red-400 font-semibold">Bu ürün şu an bu şubede yok.</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.06] gap-space-sm">
          <Link
            href={`/products/${line.productId}`}
            className="font-label-sm text-xs text-neutral-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 font-semibold"
          >
            <MaterialIcon name="tune" className="text-xs text-amber-400" />
            <span>Özelleştirmeyi Düzenle</span>
          </Link>
          <div className="flex items-center gap-4">
            {onQuantity ? (
              <QuantityStepper value={line.quantity} onChange={onQuantity} size="compact" />
            ) : (
              <span className="font-label-sm text-neutral-400">Adet: <strong className="text-white font-anton">{line.quantity}</strong></span>
            )}
            <div className="text-right min-w-[70px]">
              <span className="font-anton text-2xl text-amber-400 tracking-wide drop-shadow-sm">
                {formatTryMinor(total, line.currencySnapshot)}
              </span>
              {extrasMinor > 0n ? (
                <span className="block font-label-sm text-[10px] text-neutral-400">
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
