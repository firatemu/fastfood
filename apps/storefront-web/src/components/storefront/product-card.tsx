'use client';

import Link from 'next/link';
import type { z } from 'zod';

import { formatTryMinor } from '../../lib/money';
import type { vitrineProductSchema } from '../../lib/schemas';

import { FavoriteButton } from './favorite-button';
import { MaterialIcon } from './material-icon';

type Product = z.infer<typeof vitrineProductSchema>;

export function ProductCard({
  product,
  onAdd,
  busy,
}: {
  product: Product;
  onAdd: (productId: string) => void;
  busy: boolean;
}) {
  const rating =
    product.averageRatingBps !== null ? (product.averageRatingBps / 100).toFixed(1) : null;
  const ratingLabel =
    rating && product.ratingCount > 0
      ? `${rating.replace('.', ',')} (${formatCount(product.ratingCount)})`
      : null;
  const customizeHref = `/products/${product.id}`;

  return (
    <article
      className="group relative flex flex-col rounded-2xl bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] overflow-hidden hover:border-amber-400/40 hover:shadow-[0_20px_45px_rgba(0,0,0,0.85),0_0_30px_rgba(254,179,0,0.12)] transition-all duration-300 shadow-xl"
      data-ff-product={product.id}
    >
      <div className="relative w-full h-56 bg-neutral-950/70 overflow-hidden flex items-center justify-center p-3">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-xl"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-white/[0.04]" />
        )}
        {product.badge ? (
          <div className="absolute top-3 left-3 flex gap-1">
            <span
              className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm uppercase backdrop-blur-md shadow-md ${badgeClass(product.badge)}`}
            >
              {product.badge}
            </span>
          </div>
        ) : null}
        {ratingLabel ? (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 border border-white/10 text-white font-label-sm text-label-sm flex items-center gap-1.5 backdrop-blur-md shadow-md">
            <MaterialIcon name="star" className="text-xs text-amber-400" filled />
            <span className="font-semibold">{ratingLabel}</span>
          </span>
        ) : null}
        {/* Bottom-right keeps the heart clear of the badge (top-left) and the
            rating (top-right), and it sits outside the customize link so the tap
            never navigates. */}
        <div className="absolute bottom-3 right-3 z-20">
          <FavoriteButton productId={product.id} />
        </div>
      </div>
      <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
        <div>
          <div className="flex justify-between items-baseline gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm text-white uppercase group-hover:text-amber-400 transition-colors font-bold tracking-tight">
              {product.name}
            </h3>
            <span className="font-anton text-2xl text-amber-400 shrink-0 drop-shadow-sm">
              {formatTryMinor(product.basePriceMinor, product.currency)}
            </span>
          </div>
          {product.description ? (
            <p className="font-body-sm text-body-sm text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {product.kcal !== null ? (
              <span className="px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] font-label-sm text-label-sm text-neutral-300">
                {product.kcal} kcal
              </span>
            ) : null}
            {product.weightGrams !== null ? (
              <span className="px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] font-label-sm text-label-sm text-neutral-300">
                {product.weightGrams}g Dana
              </span>
            ) : null}
            {product.volumeMl !== null ? (
              <span className="px-2.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] font-label-sm text-label-sm text-neutral-300">
                {product.volumeMl} ml
              </span>
            ) : null}
            {product.accentLabel ? (
              <span
                className={`px-2.5 py-0.5 rounded-md font-label-sm text-label-sm ${accentClass(product.accentLabel)}`}
              >
                {product.accentLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-space-sm pt-2">
          <Link
            href={customizeHref}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-label-md text-label-md uppercase tracking-wider text-center transition-all hover:border-white/20 font-semibold"
          >
            {customizeLabel(product)}
          </Link>
          <button
            type="button"
            className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-neutral-950 hover:brightness-110 shadow-[0_4px_16px_rgba(254,179,0,0.35)] transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label={`${product.name} sepete ekle`}
            disabled={busy || !product.isAvailable}
            onClick={() => onAdd(product.id)}
          >
            <MaterialIcon name="add_shopping_cart" className="text-xl" />
          </button>
        </div>
      </div>
    </article>
  );
}

function customizeLabel(product: Product): string {
  if (product.volumeMl !== null) return 'Boyut';
  if (product.badge === 'Yan Lezzet') return 'Porsiyon Seç';
  return 'Özelleştir';
}

function badgeClass(badge: string): string {
  if (badge === 'Şefin Tercihi' || badge === 'Aşırı Çıtır') {
    return 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-neutral-950 font-bold border border-amber-300/40';
  }
  if (badge === 'Gurme Seri') {
    return 'bg-gradient-to-r from-amber-400/90 to-yellow-500/90 text-neutral-950 font-bold border border-amber-200/50';
  }
  return 'bg-black/80 text-amber-400 font-bold border border-amber-400/30';
}

function accentClass(label: string): string {
  if (label.includes('2x')) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold';
  if (label.toLowerCase().includes('acı')) return 'bg-red-500/20 text-red-400 border border-red-500/30 font-semibold';
  return 'bg-white/[0.05] border border-white/[0.08] text-neutral-300';
}

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const s = k >= 10 ? String(Math.round(k)) : k.toFixed(1).replace('.', ',');
    return `${s}k`;
  }
  return String(n);
}
