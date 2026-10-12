'use client';

import { useStorefrontFavorites } from './favorites-provider';
import { MaterialIcon } from './material-icon';

/**
 * Heart toggle for one product. State lives in `FavoritesProvider`, so mounting
 * a heart on every menu card costs one shared `/me/favorites` request rather
 * than one request per card.
 */
export function FavoriteButton({ productId }: { productId: string }) {
  const { authenticated, ready, busy, isFavorite, toggle } = useStorefrontFavorites();
  const favorite = isFavorite(productId);
  const pending = busy.has(productId);

  // A guest owns no favorites, so the control stays hidden — the same rule the
  // product detail page has always applied.
  if (!authenticated || !ready) return null;

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      disabled={pending}
      className="h-8 w-8 rounded-full bg-surface-container-high/90 text-primary-container flex items-center justify-center"
      aria-pressed={favorite}
      aria-label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      data-ff-favorite-toggle
    >
      <MaterialIcon name="favorite" filled={favorite} size={16} />
    </button>
  );
}