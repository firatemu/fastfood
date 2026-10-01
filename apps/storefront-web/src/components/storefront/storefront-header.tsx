'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { BRAND_NAME, NAV_ITEMS, SEARCH_PLACEHOLDER } from '../../lib/storefront/brand-copy';
import { fetchNotifications } from '../../lib/storefront/engagement';
import { formatBranchLocation, formatDeliveryWindow } from '../../lib/storefront/format';
import type { StorefrontHome } from '../../lib/storefront/home';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { BrandLogo } from './brand-logo';
import { MaterialIcon } from './material-icon';

export function StorefrontHeader({
  home,
  cartCount,
  onSearch,
  searchValue,
}: {
  home: StorefrontHome | null;
  cartCount: number;
  onSearch?: (q: string) => void;
  searchValue?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(searchValue ?? '');
  const [authed, setAuthed] = useState(false);
  const [unread, setUnread] = useState(0);
  useDeferredLoad(() => {
    setAuthed(isCustomerAuthenticated());
    if (isCustomerAuthenticated()) {
      void fetchNotifications()
        .then((data) => setUnread(data.unreadCount))
        .catch(() => setUnread(0));
    } else {
      setUnread(0);
    }
  }, [pathname]);
  useDeferredLoad(() => {
    if (pathname === '/search' && typeof window !== 'undefined') {
      setQuery(new URLSearchParams(window.location.search).get('q') ?? '');
      return;
    }
    if (searchValue !== undefined && pathname === '/') {
      setQuery(searchValue);
    }
  }, [pathname, searchValue]);
  const branch = home?.branch;
  const eta = branch
    ? formatDeliveryWindow(branch.estimatedDeliveryMinutesMin, branch.estimatedDeliveryMinutesMax)
    : null;
  const kitchenLive = (home?.kitchenLiveCount ?? 0) > 0;

  function navActive(href: string): boolean {
    if (href === '/') return pathname === '/' || pathname === '/menu';
    return pathname === href;
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (pathname === '/') {
      onSearch?.(q);
      return;
    }
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 max-w-7xl mx-auto px-margin-sm lg:px-margin flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-lg shrink-0">
          <Link href="/" className="flex items-center gap-space-sm" data-path="menu">
            <BrandLogo />
            <span className="ff-sr-only">{BRAND_NAME}</span>
          </Link>
          {branch ? (
            <Link
              href="/branches"
              className="hidden xl:flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low"
            >
              <MaterialIcon name="location_on" className="text-primary text-lg" />
              <div className="flex flex-col text-left">
                <span className="font-label-sm text-label-sm text-on-surface uppercase leading-none">
                  {formatBranchLocation(branch.name, branch.addressLine)}
                </span>
                <span className="font-label-sm text-[10px] text-primary-container leading-tight mt-0.5">
                  {eta ? `Teslimat: ${eta}` : branch.isAcceptingOrders ? 'Teslimat açık' : 'Şu an kapalı'}
                </span>
              </div>
              <MaterialIcon name="chevron_right" className="text-on-surface-variant text-base ml-1" />
            </Link>
          ) : null}
        </div>
        <nav className="hidden lg:flex items-center gap-space-lg" aria-label="Birincil">
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
                    ? 'uppercase transition-colors text-secondary-container font-semibold'
                    : 'font-label-lg text-label-lg uppercase text-on-surface-variant hover:text-on-surface transition-colors'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-space-sm shrink-0">
          <Link
            href="/search"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-surface-container-low text-on-surface-variant"
            aria-label="Arama sayfası"
          >
            <MaterialIcon name="search" className="text-xl" />
          </Link>
          <form className="relative hidden md:flex items-center" onSubmit={submitSearch} role="search">
            <MaterialIcon
              name="search"
              className="absolute left-3 text-on-surface-variant text-base"
            />
            <input
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="Menüde ara"
              className="w-48 xl:w-60 h-10 pl-9 pr-space-sm bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 font-body-sm text-body-sm rounded-lg outline-none focus:bg-surface-container-high focus:ring-1 focus:ring-primary-container"
            />
          </form>
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-space-sm py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface transition-colors text-on-surface-variant"
            data-ff-kitchen={kitchenLive ? 'live' : 'idle'}
            aria-label="Izgarada"
          >
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span className="hidden sm:inline font-label-sm text-label-sm uppercase text-on-surface">Izgarada</span>
          </Link>
          <Link
            href={authed ? '/cart' : '/auth?next=/cart'}
            className="relative flex items-center gap-2 h-10 px-space-md rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md uppercase tracking-wide hover:brightness-110 shadow-md transition-all"
            data-ff-cart
            aria-label="Sepet"
          >
            <MaterialIcon name="shopping_bag" className="text-base" />
            <span className="hidden sm:inline">Sepet</span>
            {cartCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[10px] flex items-center justify-center">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <Link href={authed ? '/account' : '/auth'} className="relative flex items-center ml-1" aria-label={authed ? 'Hesabım' : 'Giriş'}>
            {authed ? (
              <span className="w-8 h-8 rounded-full bg-surface-container-high text-primary-container font-label-md flex items-center justify-center">
                BH
              </span>
            ) : (
              <MaterialIcon name="person" className="text-3xl text-on-surface-variant" />
            )}
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[10px] flex items-center justify-center" data-ff-unread>
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
