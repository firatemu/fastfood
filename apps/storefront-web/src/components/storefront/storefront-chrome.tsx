'use client';

import { usePathname } from 'next/navigation';
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
import {
  branchPreferenceStorage,
  readBranchPreference,
  writeBranchPreference,
} from '../../lib/storefront/branch-preference';
import { cartItemCount, fetchCart } from '../../lib/storefront/cart';
import { fetchStorefrontHome, type StorefrontHome } from '../../lib/storefront/home';
import { useDeferredLoad } from '../../lib/use-deferred-load';

type ChromeStatus = 'loading' | 'ready' | 'error';

interface ChromeValue {
  home: StorefrontHome | null;
  status: ChromeStatus;
  error: string | null;
  cartCount: number;
  branchId: string | null;
  categoryId: string | null;
  query: string;
  reload: () => void;
  setCategoryId: (id: string | null) => void;
  setBranchId: (id: string) => void;
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
  const [branchId, setBranchIdState] = useState<string | null>(null);
  const [branchReady, setBranchReady] = useState(false);
  const [query, setQuery] = useState('');
  const [nonce, setNonce] = useState(0);
  const pathname = usePathname();

  const load = useCallback(async () => {
    try {
      const payload = await fetchStorefrontHome({
        branchId: branchId ?? undefined,
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
  }, [branchId, categoryId, query]);

  // The stored branch is read before the first request so a returning customer
  // never sees the default branch menu flash first.
  useDeferredLoad(() => {
    setBranchIdState(readBranchPreference(branchPreferenceStorage()));
    setBranchReady(true);
  }, []);

  const setBranchId = useCallback((id: string) => {
    setBranchIdState(id);
    writeBranchPreference(branchPreferenceStorage(), id);
  }, []);

  useDeferredLoad(() => {
    if (!branchReady) return;
    void load();
  }, [load, nonce, branchReady]);

  const refreshCart = useCallback(async () => {
    try {
      const cart = await fetchCart();
      setCartCount(cartItemCount(cart));
    } catch {
      setCartCount(0);
    }
  }, []);

  // The provider is mounted once in the (shop) layout and survives client-side
  // navigation, so a badge fetched on first paint never learns about a cart
  // that changed later. Revalidate on every route change.
  useDeferredLoad(() => {
    void refreshCart();
  }, [refreshCart, pathname]);

  useEffect(() => {
    return subscribeCartChanged(() => {
      void refreshCart();
    });
  }, [refreshCart]);

  // A cart can also change without any local event: order placement consumes it
  // server-side, and another tab or device can clear it. Revalidate when this
  // tab returns to the foreground.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === 'visible') void refreshCart();
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [refreshCart]);

  const value = useMemo<ChromeValue>(
    () => ({
      home,
      status,
      error,
      cartCount,
      branchId,
      setBranchId,
      categoryId,
      query,
      reload: () => setNonce((n) => n + 1),
      setCategoryId,
      setQuery,
      refreshCart,
    }),
    [home, status, error, cartCount, branchId, setBranchId, categoryId, query, refreshCart],
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
