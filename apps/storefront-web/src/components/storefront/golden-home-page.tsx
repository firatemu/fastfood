'use client';

import { useState } from 'react';

import { addComboItemsToCart, addProductToCart } from '../../lib/storefront/cart';

import { HomeCatalog } from './home-catalog';
import { HomeCombo } from './home-combo';
import { HomeHero } from './home-hero';
import { HomeReviews } from './home-reviews';
import { HomeEmpty, HomeError, HomeSkeleton } from './home-states';
import { useStorefrontChrome } from './storefront-chrome';

export function GoldenHomePage() {
  const { home, status, error, reload, categoryId, setCategoryId, refreshCart } = useStorefrontChrome();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function addProduct(productId: string) {
    setBusyId(productId);
    try {
      await addProductToCart(productId, 1);
      await refreshCart();
    } finally {
      setBusyId(null);
    }
  }

  async function addCombo() {
    if (!home?.combo) return;
    setBusyId(home.combo.id);
    try {
      await addComboItemsToCart(home.combo.items);
      await refreshCart();
    } finally {
      setBusyId(null);
    }
  }

  if (status === 'loading' && !home) return <HomeSkeleton />;
  if (status === 'error' && !home) {
    return <HomeError message={error ?? 'Menü alınamadı'} onRetry={reload} />;
  }
  if (!home) return <HomeEmpty />;

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="golden-home">
      <div className="flex flex-col w-full">
        <HomeHero
          key={
            home.heroSlides?.length
              ? home.heroSlides.map((slide) => slide.id).join(',')
              : (home.hero?.id ?? 'empty-vitrine')
          }
          home={home}
          busyId={busyId}
          onOrderHero={(productId) => void addProduct(productId)}
        />
        <HomeCatalog
          home={home}
          selectedCategoryId={categoryId}
          onSelectCategory={setCategoryId}
          onAdd={(id: string) => void addProduct(id)}
          busyId={busyId}
        />
        {home.combo ? (
          <HomeCombo combo={home.combo} onAdd={() => void addCombo()} busy={busyId === home.combo.id} />
        ) : (
          <section className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-xl">
            <div className="rounded-2xl bg-surface-container-low p-space-md text-on-surface-variant">
              Aktif kombo fırsatı yok.
            </div>
          </section>
        )}
        <HomeReviews home={home} />
      </div>
    </main>
  );
}
