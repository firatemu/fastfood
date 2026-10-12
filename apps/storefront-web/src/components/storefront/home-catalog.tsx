'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import type { StorefrontHome } from '../../lib/storefront/home';

import { MaterialIcon } from './material-icon';
import { ProductCard } from './product-card';

export function HomeCatalog({
  home,
  categories = home.categories,
  totalProductCount,
  selectedCategoryId,
  onSelectCategory,
  onAdd,
  busyId,
  eyebrow = 'ZANAATKAR ŞEF SEÇKİSİ',
  heading = 'ÖZEL SMASH & YANLAR',
}: {
  home: StorefrontHome;
  categories?: Array<{ id: string; slug: string; name: string; productCount: number }>;
  totalProductCount?: number;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAdd: (productId: string) => void;
  busyId: string | null;
  eyebrow?: string;
  heading?: string;
}) {
  const total = useMemo(() => {
    const categoryTotal = categories.reduce((n, category) => n + category.productCount, 0);
    return totalProductCount ?? (categoryTotal || home.products.length);
  }, [categories, home.products.length, totalProductCount]);

  return (
    <section
      id="menu-catalog"
      className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin pt-space-xl pb-space-lg flex flex-col gap-space-lg"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
              {eyebrow}
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase">{heading}</h2>
        </div>
        <div className="flex items-center gap-space-sm">
          <Link
            href="/legal#alerjen-rehberi"
            className="px-space-md py-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface font-label-md text-label-md uppercase flex items-center gap-2 transition-all"
          >
            <MaterialIcon name="tune" className="text-base" />
            <span>Alerjen & Tercih</span>
          </Link>
        </div>
      </div>
      {/* Wide viewports wrap so every category stays readable without any
          interaction; narrow ones keep the single-row scroll. That scroll needs inset
          padding, because its scrollbar is hidden and a chip flush against the edge
          reads as clipped rather than scrollable. */}
      <div className="sf-chip-scroll flex w-full flex-nowrap items-center gap-space-sm overflow-x-auto px-1 pb-2 pr-space-sm lg:flex-wrap lg:overflow-x-visible lg:px-0 lg:pr-0 lg:pb-0">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={chipClass(selectedCategoryId === null)}
        >
          Tüm Lezzetler ({total})
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className={chipClass(selectedCategoryId === category.id)}
          >
            {category.slug === 'burgers' ? '🔥 ' : null}
            {category.name}
            {category.productCount > 0 ? ` (${category.productCount})` : null}
          </button>
        ))}
      </div>
      {home.products.length === 0 ? (
        <div className="rounded-xl bg-surface-container p-space-xl text-on-surface-variant font-body-md">
          Bu kategoride ürün yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {home.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAdd}
              busy={busyId === product.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function chipClass(active: boolean): string {
  return active
    ? 'shrink-0 px-space-md py-2.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md uppercase tracking-wider shadow-md font-bold'
    : 'shrink-0 px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md uppercase tracking-wider hover:bg-surface-container-high transition-colors';
}
