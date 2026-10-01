'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logoutCustomer } from '../../lib/storefront/auth';

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
    label: 'Sipariş ve ayrıcalıklar',
    items: [
      { href: '/orders', label: 'Siparişler', icon: 'receipt_long' },
      { href: '/account/club', label: 'BURGER HOME CLUB', icon: 'local_fire_department' },
      { href: '/account/spin', label: 'Ateş Çarkı', icon: 'stars' },
      { href: '/account/favorites', label: 'Favoriler', icon: 'favorite' },
      { href: '/account/table', label: 'Masa Kodu', icon: 'qr_code_2' },
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

export function AccountNav({ onLogout }: { onLogout?: () => void }) {
  const pathname = usePathname();

  async function handleLogout() {
    await logoutCustomer();
    onLogout?.();
    window.location.href = '/';
  }

  return (
    <nav aria-label="Hesap menüsü" className="flex flex-col gap-space-md" data-ff-account-nav>
      {GROUPS.map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-1">
          <h2 className="px-space-md font-label-sm text-on-surface-variant">{group.label}</h2>
          {group.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'group relative flex min-h-11 items-center gap-3 rounded-xl px-space-md py-2.5 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container',
                  active
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container-high/70 hover:text-on-surface',
                ].join(' ')}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-secondary-container"
                  />
                ) : null}
                <span
                  aria-hidden
                  className={`material-symbols-outlined text-xl ${active ? 'text-secondary' : 'text-on-surface-variant group-hover:text-secondary'}`}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate font-label-md">{item.label}</span>
                {active ? (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-secondary-container" />
                ) : null}
              </Link>
            );
          })}
        </section>
      ))}
      <div className="mt-1 border-t border-outline-variant/35 pt-2">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-space-md py-2.5 text-left text-error hover:bg-error/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
          data-ff-logout
        >
          <span aria-hidden className="material-symbols-outlined text-xl">
            logout
          </span>
          <span className="font-label-md">Çıkış yap</span>
        </button>
      </div>
    </nav>
  );
}
