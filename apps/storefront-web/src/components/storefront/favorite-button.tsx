'use client';

import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { addFavorite, fetchFavorites, removeFavorite } from '../../lib/storefront/favorites';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { MaterialIcon } from './material-icon';

export function FavoriteButton({ productId }: { productId: string }) {
  const authenticated = isCustomerAuthenticated();
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useDeferredLoad(() => {
    if (!authenticated) return;
    void fetchFavorites()
      .then((rows) => {
        setFavoriteId(rows.find((row) => row.productId === productId)?.id ?? null);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [authenticated, productId]);

  if (!authenticated || !ready) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (favoriteId) {
        await removeFavorite(favoriteId);
        setFavoriteId(null);
      } else {
        const created = await addFavorite(productId);
        setFavoriteId(created.id);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className="h-10 w-10 rounded-full bg-surface-container-high/90 text-primary-container flex items-center justify-center"
      aria-pressed={Boolean(favoriteId)}
      aria-label={favoriteId ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      data-ff-favorite-toggle
    >
      <MaterialIcon name="favorite" filled={Boolean(favoriteId)} className="text-xl" />
    </button>
  );
}
