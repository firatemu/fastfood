'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { fetchFavorites, type Favorite } from '../../lib/storefront/favorites';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { FavoritesSection } from './favorites-section';
import { ShopError, ShopSkeleton } from './shop-states';

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setFavorites(await fetchFavorites());
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, []);

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error') {
    return <ShopError title="Favoriler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="favorites">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h1 className="font-headline-md uppercase">Favoriler</h1>
              <Link href="/" className="font-label-sm uppercase text-secondary-container">
                Menüye dön
              </Link>
            </div>
            <FavoritesSection favorites={favorites} />
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
