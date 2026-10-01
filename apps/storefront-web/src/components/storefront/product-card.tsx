'use client';

import Link from 'next/link';
import type { z } from 'zod';

import { formatTryMinor } from '../../lib/money';
import type { vitrineProductSchema } from '../../lib/schemas';

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
      className="group relative flex flex-col rounded-xl bg-surface-container overflow-hidden hover:bg-surface-container-high transition-all duration-300 shadow-lg"
      data-ff-product={product.id}
    >
      <div className="relative w-full h-56 bg-surface-container-lowest overflow-hidden flex items-center justify-center p-space-sm">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-lg"
          />
        ) : (
          <div className="w-full h-full rounded-lg bg-surface-container-high" />
        )}
        {product.badge ? (
          <div className="absolute top-3 left-3 flex gap-1">
            <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm uppercase backdrop-blur-md ${badgeClass(product.badge)}`}>
              {product.badge}
            </span>
          </div>
        ) : null}
        {ratingLabel ? (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-surface-container-lowest/90 text-on-surface font-label-sm text-label-sm flex items-center gap-1 backdrop-blur-md">
            <MaterialIcon name="star" className="text-xs text-primary-container" filled />
            {ratingLabel}
          </span>
        ) : null}
      </div>
      <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
        <div>
          <div className="flex justify-between items-baseline gap-space-sm">
            <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase group-hover:text-secondary transition-colors">
              {product.name}
            </h3>
            <span className="font-headline-sm text-headline-sm text-secondary-container shrink-0">
              {formatTryMinor(product.basePriceMinor, product.currency)}
            </span>
          </div>
          {product.description ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
              {product.description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {product.kcal !== null ? (
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant">
                {product.kcal} kcal
              </span>
            ) : null}
            {product.weightGrams !== null ? (
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant">
                {product.weightGrams}g Dana
              </span>
            ) : null}
            {product.volumeMl !== null ? (
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant">
                {product.volumeMl} ml
              </span>
            ) : null}
            {product.accentLabel ? (
              <span
                className={`px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm ${accentClass(product.accentLabel)}`}
              >
                {product.accentLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-space-sm pt-2">
          <Link
            href={customizeHref}
            className="flex-1 py-2.5 rounded-lg bg-surface-container-highest text-on-surface font-label-md text-label-md uppercase hover:bg-surface-bright transition-all text-center"
          >
            {customizeLabel(product)}
          </Link>
          <button
            type="button"
            className="p-2.5 rounded-lg bg-secondary-container text-on-secondary-container hover:brightness-110 shadow-md transition-all flex items-center justify-center disabled:opacity-40"
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
    return 'bg-secondary-container/20 text-secondary-container';
  }
  if (badge === 'Gurme Seri') return 'bg-primary-container/20 text-primary-container';
  return 'bg-surface-container-lowest/80 text-primary';
}

function accentClass(label: string): string {
  if (label.includes('2x')) return 'text-secondary';
  if (label.toLowerCase().includes('acı')) return 'text-primary';
  return 'text-on-surface-variant';
}

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const s = k >= 10 ? String(Math.round(k)) : k.toFixed(1).replace('.', ',');
    return `${s}k`;
  }
  return String(n);
}
