'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { groupByCategory, normalizeSearchTerm, productMatchesQuery } from '../lib/format';
import type { QrMenuData } from '../lib/types';

import { CategoryRail } from './category-rail';
import { MenuTopbar } from './menu-topbar';
import { ProductCard } from './product-card';
import { ProductDetailSheet } from './product-detail-sheet';

/** Business timezone (document 35/37). Fixed so server and client agree. */
const LOADED_AT_FORMAT = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  hour: '2-digit',
  minute: '2-digit',
});

export function QrMenuApp({ menu }: { menu: QrMenuData }) {
  const [query, setQuery] = useState('');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const normalizedQuery = useMemo(() => normalizeSearchTerm(query), [query]);

  const visibleProducts = useMemo(
    () => menu.products.filter((product) => productMatchesQuery(product, normalizedQuery)),
    [menu.products, normalizedQuery],
  );

  const sections = useMemo(
    () => groupByCategory(menu.categories, visibleProducts),
    [menu.categories, visibleProducts],
  );

  const railCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const section of sections) counts.set(section.categoryId, section.items.length);
    return menu.categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        count: counts.get(category.id) ?? 0,
      }))
      .filter((category) => category.count > 0);
  }, [menu.categories, sections]);

  const categoryById = useMemo(
    () => new Map(menu.categories.map((category) => [category.id, category])),
    [menu.categories],
  );

  const activeProduct = useMemo(
    () => (activeSlug ? (menu.products.find((product) => product.slug === activeSlug) ?? null) : null),
    [menu.products, activeSlug],
  );

  // Highlight the category the reader is currently looking at.
  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(`qr-category-${section.categoryId}`))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const categoryId = firstVisible?.target.getAttribute('data-category-id');
        if (categoryId) setActiveCategoryId(categoryId);
      },
      { rootMargin: '-150px 0px -60% 0px', threshold: 0 },
    );

    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [sections]);

  const handleSelectCategory = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
    document
      .getElementById(`qr-category-${categoryId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCloseProduct = useCallback(() => setActiveSlug(null), []);

  return (
    <div className="min-h-screen bg-paper">
      <MenuTopbar
        branch={menu.branch}
        query={query}
        resultCount={visibleProducts.length}
        totalCount={menu.products.length}
        onQueryChange={setQuery}
      />

      <CategoryRail
        categories={railCategories}
        activeCategoryId={activeCategoryId}
        onSelect={handleSelectCategory}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        {sections.length === 0 ? (
          <p className="py-24 text-center text-sm text-ink-soft" data-qr-empty>
            &ldquo;{query}&rdquo; için ürün bulunamadı. Farklı bir arama deneyin.
          </p>
        ) : (
          sections.map((section) => {
            const category = categoryById.get(section.categoryId);
            return (
              <section
                key={section.categoryId}
                id={`qr-category-${section.categoryId}`}
                data-category-id={section.categoryId}
                data-qr-section={section.categoryId}
                className="qr-section pt-10 first:pt-7"
              >
                <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
                  <div>
                    <h2 className="qr-display text-2xl text-ink sm:text-3xl">
                      {category?.name ?? 'Diğer'}
                    </h2>
                    {category?.description ? (
                      <p className="mt-1 max-w-2xl text-[13px] text-ink-soft">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="qr-numeric shrink-0 pb-1 text-xs font-semibold text-ink-faint">
                    {section.items.length} ürün
                  </p>
                </div>

                <div className="qr-print-compact mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {section.items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpen={(slug) => setActiveSlug(slug)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}

        <footer className="mt-14 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
          <p className="font-semibold text-ink-soft">BURGER HOME · QR Menü</p>
          <p className="mt-1 max-w-2xl">
            Bu sayfa masadaki QR kod ile açılır ve yalnızca bilgilendirme amaçlıdır. Fiyatlar KDV
            dahildir ve güncel olmayabilir. Sipariş vermek için lütfen garsonumuzla iletişime geçin.
          </p>
          <p className="qr-numeric mt-2">
            Son güncelleme {LOADED_AT_FORMAT.format(new Date(menu.loadedAt))} (Europe/Istanbul)
          </p>
        </footer>
      </main>

      <ProductDetailSheet product={activeProduct} onClose={handleCloseProduct} />
    </div>
  );
}