import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { addFavorite, fetchFavorites, removeFavorite } from './favorites';
import { useCustomerSession } from './use-session';

const EMPTY: ReadonlyMap<string, string> = new Map();

interface FavoritesValue {
  /** productId -> favoriteId, because DELETE addresses the favorite, not the product. */
  byProduct: ReadonlyMap<string, string>;
  ready: boolean;
  /** Product ids with a toggle in flight, so one heart does not disable the rest. */
  busy: ReadonlySet<string>;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const FALLBACK: FavoritesValue = {
  byProduct: EMPTY,
  ready: false,
  busy: new Set(),
  isFavorite: () => false,
  toggle: () => undefined,
};

const FavoritesContext = createContext<FavoritesValue>(FALLBACK);

/**
 * Loads the customer's favorites once for the whole app. Every heart — menu
 * grid, search grid, product detail — reads this same map, so a screen showing
 * twenty products still costs a single `/me/favorites` request.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const session = useCustomerSession();
  const ownerId = session?.customerId ?? null;
  // Tagged with the customer it belongs to, so a different session can never
  // render the previous customer's favorites while its own load is in flight.
  const [loaded, setLoaded] = useState<{
    ownerId: string;
    map: ReadonlyMap<string, string>;
  } | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  // Guests get no request and no setState at all: their favorites are derived
  // as empty below, which keeps this effect free of synchronous state writes.
  useEffect(() => {
    if (!ownerId) return;
    let alive = true;
    void fetchFavorites()
      .then((rows) => {
        if (alive) setLoaded({ ownerId, map: new Map(rows.map((row) => [row.productId, row.id])) });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [ownerId]);

  const mine = loaded && loaded.ownerId === ownerId ? loaded.map : null;
  const ready = ownerId === null || mine !== null;
  const byProduct = mine ?? EMPTY;

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
            setLoaded((current) => {
              const map = new Map(current?.map ?? EMPTY);
              map.delete(productId);
              return { ownerId: ownerId ?? '', map };
            });
          } else {
            const created = await addFavorite(productId);
            setLoaded((current) => {
              const map = new Map(current?.map ?? EMPTY);
              map.set(productId, created.id);
              return { ownerId: ownerId ?? '', map };
            });
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
    [byProduct, ownerId],
  );

  const value = useMemo<FavoritesValue>(
    () => ({ byProduct, ready, busy, isFavorite, toggle }),
    [byProduct, ready, busy, isFavorite, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  return useContext(FavoritesContext);
}