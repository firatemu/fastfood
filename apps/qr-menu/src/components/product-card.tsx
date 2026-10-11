'use client';

import Image from 'next/image';

import { formatPriceRange } from '../lib/format';
import type { QrMenuProduct } from '../lib/types';

interface ProductCardProps {
  product: QrMenuProduct;
  onOpen: (slug: string) => void;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-pill border border-line bg-shell px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
  const variantCount = product.variants.length;
  const extrasCount = product.modifierGroups.reduce(
    (total, group) => total + group.modifiers.length,
    0,
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(product.slug)}
      data-qr-card={product.slug}
      aria-label={`${product.name} — ürün detayı`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-paper text-left transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift focus-visible:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-shell">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-widest text-ink-faint uppercase">
            {product.categoryName}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="qr-display text-base leading-tight text-ink">{product.name}</h3>

        {product.description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{product.description}</p>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-faint">Açıklama eklenmedi.</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {variantCount > 0 ? <Chip>{variantCount} porsiyon</Chip> : null}
          {extrasCount > 0 ? <Chip>{extrasCount} ekstra</Chip> : null}
        </div>

        <p className="qr-numeric text-base font-bold text-ink" data-qr-price>
          {formatPriceRange(product.priceMinMinor, product.priceMaxMinor, product.currency)}
        </p>
      </div>
    </button>
  );
}