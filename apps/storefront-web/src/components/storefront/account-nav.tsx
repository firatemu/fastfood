'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { logoutCustomer } from '../../lib/storefront/auth';

import { initialsOf, useOptionalAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';

/**
 * The account rail.
 *
 * Structure, not decoration: an identity block, four labelled groups separated
 * by hairlines, and a logout that asks first. The accent appears exactly once
 * per item — a 2px bar on the active row — so "where am I" is answered without
 * a filled block competing with the page's own primary action.
 */
const GROUPS = [
  {
    label: 'Hesap',
    items: [
      { href: '/account', label: 'Profil', icon: 'person' },
      { href: '/account/addresses', label: 'Adresler', icon: 'location_on' },
      { href: '/account/settings', label: 'Tercihler', icon: 'tune' },
      { href: '/account/security', label: 'Güvenlik', icon: 'shield' },
    ],
  },
  {
    label: 'Sipariş',
    items: [{ href: '/orders', label: 'Siparişler', icon: 'receipt_long' }],
  },
  {
    label: 'Ayrıcalıklar',
    items: [
      { href: '/account/club', label: 'Burger Home Club', icon: 'local_fire_department' },
      { href: '/account/spin', label: 'Ateş Çarkıfelek', icon: 'stars' },
      { href: '/account/favorites', label: 'Favoriler', icon: 'favorite' },
    ],
  },
  {
    label: 'Yardım',
    items: [
      { href: '/account/notifications', label: 'Bildirimler', icon: 'notifications' },
      { href: '/account/support', label: 'Destek', icon: 'support_agent' },
    ],
  },
] as const;

/** `/account` itself is a prefix of every child route, so it needs exactness. */
function isActive(pathname: string, href: string): boolean {
  return href === '/account' ? pathname === '/account' : pathname.startsWith(href);
}

export function AccountNav() {
  const pathname = usePathname();
  const ui = useOptionalAccountUi();
  const [leaving, setLeaving] = useState(false);

  const handleLogout = useCallback(async () => {
    setLeaving(true);
    await logoutCustomer();
    window.location.href = '/';
  }, []);

  // Null outside <AccountUiProvider> — see useOptionalAccountUi. `/orders`
  // mounts this nav without the account surface, and its own header already
  // carries the customer badge, so the rail simply omits the identity block.
  const profile = ui?.profile;
  const identity =
    profile?.status === 'ready'
      ? {
          name: profile.profile.displayName ?? 'Misafir',
          meta: profile.profile.email ?? profile.profile.phone ?? '',
        }
      : null;

  return (
    <nav aria-label="Hesap menüsü" data-ff-account-nav>
      {identity ? (
        <div className="ff-identity">
          <span className="ff-identity-mark" aria-hidden>
            {initialsOf(identity.name)}
          </span>
          <span className="ff-identity-text">
            <span className="ff-identity-name">{identity.name}</span>
            <span className="ff-identity-meta">{identity.meta}</span>
          </span>
        </div>
      ) : null}

      {GROUPS.map((group, index) => (
        <div key={group.label}>
          {index > 0 ? <div className="ff-rail-divider" aria-hidden /> : null}
          <div className="ff-rail-label">{group.label}</div>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="ff-rail-item"
              >
                <MaterialIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}

      <div className="ff-rail-divider" aria-hidden />
      <button
        type="button"
        className="ff-rail-item"
        data-tone="danger"
        data-ff-logout
        disabled={leaving}
        onClick={() => void handleLogout()}
      >
        <MaterialIcon name="logout" />
        <span>{leaving ? 'Çıkılıyor' : 'Çıkış yap'}</span>
      </button>
    </nav>
  );
}