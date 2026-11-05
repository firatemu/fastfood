'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { formatTryMinor } from '../../lib/money';
import { subscribeNotificationsChanged } from '../../lib/notification-events';
import { BRAND_NAME, NAV_ITEMS, SEARCH_PLACEHOLDER } from '../../lib/storefront/brand-copy';
import { fetchNotifications } from '../../lib/storefront/engagement';
import { fetchStorefrontHome, type StorefrontHome } from '../../lib/storefront/home';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { BrandLogo } from './brand-logo';
import { MaterialIcon } from './material-icon';

type SearchProductItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePriceMinor: string;
  currency: string;
  imageUrl: string | null;
  imageAlt: string | null;
  isAvailable: boolean;
};

export function StorefrontHeader({
  home,
  cartCount,
  onSearch,
  searchValue,
  onSelectBranch: _onSelectBranch,
}: {
  home: StorefrontHome | null;
  cartCount: number;
  onSearch?: (q: string) => void;
  searchValue?: string;
  onSelectBranch?: (branchId: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(searchValue ?? '');
  const [authed, setAuthed] = useState(false);
  const [unread, setUnread] = useState(0);

  // Search dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchProductItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const refreshUnread = useCallback(async () => {
    if (!isCustomerAuthenticated()) {
      setUnread(0);
      return;
    }
    try {
      const data = await fetchNotifications();
      setUnread(data.unreadCount);
    } catch {
      setUnread(0);
    }
  }, []);

  useDeferredLoad(() => {
    setAuthed(isCustomerAuthenticated());
    void refreshUnread();
  }, [pathname, refreshUnread]);

  // Notifications are marked read on another screen, so the badge has to be
  // told; otherwise it shows the count from first paint until a navigation.
  useEffect(() => {
    return subscribeNotificationsChanged(() => {
      void refreshUnread();
    });
  }, [refreshUnread]);

  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === 'visible') void refreshUnread();
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [refreshUnread]);

  useDeferredLoad(() => {
    if (pathname === '/search' && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('q') ?? '';
      setQuery(q);
      return;
    }
    if (searchValue !== undefined && pathname === '/') {
      setQuery(searchValue);
    }
  }, [pathname, searchValue]);

  // Close search dropdown and mobile search on route change
  useDeferredLoad(() => {
    setIsDropdownOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  // Click outside to close dropdown & Escape key handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inDesktopSearch = searchContainerRef.current?.contains(target);
      const inMobileSearch = mobileSearchRef.current?.contains(target);
      if (!inDesktopSearch && !inMobileSearch) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Live debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchStorefrontHome({ q: trimmed });
        setSearchResults((data.products ?? []) as SearchProductItem[]);
        setIsDropdownOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const kitchenLive = (home?.kitchenLiveCount ?? 0) > 0;

  function navActive(href: string): boolean {
    if (href === '/') return pathname === '/' || pathname === '/menu';
    return pathname === href;
  }

  function submitSearch(event?: FormEvent) {
    if (event) event.preventDefault();
    const q = query.trim();
    setIsDropdownOpen(false);
    setMobileSearchOpen(false);
    if (!q) {
      router.push('/search');
      return;
    }
    if (pathname === '/') {
      onSearch?.(q);
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleClearSearch() {
    setQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);
    if (pathname === '/') {
      onSearch?.('');
    }
    searchInputRef.current?.focus();
  }

  function renderSearchDropdown() {
    if (!isDropdownOpen || query.trim().length < 2) return null;

    return (
      <div
        role="listbox"
        aria-label="Arama önerileri"
        className="absolute left-0 right-0 top-full mt-2 w-full min-w-[320px] max-w-lg rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/95 p-3 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150"
      >
        <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-outline-variant/20 text-xs font-label-sm uppercase tracking-wider text-on-surface-variant">
          <span>{isSearching ? 'Aranıyor…' : 'Lezzet Önerileri'}</span>
          <span className="tabular-nums font-semibold text-secondary-container">
            {searchResults.length} sonuç
          </span>
        </div>

        {searchResults.length > 0 ? (
          <div className="flex flex-col gap-1 max-h-[380px] overflow-y-auto sf-chip-scroll py-1">
            {searchResults.slice(0, 6).map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                onClick={() => {
                  setIsDropdownOpen(false);
                  setMobileSearchOpen(false);
                }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-high transition-colors group text-left"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.imageAlt ?? product.name}
                    className="w-11 h-11 rounded-lg object-cover bg-surface-container shrink-0 border border-outline-variant/20 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-surface-container grid place-items-center text-primary shrink-0 border border-outline-variant/20">
                    <MaterialIcon name="lunch_dining" className="text-xl" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block font-label-md text-label-md uppercase font-semibold text-on-surface group-hover:text-secondary-container transition-colors truncate">
                    {product.name}
                  </span>
                  {product.description ? (
                    <span className="block font-body-sm text-xs text-on-surface-variant truncate">
                      {product.description}
                    </span>
                  ) : null}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-label-md text-label-md font-bold text-secondary-container tabular-nums">
                    {formatTryMinor(product.basePriceMinor, product.currency)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : isSearching ? (
          <div className="py-6 text-center text-on-surface-variant font-body-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            <span>Menü taranıyor…</span>
          </div>
        ) : (
          <div className="py-6 text-center text-on-surface-variant font-body-sm">
            <MaterialIcon
              name="search_off"
              className="text-2xl text-on-surface-variant/60 mx-auto mb-1 block"
            />
            <span>“{query.trim()}” ile eşleşen lezzet bulunamadı.</span>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={() => submitSearch()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-label-sm uppercase tracking-wider text-secondary-container hover:bg-surface-container font-semibold transition-colors"
          >
            <span>Tüm sonuçları gör ({searchResults.length})</span>
            <MaterialIcon name="arrow_forward" className="text-sm" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
      <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 md:gap-4">
        {/* Sol Alan: Logo & Navigasyon */}
        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-transform active:scale-95"
            data-path="menu"
          >
            <BrandLogo />
            <span className="ff-sr-only">{BRAND_NAME}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Birincil">
            {NAV_ITEMS.map((item) => {
              const active = navActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-path={item.dataPath}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'px-3 py-2 rounded-xl font-label-md text-label-md uppercase tracking-wider text-secondary-container bg-secondary-container/10 font-bold transition-all'
                      : 'px-3 py-2 rounded-xl font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-all'
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Orta Alan: Aktif Menü Arama Çubuğu (Masaüstü) */}
        <div
          ref={searchContainerRef}
          className="relative hidden md:flex items-center flex-1 max-w-md mx-2 lg:mx-4"
        >
          <form className="relative flex items-center w-full" onSubmit={submitSearch} role="search">
            <MaterialIcon
              name="search"
              className="absolute left-3.5 text-on-surface-variant text-lg pointer-events-none transition-colors peer-focus:text-secondary-container"
            />
            <input
              ref={searchInputRef}
              name="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim().length >= 2) setIsDropdownOpen(true);
              }}
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="Menüde ara"
              autoComplete="off"
              className="peer w-full h-11 pl-10 pr-9 bg-surface-container-low/90 hover:bg-surface-container focus:bg-surface-container text-on-surface placeholder:text-on-surface-variant/60 font-body-sm text-body-sm rounded-full outline-none border border-outline-variant/30 focus:border-secondary-container/70 focus:ring-2 focus:ring-secondary-container/20 transition-all shadow-inner"
            />
            {query ? (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Aramayı temizle"
                className="absolute right-3 grid place-items-center w-6 h-6 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MaterialIcon name="close" className="text-sm" />
              </button>
            ) : null}
          </form>

          {/* Canlı Arama Sonuçları Açılır Paneli */}
          {renderSearchDropdown()}
        </div>

        {/* Sağ Alan: Eylemler & Kullanıcı Bilgisi */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobil Arama Butonu */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label="Menüde ara"
          >
            <MaterialIcon name={mobileSearchOpen ? 'close' : 'search'} className="text-xl" />
          </button>

          {/* Izgarada Durumu */}
          <Link
            href="/orders"
            className="flex items-center gap-2 h-10 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all border border-outline-variant/20"
            data-ff-kitchen={kitchenLive ? 'live' : 'idle'}
            aria-label="Izgarada canlı sipariş durumu"
            title="Izgarada"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse shadow-[0_0_8px_rgba(255,87,34,0.7)]" />
            <span className="hidden sm:inline font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold">
              Izgarada
            </span>
          </Link>

          {/* Masa Siparişi QR */}
          <Link
            href="/account/table"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors border border-outline-variant/20"
            aria-label="Masa kodu"
            title="Masa Siparişi (QR)"
            data-ff-table-entry
          >
            <MaterialIcon name="qr_code_2" className="text-xl" />
          </Link>

          {/* Sepet */}
          <Link
            href={authed ? '/cart' : '/auth?next=/cart'}
            className="relative flex items-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl bg-secondary-container hover:brightness-110 text-on-secondary-container font-label-md text-label-md uppercase tracking-wider font-bold shadow-[0_2px_10px_rgba(254,179,0,0.25)] hover:shadow-[0_4px_16px_rgba(254,179,0,0.35)] active:scale-95 transition-all"
            data-ff-cart
            aria-label="Sepet"
          >
            <MaterialIcon name="shopping_bag" className="text-lg" />
            <span className="hidden sm:inline">Sepet</span>
            {cartCount > 0 ? (
              <span
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[10px] flex items-center justify-center font-bold shadow-sm"
                data-ff-cart-count
              >
                {cartCount}
              </span>
            ) : null}
          </Link>

          {/* Kullanıcı / Hesap */}
          <Link
            href={authed ? '/account' : '/auth'}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors ml-0.5 border border-outline-variant/20"
            aria-label={authed ? 'Hesabım' : 'Giriş'}
            title={authed ? 'Hesabım' : 'Giriş Yap'}
          >
            {authed ? (
              <span className="w-8 h-8 rounded-lg bg-surface-container-high text-primary-container font-label-md font-bold flex items-center justify-center">
                BH
              </span>
            ) : (
              <MaterialIcon name="person" className="text-2xl text-on-surface-variant" />
            )}
            {unread > 0 ? (
              <span
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[10px] flex items-center justify-center font-bold"
                data-ff-unread
              >
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* Mobil Arama Çubuğu (Açıldığında) */}
      {mobileSearchOpen ? (
        <div
          ref={mobileSearchRef}
          className="relative md:hidden border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-lg"
        >
          <form className="relative flex items-center w-full" onSubmit={submitSearch} role="search">
            <MaterialIcon
              name="search"
              className="absolute left-3.5 text-on-surface-variant text-lg pointer-events-none"
            />
            <input
              name="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="Menüde ara"
              autoFocus
              autoComplete="off"
              className="w-full h-11 pl-10 pr-9 bg-surface-container text-on-surface placeholder:text-on-surface-variant/60 font-body-sm text-body-sm rounded-xl outline-none border border-outline-variant/40 focus:border-secondary-container"
            />
            {query ? (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Aramayı temizle"
                className="absolute right-3 grid place-items-center w-6 h-6 rounded-full text-on-surface-variant"
              >
                <MaterialIcon name="close" className="text-sm" />
              </button>
            ) : null}
          </form>
          {renderSearchDropdown()}
        </div>
      ) : null}
    </header>
  );
}
