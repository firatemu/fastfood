'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import { addProductToCart } from '../../lib/storefront/cart';
import { fetchStorefrontHome, type StorefrontHome } from '../../lib/storefront/home';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { ProductCard } from './product-card';
import { ShopEmpty, ShopError, ShopSkeleton } from './shop-states';
import { useStorefrontChrome } from './storefront-chrome';

export function SearchPage() {
  const params = useSearchParams();
  const q = (params.get('q') ?? '').trim().slice(0, 80);
  const { refreshCart } = useStorefrontChrome();
  const [home, setHome] = useState<StorefrontHome | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useDeferredLoad(() => {
    void (async () => {
      try {
        setHome(await fetchStorefrontHome({ q: q || undefined }));
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [q, nonce]);

  async function onAdd(productId: string) {
    setBusyId(productId);
    try {
      await addProductToCart(productId, 1);
      await refreshCart();
    } finally {
      setBusyId(null);
    }
  }

  if (status === 'loading' && !home) return <ShopSkeleton />;
  if (status === 'error' && !home) {
    return <ShopError title="Arama" message={error ?? 'Katalog yanıt vermedi.'} onRetry={() => setNonce((n) => n + 1)} />;
  }

  const products = (home?.products ?? []).filter((p) => (q ? true : p.isAvailable || !p.isAvailable));

  if (!q) {
    return (
      <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="search">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg">
          <h1 className="font-headline-lg uppercase">Menüde ara</h1>
          <p className="font-body-md text-on-surface-variant mt-2">
            Üst çubuktan burger, sos veya yan ara. Sonuçlar canlı katalogdandır.
          </p>
          {products.length === 0 ? (
            <ShopEmpty title="Menü boş" message="Şu an listelenecek ürün yok." actionHref="/" actionLabel="Ana sayfa" compact />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg mt-space-lg">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={onAdd} busy={busyId === product.id} />
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  if (products.length === 0) {
    return (
      <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="search">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg">
          <h1 className="font-headline-lg uppercase">Arama</h1>
          <p className="font-body-md text-on-surface-variant mt-2" data-ff-search-q>
            “{q}” — 0 sonuç
          </p>
          <ShopEmpty
            title="Sonuç yok"
            message={`“${q}” için eşleşen ürün bulunamadı.`}
            actionHref="/"
            actionLabel="Menüye dön"
            compact
          />
        </div>
      </main>
    );
  }

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="search">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg">
        <h1 className="font-headline-lg uppercase">Arama</h1>
        <p className="font-body-md text-on-surface-variant mt-2" data-ff-search-q>
          “{q}” — {products.length} sonuç
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg mt-space-lg">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={onAdd} busy={busyId === product.id} />
          ))}
        </div>
      </div>
    </main>
  );
}
