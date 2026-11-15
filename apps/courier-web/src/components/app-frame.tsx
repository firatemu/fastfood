'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  ChartIcon,
  HistoryIcon,
  LogoutIcon,
  QrIcon,
  RouteIcon,
  StoreIcon,
  UserIcon,
} from './icons';
import { useSession } from './session-provider';

const NAV_ITEMS = [
  { href: '/deliveries', label: 'Seferler', shortLabel: 'Seferler', Icon: RouteIcon },
  { href: '/claim', label: 'QR Teslim Al', shortLabel: 'QR Al', Icon: QrIcon },
  { href: '/history', label: 'Geçmiş', shortLabel: 'Geçmiş', Icon: HistoryIcon },
  { href: '/performance', label: 'Performans', shortLabel: 'Performans', Icon: ChartIcon },
  { href: '/profile', label: 'Profil & Şubeler', shortLabel: 'Profil', Icon: UserIcon },
] as const;

function getInitials(displayName?: string | null, userId?: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toLocaleUpperCase('tr-TR');
    }
    return displayName.slice(0, 2).toLocaleUpperCase('tr-TR');
  }
  return userId?.slice(0, 2).toUpperCase() ?? 'KR';
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const session = useSession();
  const profile = session.profile;

  const primaryBranch = profile?.branches.find((b) => b.isPrimary) ?? profile?.branches[0];
  const activeCount = profile?.activeDeliveriesCount ?? 0;
  const maxActive = profile?.maxActiveDeliveries ?? 3;
  const capacityPct = maxActive > 0 ? Math.min(100, Math.round((activeCount / maxActive) * 100)) : 0;
  const initials = getInitials(profile?.displayName, session.userId);

  return (
    <div className="app-frame">
      <aside className="rail" aria-label="Ana menü">
        <div className="rail-head">
          <Link href="/deliveries" className="brand-mark" aria-label="FASTFOOD Kurye Ana Sayfa">
            f<span>.</span>
          </Link>
          <div className="brand-copy">
            <strong>FASTFOOD</strong>
            <span>KURYE MERKEZİ</span>
          </div>
        </div>

        <div className="rail-profile-card">
          <div className="rail-profile-top">
            <span className="avatar avatar--dark">{initials}</span>
            <div className="rail-profile-meta">
              <strong>{profile?.displayName ?? 'Aktif Kurye'}</strong>
              <small>{profile?.username ?? 'Oturum açık'}</small>
            </div>
          </div>
          {primaryBranch && (
            <div className="rail-branch-chip">
              <StoreIcon size={13} />
              <span>{primaryBranch.name}</span>
            </div>
          )}
          <div className="rail-capacity">
            <div className="rail-capacity-row">
              <span>Aktif kapasite</span>
              <b>
                {activeCount}/{maxActive}
              </b>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${capacityPct}%` }} />
            </div>
          </div>
        </div>

        <div className="rail-label">OPERASYON</div>
        <nav className="rail-nav" aria-label="Kurye sayfaları">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = path.startsWith(href);
            return (
              <Link
                key={href}
                className={`rail-link ${active ? 'active' : ''}`}
                href={href}
                aria-current={active ? 'page' : undefined}
              >
                <span className="rail-icon">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rail-bottom">
          <span className="online-dot" aria-hidden="true" />
          <div className="rail-status-copy">
            <b>{profile?.isActive === false ? 'Hesap Pasif' : 'Göreve Hazır'}</b>
            <small>{profile?.branches.length ?? 0} yetkili şube</small>
          </div>
          <button
            type="button"
            className="rail-logout-btn"
            onClick={() => void session.signOut()}
            aria-label="Oturumu kapat"
            title="Oturumu kapat"
          >
            <LogoutIcon size={17} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <Link href="/deliveries" className="mobile-brand" aria-label="FASTFOOD Kurye">
              f<span>.</span>
            </Link>
            <div className="topbar-heading-group">
              <span className="eyebrow">FASTFOOD · KURYE OPERASYONU</span>
              <span className="topbar-title">
                {profile?.displayName ?? 'Teslimat Merkezi'}
                {primaryBranch ? ` · ${primaryBranch.name}` : ''}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <span className="capacity-pill" title="Aktif sefer / maksimum eşzamanlı teslimat">
              <i className="capacity-dot" aria-hidden="true" />
              <span>
                Kapasite: <b>{activeCount}/{maxActive}</b>
              </span>
            </span>
            <Link href="/claim" className="topbar-qr-link">
              <QrIcon size={15} />
              <span>QR Al</span>
            </Link>
            <Link
              href="/profile"
              className="avatar"
              aria-label="Profil ve şubelerim"
              title={profile?.displayName ?? 'Kurye Profili'}
            >
              {initials}
            </Link>
            <button
              type="button"
              className="topbar-logout-btn"
              onClick={() => void session.signOut()}
              aria-label="Oturumu kapat"
              title="Oturumu kapat"
            >
              <LogoutIcon size={17} />
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Alt navigasyon">
        {NAV_ITEMS.map(({ href, shortLabel, Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-link ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
