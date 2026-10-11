'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { addProductToCart } from '../../lib/storefront/cart';
import { fetchStorefrontCategories } from '../../lib/storefront/catalog';
import { formatBranchLocation, formatDeliveryWindow } from '../../lib/storefront/format';
import { fetchStorefrontHome } from '../../lib/storefront/home';

import { HomeEmpty, HomeError, HomeSkeleton } from './home-states';
import { MaterialIcon } from './material-icon';
import { ProductCard } from './product-card';
import { useStorefrontChrome } from './storefront-chrome';

type MenuCategory = { id: string; slug: string; name: string; productCount: number };

export function MenuPage() {
  const { home, status, error, reload, categoryId, setCategoryId, refreshCart } =
    useStorefrontChrome();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[] | null>(null);
  const [allProductCount, setAllProductCount] = useState<number | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  // With no category filter active, `home` is the unfiltered catalog and already
  // carries both the category list and the total count, so that case is derived
  // instead of mirrored into state. Copying it into state also latched
  // `menuCategories`, which then short-circuited the fetch below for the rest of
  // the session — leaving the per-category counts built against a stale catalog
  // after the first category switch.
  const homeCarriesCategories = categoryId === null && (home?.categories.length ?? 0) > 0;

  useEffect(() => {
    if (!home || homeCarriesCategories) return;
    if (menuCategories !== null) return;

    let active = true;
    void Promise.all([
      fetchStorefrontCategories(),
      categoryId === null ? Promise.resolve(home) : fetchStorefrontHome(),
    ])
      .then(([categories, catalogHome]) => {
        if (!active) return;
        const counts = new Map<string, number>();
        for (const product of catalogHome.products) {
          counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
        }
        setAllProductCount(catalogHome.products.length);
        setMenuCategories(
          categories.map((category) => ({
            id: category.id,
            slug: category.slug,
            name: category.name,
            productCount: counts.get(category.id) ?? 0,
          })),
        );
      })
      .catch(() => {
        if (active) setMenuCategories([]);
      });

    return () => {
      active = false;
    };
  }, [categoryId, home, homeCarriesCategories, menuCategories]);

  const categories =
    homeCarriesCategories && home ? home.categories : (menuCategories ?? home?.categories ?? []);
  const activeCategory = categories.find((category) => category.id === categoryId) ?? null;
  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!term || !home) return home?.products ?? [];
    return home.products.filter((product) =>
      `${product.name} ${product.description ?? ''}`.toLocaleLowerCase('tr-TR').includes(term),
    );
  }, [home, searchTerm]);
  const totalProductCount =
    (homeCarriesCategories && home ? home.products.length : allProductCount) ??
    (categories.reduce((count, category) => count + category.productCount, 0) ||
      (home?.products.length ?? 0));

  async function addProduct(productId: string) {
    setBusyId(productId);
    try {
      await addProductToCart(productId, 1);
      await refreshCart();
    } finally {
      setBusyId(null);
    }
  }

  if (status === 'loading' && !home) return <HomeSkeleton />;
  if (status === 'error' && !home) {
    return <HomeError message={error ?? 'Katalog yanıt vermedi.'} onRetry={reload} />;
  }
  if (!home) return <HomeEmpty />;

  const branch = home.branch;
  const deliveryWindow = branch
    ? formatDeliveryWindow(branch.estimatedDeliveryMinutesMin, branch.estimatedDeliveryMinutesMax)
    : null;

  return (
    <main
      id="storefront-main"
      className="min-h-screen w-full bg-background pt-20"
      data-ff-surface="menu"
    >
      <div className="mx-auto w-full max-w-7xl px-margin-sm pb-space-2xl pt-space-lg lg:px-margin lg:pt-space-xl">
        <header className="flex flex-col gap-space-md border-b border-outline-variant/40 pb-space-lg md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-container shadow-[0_0_16px_rgba(255,87,34,0.6)]" />
              <p className="font-label-sm text-label-sm uppercase tracking-[0.18em] text-primary">
                BURGER HOME · MENÜ
              </p>
            </div>
            <h1 className="font-headline-xl text-headline-xl uppercase leading-none text-on-surface">
              Ne yesek?
            </h1>
            <p className="mt-3 max-w-xl font-body-md text-body-md text-on-surface-variant">
              Kategorini seç, menüyü keşfet. Sevdiğin lezzeti bulup siparişine ekle.
            </p>
          </div>

          <Link
            href="/branches"
            className="flex min-h-14 items-center gap-3 rounded-xl border border-outline-variant/45 bg-surface-container-low px-space-md py-space-sm transition-colors hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container md:min-w-64"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-container/15 text-primary-container">
              <MaterialIcon name="location_on" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Teslimat şubesi
              </span>
              <span className="mt-0.5 block truncate font-label-md text-label-md text-on-surface">
                {branch
                  ? formatBranchLocation(branch.name, branch.addressLine)
                  : 'Şube seç'}
              </span>
              <span className="mt-0.5 block font-body-sm text-body-sm text-on-surface-variant">
                {deliveryWindow ? `${deliveryWindow} tahmini teslimat` : 'Menüyü şubene göre gör'}
              </span>
            </span>
            <MaterialIcon name="chevron_right" className="text-on-surface-variant" />
          </Link>
        </header>

        <div className="mt-space-lg grid items-start gap-space-lg lg:grid-cols-[15rem_minmax(0,1fr)] xl:gap-space-xl">
          <aside className="min-w-0 lg:sticky lg:top-24">
            <nav aria-label="Menü kategorileri" className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-space-sm lg:p-space-md">
              <div className="mb-space-sm flex items-center justify-between px-2 pt-1">
                <h2 className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface">
                  Kategoriler
                </h2>
                <span className="rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm tabular-nums text-on-surface-variant">
                  {categories.length}
                </span>
              </div>

              <div className="sf-chip-scroll flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
                <CategoryButton
                  active={categoryId === null}
                  icon="grid_view"
                  label="Tüm Lezzetler"
                  count={totalProductCount}
                  onClick={() => setCategoryId(null)}
                />
                {categories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    active={categoryId === category.id}
                    icon={categoryIcon(category)}
                    label={category.name}
                    count={category.productCount}
                    onClick={() => setCategoryId(category.id)}
                  />
                ))}
              </div>

              <div className="mt-space-md hidden rounded-xl border border-outline-variant/35 bg-background/55 p-space-md lg:block">
                <div className="flex items-center gap-2 text-secondary-container">
                  <MaterialIcon name="sell" />
                  <span className="font-label-md text-label-md uppercase">Kampanyalar</span>
                </div>
                <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                  Güncel fırsatları ve avantajlı menüleri keşfet.
                </p>
                <Link
                  href="/deals"
                  className="mt-3 inline-flex items-center gap-1 font-label-sm text-label-sm uppercase text-secondary-container hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container"
                >
                  Fırsatlara git <MaterialIcon name="arrow_forward" className="text-base" />
                </Link>
              </div>
            </nav>
          </aside>

          <section id="menu-catalog" aria-labelledby="menu-results-heading" className="min-w-0 scroll-mt-24">
            <div className="mb-space-md flex flex-col gap-space-md border-b border-outline-variant/35 pb-space-md sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-label-sm text-label-sm uppercase tracking-[0.16em] text-primary">
                  ŞUBE MENÜSÜ
                </p>
                <h2
                  id="menu-results-heading"
                  className="mt-1 font-headline-lg text-headline-lg uppercase leading-tight text-on-surface"
                >
                  {activeCategory?.name ?? 'Tüm Lezzetler'}
                </h2>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant" aria-live="polite">
                  {searchTerm.trim()
                    ? `${visibleProducts.length} sonuç bulundu`
                    : `${visibleProducts.length} ürün listeleniyor`}
                </p>
              </div>

              <label className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-outline-variant/45 bg-surface-container-low px-space-md text-on-surface-variant transition-colors focus-within:border-secondary-container focus-within:ring-1 focus-within:ring-secondary-container sm:max-w-sm">
                <MaterialIcon name="search" />
                <span className="sr-only">Bu menüde ara</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ürün veya içerik ara"
                  className="min-w-0 flex-1 bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/75"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Aramayı temizle"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container"
                  >
                    <MaterialIcon name="close" className="text-base" />
                  </button>
                ) : null}
              </label>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/55 bg-surface-container-low/60 px-space-lg py-space-xl text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-container text-secondary-container">
                  <MaterialIcon name="search_off" className="text-2xl" />
                </span>
                <h3 className="mt-space-md font-headline-sm text-headline-sm uppercase text-on-surface">
                  Ürün bulunamadı
                </h3>
                <p className="mt-1 max-w-sm font-body-md text-body-md text-on-surface-variant">
                  Arama ifadesini değiştirebilir veya başka bir kategori seçebilirsin.
                </p>
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="mt-space-md rounded-lg bg-secondary-container px-space-md py-2.5 font-label-md text-label-md uppercase text-on-secondary-container transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container"
                  >
                    Aramayı temizle
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 xl:grid-cols-3 xl:gap-space-lg">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={(id) => void addProduct(id)}
                    busy={busyId === product.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function CategoryButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl border px-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container lg:w-full ${
        active
          ? 'border-secondary-container/35 bg-secondary-container text-on-secondary-container shadow-[0_6px_18px_rgba(254,179,0,0.12)]'
          : 'border-transparent bg-transparent text-on-surface-variant hover:border-outline-variant/40 hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      <MaterialIcon
        name={icon}
        className={`shrink-0 text-lg ${active ? 'text-on-secondary-container' : 'text-primary-container'}`}
      />
      <span className="whitespace-nowrap font-label-md text-label-md uppercase tracking-wide lg:flex-1 lg:whitespace-normal">
        {label}
      </span>
      <span
        className={`ml-auto min-w-7 rounded-full px-2 py-1 text-center font-label-sm text-label-sm tabular-nums ${
          active
            ? 'bg-on-secondary-container/10 text-on-secondary-container'
            : 'bg-surface-container-high text-on-surface-variant'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function categoryIcon(category: MenuCategory): string {
  const value = `${category.slug} ${category.name}`.toLocaleLowerCase('tr-TR');
  if (value.includes('tavuk') || value.includes('chicken')) return 'egg_alt';
  if (value.includes('çocuk') || value.includes('kids')) return 'child_care';
  if (value.includes('burger') || value.includes('et ')) return 'lunch_dining';
  if (value.includes('hotdog')) return 'fastfood';
  if (value.includes('aperatif') || value.includes('side')) return 'tapas';
  if (value.includes('içecek') || value.includes('drink')) return 'local_cafe';
  if (value.includes('kampanya') || value.includes('deal')) return 'sell';
  return 'restaurant_menu';
}
