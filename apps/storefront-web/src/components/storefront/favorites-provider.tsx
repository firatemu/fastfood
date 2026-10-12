'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { addFavorite, fetchFavorites, removeFavorite } from '../../lib/storefront/favorites';
import { useDeferredLoad } from '../../lib/use-deferred-load';

interface FavoritesValue {
  /** productId -> favoriteId, because DELETE addresses the favorite, not the product. */
  byProduct: ReadonlyMap<string, string>;
  authenticated: boolean;
  ready: boolean;
  /** Product ids with a toggle in flight, so one heart does not disable the rest. */
  busy: ReadonlySet<string>;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const EMPTY: FavoritesValue = {
  byProduct: new Map(),
  authenticated: false,
  ready: false,
  busy: new Set(),
  isFavorite: () => false,
  toggle: () => undefined,
};

const FavoritesContext = createContext<FavoritesValue>(EMPTY);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [byProduct, setByProduct] = useState<ReadonlyMap<string, string>>(new Map());
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  // One /me/favorites call for the whole page, not one per heart. The menu,
  // search and home catalog all render every product, so a per-button fetch
  // turned a single screen into one request per card.
  useDeferredLoad(() => {
    const authed = isCustomerAuthenticated();
    setAuthenticated(authed);
    if (!authed) {
      setReady(true);
      return;
    }
    void fetchFavorites()
      .then((rows) => setByProduct(new Map(rows.map((row) => [row.productId, row.id]))))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const isFavorite = useCallback((productId: string) => byProduct.has(productId), [byProduct]);

  const toggle = useCallback(
    (productId: string) => {
      setBusy((current) => {
        if (current.has(productId)) return current;
        const next = new Set(current);
        next.add(productId);
        return next;
      });

      void (async () => {
        const existing = byProduct.get(productId);
        try {
          if (existing) {
            await removeFavorite(existing);
            setByProduct((current) => {
              const next = new Map(current);
              next.delete(productId);
              return next;
            });
          } else {
            const created = await addFavorite(productId);
            setByProduct((current) => new Map(current).set(productId, created.id));
          }
        } catch {
          // Leave the heart where it was. The server stays the source of truth,
          // so the next toggle retries against real state instead of a guess.
        } finally {
          setBusy((current) => {
            const next = new Set(current);
            next.delete(productId);
            return next;
          });
        }
      })();
    },
    [byProduct],
  );

  const value = useMemo<FavoritesValue>(
    () => ({ byProduct, authenticated, ready, busy, isFavorite, toggle }),
    [byProduct, authenticated, ready, busy, isFavorite, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useStorefrontFavorites(): FavoritesValue {
  return useContext(FavoritesContext);
}