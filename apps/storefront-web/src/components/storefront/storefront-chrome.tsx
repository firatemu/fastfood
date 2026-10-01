'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { subscribeCartChanged } from '../../lib/cart-events';
import { errorMessage } from '../../lib/load-state';
import { cartItemCount, fetchCart } from '../../lib/storefront/cart';
import { fetchStorefrontHome, type StorefrontHome } from '../../lib/storefront/home';
import { useDeferredLoad } from '../../lib/use-deferred-load';

type ChromeStatus = 'loading' | 'ready' | 'error';

interface ChromeValue {
  home: StorefrontHome | null;
  status: ChromeStatus;
  error: string | null;
  cartCount: number;
  categoryId: string | null;
  query: string;
  reload: () => void;
  setCategoryId: (id: string | null) => void;
  setQuery: (q: string) => void;
  refreshCart: () => Promise<void>;
}

const ChromeContext = createContext<ChromeValue | null>(null);

export function StorefrontChromeProvider({ children }: { children: ReactNode }) {
  const [home, setHome] = useState<StorefrontHome | null>(null);
  const [status, setStatus] = useState<ChromeStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [nonce, setNonce] = useState(0);

  const load = useCallback(async () => {
    try {
      const payload = await fetchStorefrontHome({
        categoryId: categoryId ?? undefined,
        q: query || undefined,
      });
      setHome(payload);
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [categoryId, query]);

  useDeferredLoad(() => {
    void load();
  }, [load, nonce]);

  const refreshCart = useCallback(async () => {
    try {
      const cart = await fetchCart();
      setCartCount(cartItemCount(cart));
    } catch {
      setCartCount(0);
    }
  }, []);

  useDeferredLoad(() => {
    void refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    return subscribeCartChanged(() => {
      void refreshCart();
    });
  }, [refreshCart]);

  const value = useMemo<ChromeValue>(
    () => ({
      home,
      status,
      error,
      cartCount,
      categoryId,
      query,
      reload: () => setNonce((n) => n + 1),
      setCategoryId,
      setQuery,
      refreshCart,
    }),
    [home, status, error, cartCount, categoryId, query, refreshCart],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useStorefrontChrome(): ChromeValue {
  const ctx = useContext(ChromeContext);
  if (!ctx) {
    throw new Error('useStorefrontChrome must be used within StorefrontChromeProvider');
  }
  return ctx;
}
