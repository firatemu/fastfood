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
type NavBadge = {
  text: string;
  tone?: 'ember' | 'live' | 'accent' | 'neutral';
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: NavBadge;
};

type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

const GROUPS: readonly NavGroup[] = [
  {
    label: 'Hesap Yönetimi',
    items: [
      { href: '/account', label: 'Profil', icon: 'person' },
      { href: '/account/addresses', label: 'Adresler', icon: 'location_on' },
      { href: '/account/settings', label: 'Tercihler', icon: 'tune' },
      { href: '/account/security', label: 'Güvenlik', icon: 'shield', badge: { text: '2FA', tone: 'neutral' } },
    ],
  },
  {
    label: 'Siparişler',
    items: [
      { href: '/orders', label: 'Siparişler', icon: 'receipt_long', badge: { text: 'CANLI', tone: 'live' } },
    ],
  },
  {
    label: 'Ayrıcalıklar',
    items: [
      { href: '/account/club', label: 'Burger Home Club', icon: 'local_fire_department', badge: { text: 'VIP', tone: 'ember' } },
      { href: '/account/spin', label: 'Ateş Çarkıfelek', icon: 'stars', badge: { text: 'ÇEVİR', tone: 'ember' } },
      { href: '/account/favorites', label: 'Favoriler', icon: 'favorite' },
    ],
  },
  {
    label: 'Destek & İletişim',
    items: [
      { href: '/account/notifications', label: 'Bildirimler', icon: 'notifications', badge: { text: 'YENİ', tone: 'accent' } },
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
          <div className="ff-identity-avatar-ring">
            <span className="ff-identity-mark" aria-hidden>
              {initialsOf(identity.name)}
            </span>
            <span className="ff-identity-live-dot" title="Aktif Oturum" />
          </div>
          <div className="ff-identity-text">
            <div className="ff-identity-name-row">
              <span className="ff-identity-name">{identity.name}</span>
            </div>
            <span className="ff-identity-meta">{identity.meta}</span>
            <div className="ff-identity-badge">
              <span className="ff-identity-badge-spark">🔥</span>
              <span>BURGER CLUB</span>
            </div>
          </div>
        </div>
      ) : null}

      {GROUPS.map((group, index) => (
        <div key={group.label} className="ff-rail-group">
          {index > 0 ? <div className="ff-rail-divider" aria-hidden /> : null}
          <div className="ff-rail-label">
            <span className="ff-rail-label-dot" aria-hidden />
            <span>{group.label}</span>
          </div>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="ff-rail-item"
              >
                <div className="ff-rail-icon-box">
                  <MaterialIcon name={item.icon} />
                </div>
                <span className="ff-rail-item-label">{item.label}</span>
                {item.badge ? (
                  <span className={`ff-rail-badge ff-rail-badge--${item.badge.tone ?? 'neutral'}`}>
                    {item.badge.tone === 'live' ? <span className="ff-rail-pulse-dot" /> : null}
                    {item.badge.text}
                  </span>
                ) : null}
                <span className="ff-rail-chevron" aria-hidden>
                  <MaterialIcon name="chevron_right" />
                </span>
              </Link>
            );
          })}
        </div>
      ))}

      <div className="ff-rail-divider" aria-hidden />
      <div className="ff-rail-footer">
        <button
          type="button"
          className="ff-rail-item"
          data-tone="danger"
          data-ff-logout
          disabled={leaving}
          onClick={() => void handleLogout()}
        >
          <div className="ff-rail-icon-box">
            <MaterialIcon name={leaving ? 'hourglass_empty' : 'logout'} />
          </div>
          <span className="ff-rail-item-label">{leaving ? 'Çıkılıyor...' : 'Çıkış Yap'}</span>
          <span className="ff-rail-chevron" aria-hidden>
            <MaterialIcon name="arrow_forward" />
          </span>
        </button>
      </div>
    </nav>
  );
}
