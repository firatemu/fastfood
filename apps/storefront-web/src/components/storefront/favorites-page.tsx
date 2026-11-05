'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { fetchFavorites, removeFavorite, type Favorite } from '../../lib/storefront/favorites';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

/**
 * Favorites.
 *
 * The one product-forward screen in the account area, and it earns that: the
 * job here is to look at products and act on them, so the instrument is a tile
 * grid rather than a ledger. Availability is a tag, not a red line of prose, so
 * an unavailable item still reads as a row of the same list rather than an
 * apology.
 *
 * Removing a favourite is not confirmed: it is one tap to undo from the product
 * page, and asking about every reversible action trains people to dismiss the
 * dialog that matters — the one on the address book.
 */
export function FavoritesPage() {
  const { toast } = useAccountUi();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setFavorites(await fetchFavorites());
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }, []);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, [load]);

  const remove = useCallback(
    async (id: string, label: string) => {
      if (removingId) return;
      setRemovingId(id);
      setError(null);
      try {
        await removeFavorite(id);
        // Drop the tile only after the server confirms, so a failed call never
        // leaves the list claiming something is gone when it is not.
        setFavorites((rows) => rows.filter((row) => row.id !== id));
        toast.ok('Favorilerden çıkarıldı.', label);
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        toast.error('Favori kaldırılamadı.', message);
      } finally {
        setRemovingId(null);
      }
    },
    [removingId, toast],
  );

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return (
      <ShopError title="Favoriler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
    );
  }

  const available = favorites.filter((row) => row.product?.isAvailable).length;

  return (
    <AccountShell
      surface="favorites"
      eyebrow="Ayrıcalıklar & Tercihler"
      title="Favori Lezzetlerim"
      description={
        favorites.length === 0
          ? 'En sevdiğin lezzetleri kalp butonuna dokunarak buraya kaydedebilir, tek tıkla sepete ekleyebilirsin.'
          : `${favorites.length} kayıtlı favori lezzet · ${available} tanesi şu an şubende siparişe hazır.`
      }
      actions={
        <Link href="/" className="ff-btn ff-btn-primary">
          <MaterialIcon name="restaurant_menu" />
          Menüyü İncele
        </Link>
      }
    >
      {error ? (
        <div className="ff-notice mb-4" data-tone="danger" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="ff-card">
        <div className="ff-card-header">
          <div>
            <h2 className="ff-card-title">
              <MaterialIcon name="favorite" className="text-primary" />
              Kayıtlı Favori Ürünlerim
            </h2>
            <p className="ff-card-desc">
              {favorites.length === 0
                ? 'Henüz favorilerine bir lezzet eklemedin.'
                : 'Ürünlere dokunarak detay sayfasına gidebilir veya hızlıca sipariş verebilirsin.'}
            </p>
          </div>
          {favorites.length > 0 ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-white">
              {favorites.length} Ürün
            </span>
          ) : null}
        </div>

        <div>
          {favorites.length === 0 ? (
            <div className="ff-empty" data-ff-favorites-empty>
              <MaterialIcon name="favorite_border" />
              <p className="ff-empty-title">Favori listen henüz boş</p>
              <p className="ff-empty-text">
                Menüdeki nefis burgerler, çıtır atıştırmalıklar ve özel soslar arasında beğendiklerini kalp ikonuna tıklayarak buraya kaydedebilirsin.
              </p>
              <Link href="/" className="ff-btn ff-btn-primary mt-2">
                <MaterialIcon name="lunch_dining" />
                Menüyü Keşfet
              </Link>
            </div>
          ) : (
            <ul className="ff-tile-grid" data-ff-favorites>
              {favorites.map((favorite) => (
                <FavoriteTile
                  key={favorite.id}
                  favorite={favorite}
                  busy={removingId === favorite.id}
                  onRemove={() => void remove(favorite.id, favorite.product?.name ?? 'Ürün')}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </AccountShell>
  );
}

function FavoriteTile(props: { favorite: Favorite; busy: boolean; onRemove: () => void }) {
  const { favorite } = props;
  const product = favorite.product;
  const href = product?.slug ? `/products/${product.slug}` : `/products/${favorite.productId}`;
  const unavailable = !product || !product.isAvailable;
  const name = product?.name ?? 'Ürün';

  return (
    <li
      className="ff-tile"
      data-ff-favorite-card
      data-ff-favorite-available={unavailable ? 'false' : 'true'}
      data-unavailable={unavailable ? 'true' : 'false'}
    >
      <div className="ff-tile-media">
        {product?.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={name}
            loading="lazy"
            data-unavailable={unavailable ? 'true' : 'false'}
          />
        ) : null}
        {unavailable ? (
          <span className="ff-tag ff-tile-badge" data-tone="warn">
            Menüde yok
          </span>
        ) : null}
        {/*
          A sibling of the product link, never nested inside it: a link inside a
          link is invalid HTML and makes the tile ambiguous to activate.
        */}
        <button
          type="button"
          className="ff-icon-btn ff-tile-remove"
          disabled={props.busy}
          onClick={props.onRemove}
          aria-label={`${name} favorilerden çıkar`}
          title="Favorilerden çıkar"
        >
          <MaterialIcon name="heart_broken" />
        </button>
      </div>

      <Link href={href} className="ff-tile-body">
        <span className="ff-tile-name">{name}</span>
        <span className="ff-tile-meta">{unavailable ? 'Şu an menüde yok' : 'Menüde'}</span>
        <span className="ff-tile-price" style={{ marginTop: '0.375rem' }}>
          {product ? formatTryMinor(product.basePriceMinor, product.currency) : '—'}
        </span>
      </Link>
    </li>
  );
}
