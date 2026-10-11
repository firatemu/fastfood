'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { a5ScopeTag } from '../../lib/access-ops';
import {
  getAdminColorModeSnapshot,
  setAdminColorMode,
  subscribeAdminColorMode,
} from '../../lib/admin-color-mode';
import {
  ADMIN_NAV_SECTIONS,
  adminPageForPath,
  adminPagePermissionForPath,
  isNavActive,
} from '../../lib/admin-nav';
import {
  isA2Path,
  isA4Path,
  isA5Path,
  isRouteIdentifiedBranchPath,
  routeBranchId,
} from '../../lib/admin-routes';
import { clearStaffSession, getStaffAccessToken } from '../../lib/api';

import { useBranchContext } from './branch-context';
import { NAV_ICON, OpsIcon } from './ops-icon';
import { useOpsSync } from './ops-sync';
import { navIconForPath, OpsTabs, type OpsTab } from './ops-tabs';
import { ActionButton, SyncIndicator } from './ops-ui';
import { hasStaffPermission, useStaffAccess } from './staff-access-context';

const TITLES: Record<string, string> = {
  '/': 'Operasyonel kontrol',
  '/orders': 'Siparişler',
  '/kitchen': 'Mutfak KDS',
  '/catalog/products': 'Ürünler',
  '/catalog/categories': 'Kategoriler',
  '/catalog/modifiers': 'Modifier grupları',
  '/catalog/allergens': 'Alerjenler',
  '/branches': 'Şubeler',
  '/branches/service-areas': 'Servis alanları',
  '/branches/availability': 'Ürün müsaitliği',
  '/couriers': 'Kurye / Teslimat',
  '/customers': 'Müşteriler',
  '/loyalty': 'BURGER HOME CLUB',
  '/promotions': 'Promosyonlar',
  '/payments': 'Ödemeler',
  '/refunds': 'İadeler',
  '/reports': 'Raporlar',
  '/users': 'Kullanıcılar',
  '/roles': 'Roller ve izinler',
  '/audit': 'Denetim kaydı',
  '/settings': 'Sistem ayarları',
};

function titleFor(pathname: string): string {
  if (pathname.startsWith('/orders/')) return 'Sipariş operasyonu';
  if (pathname.startsWith('/catalog/products/')) return 'Ürün düzenle';
  if (isRouteIdentifiedBranchPath(pathname)) return 'Şube kaydı';
  if (pathname.startsWith('/customers/')) return 'Müşteri kaydı';
  if (pathname.startsWith('/payments/')) return 'Ödeme kaydı';
  return TITLES[pathname] ?? 'Admin';
}

function a4ScopeTag(pathname: string): string | null {
  if (!isA4Path(pathname)) return null;
  if (pathname === '/promotions' || pathname.startsWith('/promotions/')) return 'Küresel pazarlama';
  if (pathname === '/payments' || pathname.startsWith('/payments/') || pathname === '/refunds') {
    return 'Küresel ödeme';
  }
  return 'Küresel müşteri';
}

/**
 * Case- and locale-insensitive rail filter. Turkish dotted/dotless i matters
 * here: "Kurye" and "ROLE"/"Roller" style labels must match what staff type.
 */
function normalizeNavQuery(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c');
}

function subscribeSession(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

const OPEN_TABS_KEY = 'fastfood-admin-open-tabs';

function readOpenTabs(): OpsTab[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(OPEN_TABS_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(
      (tab): tab is OpsTab =>
        typeof tab === 'object' &&
        tab !== null &&
        typeof tab.href === 'string' &&
        typeof tab.label === 'string' &&
        typeof tab.icon === 'string',
    );
  } catch {
    return [];
  }
}

export function OpsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loggedIn = useSyncExternalStore(
    subscribeSession,
    () => (typeof window !== 'undefined' ? Boolean(getStaffAccessToken()) : false),
    () => false,
  );
  const [navOpen, setNavOpen] = useState(false);
  const [navFilter, setNavFilter] = useState('');
  const colorMode = useSyncExternalStore(
    subscribeAdminColorMode,
    getAdminColorModeSnapshot,
    () => 'dark',
  );
  const [openTabs, setOpenTabs] = useState<OpsTab[]>([]);
  const [tabsReady, setTabsReady] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const branch = useBranchContext();
  const sync = useOpsSync();

  const access = useStaffAccess();
  const normalizedNavFilter = useMemo(() => normalizeNavQuery(navFilter), [navFilter]);
  const sections = useMemo(
    () =>
      ADMIN_NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const permission = adminPagePermissionForPath(item.href, 'view');
          if (permission && !hasStaffPermission(access, permission)) return false;
          if (normalizedNavFilter.length === 0) return true;
          return normalizeNavQuery(`${item.label} ${section.label}`).includes(normalizedNavFilter);
        }),
      })).filter((section) => section.items.length > 0),
    [access, normalizedNavFilter],
  );
  const navFilterRef = useRef<HTMLInputElement>(null);

  const isStandalone = pathname === '/login' || pathname.startsWith('/invite/');
  const pageKey = adminPageForPath(pathname);
  const pagePermission = pageKey ? adminPagePermissionForPath(pathname, 'view') : null;
  const pageDenied = Boolean(pagePermission && !hasStaffPermission(access, pagePermission));

  useEffect(() => {
    if (isStandalone) return;
    if (!loggedIn) {
      router.replace('/login');
      return;
    }
    if (access.loading) return;
    if (access.error) {
      clearStaffSession();
      router.replace('/login');
      return;
    }
    // Eksik izin kodunu da tasi: /access-denied hangi yetkinin eksik oldugunu
    // bilmedigi icin yer tutucu bir metin gosteriyordu. Kod zarf seviyesinde
    // butun musterilere doner, hesap durumu tasimaz.
    if (pageDenied) {
      const target = pagePermission
        ? `/access-denied?code=${encodeURIComponent(pagePermission)}`
        : '/access-denied';
      router.replace(target);
    }
    // `pagePermission` is a real dependency, not noise: without it, moving
    // between two denied pages (pageDenied stays true) never re-ran this
    // effect, so the second page was never redirected and could render
    // content the operator has no permission for.
  }, [access.error, access.loading, isStandalone, loggedIn, pageDenied, pagePermission, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpenTabs(
        readOpenTabs().filter((tab) => {
          const permission = adminPagePermissionForPath(tab.href, 'view');
          return !permission || hasStaffPermission(access, permission);
        }),
      );
      setTabsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [access]);

  useEffect(() => {
    if (!tabsReady || !loggedIn || access.loading || pageDenied) return;
    window.localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabs));
  }, [access.loading, loggedIn, openTabs, pageDenied, tabsReady]);

  useEffect(() => {
    if (!tabsReady) return;
    const timer = window.setTimeout(() => {
      setOpenTabs((current) => {
        const existing = current.find((tab) => tab.href === pathname);
        if (existing && existing.label === titleFor(pathname)) return current;
        const nextTab: OpsTab = {
          href: pathname,
          label: titleFor(pathname),
          icon: navIconForPath(pathname),
        };
        if (existing) return current.map((tab) => (tab.href === pathname ? nextTab : tab));
        return [...current, nextTab];
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [access.loading, loggedIn, pageDenied, pathname, tabsReady]);

  useEffect(() => {
    if (!navOpen) return;
    mobileCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        railRef.current?.querySelectorAll<HTMLElement>('a, button') ?? [],
      ).filter(
        (element) => element.getClientRects().length > 0 && !element.hasAttribute('disabled'),
      );
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1]?.focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navOpen]);

  // Roving arrow-key navigation across rail links — enterprise consoles let
  // staff walk the menu without tabbing through 23 stops.
  useEffect(() => {
    const handleNavKeys = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          navFilterRef.current?.focus();
          navFilterRef.current?.select();
        }
        return;
      }
      const target = event.target as HTMLElement | null;
      const insideRail = target ? railRef.current?.contains(target) : false;
      if (!insideRail) return;
      if (target?.tagName === 'INPUT' && event.key !== 'Escape') return;
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

      const links = Array.from(
        railRef.current?.querySelectorAll<HTMLElement>('.ops-side__link') ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      if (links.length === 0) return;

      const currentIndex = links.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      const nextIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? links.length - 1
            : event.key === 'ArrowDown'
              ? Math.min(currentIndex + 1, links.length - 1)
              : Math.max(currentIndex - 1, 0);
      links[nextIndex]?.focus();
    };
    window.addEventListener('keydown', handleNavKeys);
    return () => window.removeEventListener('keydown', handleNavKeys);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setNavOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  function closeMobileNav() {
    setNavOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  function selectTab(href: string) {
    if (href !== pathname) router.push(href);
  }

  function closeTab(href: string) {
    const index = openTabs.findIndex((tab) => tab.href === href);
    if (index < 0) return;
    const remaining = openTabs.filter((tab) => tab.href !== href);
    if (href !== pathname) {
      setOpenTabs(remaining);
      return;
    }
    const nextTab = remaining[index] ??
      remaining[index - 1] ?? { href: '/', label: titleFor('/'), icon: navIconForPath('/') };
    setOpenTabs(remaining.length ? remaining : [nextTab]);
    router.push(nextTab.href);
  }

  function closeOtherTabs() {
    const active = openTabs.find((tab) => tab.href === pathname);
    if (active) setOpenTabs([active]);
  }

  function closeTabsToRight() {
    const index = openTabs.findIndex((tab) => tab.href === pathname);
    if (index >= 0) setOpenTabs(openTabs.slice(0, index + 1));
  }

  function closeAllTabs() {
    const homeTab: OpsTab = { href: '/', label: titleFor('/'), icon: navIconForPath('/') };
    setOpenTabs([homeTab]);
    if (pathname !== '/') router.push('/');
  }

  if (isStandalone) return <>{children}</>;
  if (!loggedIn || access.loading) {
    return (
      <div className="ops-access-loading" role="status">
        Yetkiler yükleniyor…
      </div>
    );
  }
  if (access.error)
    return (
      <div className="ops-access-loading" role="alert">
        Oturum doğrulanamadı. Giriş sayfasına yönlendiriliyorsunuz.
      </div>
    );
  if (pageDenied)
    return (
      <div className="ops-access-loading" role="status">
        Erişim denetleniyor…
      </div>
    );

  return (
    <div
      className={navOpen ? 'ops-shell ops-shell--nav' : 'ops-shell'}
      data-admin-theme="fastfood-navy"
    >
      <a href="#admin-main" className="ops-skip">
        İçeriğe geç
      </a>
      {navOpen && (
        <button
          type="button"
          className="ops-side__scrim"
          aria-label="Menüyü kapat"
          onClick={closeMobileNav}
        />
      )}
      <aside
        id="admin-rail"
        ref={railRef}
        className="ops-rail"
        aria-label="Uygulama menüsü"
        role={navOpen ? 'dialog' : undefined}
        aria-modal={navOpen ? true : undefined}
      >
        <div className="ops-side__head">
          <Link
            href="/"
            className="ops-side__brand"
            aria-label="Burger Home ana sayfa"
            onClick={() => setNavOpen(false)}
          >
            <span className="ops-side__mark" aria-hidden="true">
              BH
            </span>
            <span className="ops-side__brand-copy">
              <strong>BURGER HOME</strong>
              <small>Yönetim merkezi</small>
            </span>
          </Link>
          <button
            type="button"
            ref={mobileCloseRef}
            className="ops-side__mobile-close"
            aria-label="Menüyü kapat"
            onClick={closeMobileNav}
          >
            <OpsIcon name="close" />
          </button>
        </div>
        <div className="ops-side__filter">
          <span className="ops-side__filter-icon">
            <OpsIcon name="search" />
          </span>
          <input
            ref={navFilterRef}
            type="search"
            value={navFilter}
            onChange={(event) => setNavFilter(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || navFilter.length === 0) return;
              event.preventDefault();
              setNavFilter('');
            }}
            placeholder="Menüde ara"
            aria-label="Menüde ara"
            autoComplete="off"
            spellCheck={false}
            data-admin-nav-search
          />
          {navFilter.length > 0 ? (
            <button
              type="button"
              className="ops-side__filter-clear"
              onClick={() => {
                setNavFilter('');
                navFilterRef.current?.focus();
              }}
              aria-label="Menü filtresini temizle"
              data-admin-nav-search-clear
            >
              <OpsIcon name="close" />
            </button>
          ) : null}
        </div>
        <nav className="ops-side__nav" aria-label="Birincil navigasyon">
          {sections.length === 0 ? (
            <p className="ops-side__empty" data-admin-nav-empty>
              &ldquo;{navFilter}&rdquo; ile eşleşen bir bölüm yok.
            </p>
          ) : null}
          {sections.map((section) => (
            <div
              key={section.id}
              className={
                section.pinned ? 'ops-side__section ops-side__section--pinned' : 'ops-side__section'
              }
              data-admin-nav-section={section.id}
            >
              <p className="ops-side__section-label">{section.label}</p>
              <ul className="ops-side__list">
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={
                          active ? 'ops-side__link ops-side__link--active' : 'ops-side__link'
                        }
                        aria-current={active ? 'page' : undefined}
                        aria-label={item.label}
                        data-admin-nav-item={item.id}
                        onClick={() => setNavOpen(false)}
                      >
                        <span className="ops-side__icon" aria-hidden="true">
                          <OpsIcon name={NAV_ICON[item.id] ?? 'circle'} />
                        </span>
                        <span className="ops-side__text">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <header className="ops-topbar">
        <button
          type="button"
          ref={menuButtonRef}
          className="ops-topbar__menu"
          aria-label={navOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-controls="admin-rail"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          <OpsIcon name={navOpen ? 'close' : 'menu'} />
        </button>
        <div className="ops-topbar__context">
          <h1 className="ops-topbar__title">{titleFor(pathname)}</h1>
        </div>
        <div className="ops-topbar__tools">
          {!access.isSuperAdmin ? (
            <span className="ops-scope-tag">{branch.selected?.name ?? 'Atanmış şube'}</span>
          ) : isA2Path(pathname) ? (
            <span className="ops-scope-tag">Küresel katalog</span>
          ) : pathname === '/branches' ? (
            <span className="ops-scope-tag">Küresel şube listesi</span>
          ) : a4ScopeTag(pathname) ? (
            <span className="ops-scope-tag">{a4ScopeTag(pathname)}</span>
          ) : isA5Path(pathname) && a5ScopeTag(pathname) ? (
            <span className="ops-scope-tag">{a5ScopeTag(pathname)}</span>
          ) : (
            <select
              className="ops-select"
              aria-label={pathname === '/couriers' ? 'Teslimat şubesi' : 'Şube'}
              value={routeBranchId(pathname) ?? branch.branchId}
              onChange={(e) => {
                const next = e.target.value;
                branch.setBranchId(next);
                if (isRouteIdentifiedBranchPath(pathname)) {
                  router.push(`/branches/${next}`);
                }
              }}
              disabled={branch.loading || branch.branches.length === 0}
            >
              {branch.branches.length === 0 ? (
                <option value={branch.branchId}>Şube yükleniyor</option>
              ) : (
                branch.branches.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))
              )}
            </select>
          )}
          <SyncIndicator
            lastSyncAt={sync.lastSyncAt}
            stale={sync.stale}
            refreshing={sync.refreshing}
            onRefresh={() => void sync.refresh()}
          />
          <button
            type="button"
            className="ops-topbar__theme-toggle"
            aria-label={colorMode === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            aria-pressed={colorMode === 'light'}
            title={colorMode === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            onClick={() => setAdminColorMode(colorMode === 'dark' ? 'light' : 'dark')}
          >
            <OpsIcon name={colorMode === 'dark' ? 'light_mode' : 'dark_mode'} />
            <span>{colorMode === 'dark' ? 'Açık tema' : 'Koyu tema'}</span>
          </button>
          {loggedIn ? (
            <ActionButton
              onClick={() => {
                clearStaffSession();
                router.push('/login');
              }}
            >
              Çıkış
            </ActionButton>
          ) : (
            <Link href="/login">
              <ActionButton variant="primary">Giriş</ActionButton>
            </Link>
          )}
        </div>
      </header>
      {tabsReady && (
        <OpsTabs
          tabs={openTabs}
          activeHref={pathname}
          onSelect={selectTab}
          onClose={closeTab}
          onCloseOthers={closeOtherTabs}
          onCloseToRight={closeTabsToRight}
          onCloseAll={closeAllTabs}
          onRefresh={() => router.refresh()}
        />
      )}
      <main id="admin-main" className="ops-main" aria-label="Yönetim içeriği">
        {children}
      </main>
    </div>
  );
}
