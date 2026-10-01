'use client';

import Link from 'next/link';

import { formatTryMinor } from '../../lib/money';
import type { Favorite } from '../../lib/storefront/favorites';

export function FavoritesSection({
  favorites,
  emptyLabel = 'Henüz favori burger yok.',
}: {
  favorites: Favorite[];
  emptyLabel?: string;
}) {
  if (favorites.length === 0) {
    return (
      <p className="font-body-md text-on-surface-variant" data-ff-favorites-empty>
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-ff-favorites>
      {favorites.map((favorite) => {
        const product = favorite.product;
        const href = product?.slug ? `/products/${product.slug}` : `/products/${favorite.productId}`;
        const unavailable = !product || !product.isAvailable;
        return (
          <li key={favorite.id} className="rounded-xl bg-surface-container p-space-md min-w-0">
            <Link href={href} className="flex gap-3 items-center" data-ff-favorite-card>
              {product?.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-surface-container-high shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-label-lg uppercase truncate">{product?.name ?? 'Ürün'}</p>
                {unavailable ? (
                  <p className="font-body-sm text-error">Şu an menüde yok</p>
                ) : product ? (
                  <p className="font-body-sm text-secondary-container">
                    {formatTryMinor(product.basePriceMinor, product.currency)}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
