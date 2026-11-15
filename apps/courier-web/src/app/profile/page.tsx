'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  CheckCircleIcon,
  LogoutIcon,
  MapPinIcon,
  PhoneIcon,
  QrIcon,
  RefreshIcon,
  RouteIcon,
  StoreIcon,
  UserIcon,
} from '../../components/icons';
import { useSession } from '../../components/session-provider';
import { formatDateTimeTr } from '../../lib/api';

export default function ProfilePage() {
  const { profile, userId, refreshProfile, signOut } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  }

  const activeCount = profile?.activeDeliveriesCount ?? 0;
  const maxActive = profile?.maxActiveDeliveries ?? 3;
  const capacityPct = maxActive > 0 ? Math.min(100, Math.round((activeCount / maxActive) * 100)) : 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            KURYE HESABI <span className="heading-dot" /> PROFİL & YETKİLİ ŞUBELER
          </div>
          <h1>Profil & Şubeler</h1>
          <p>Kimlik bilgilerin, taşıma kapasiten ve bağlı olduğun şube kayıtları.</p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline-button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            <RefreshIcon size={16} />
            <span>{refreshing ? 'Yenileniyor…' : 'Bilgileri yenile'}</span>
          </button>
          <button
            type="button"
            className="danger-outline-button"
            onClick={() => void signOut()}
          >
            <LogoutIcon size={16} />
            <span>Oturumu kapat</span>
          </button>
        </div>
      </div>

      <div className="profile-grid">
        <section className="panel-card">
          <div className="panel-card-header">
            <div className="panel-title-group">
              <span className="icon-badge">
                <UserIcon size={18} />
              </span>
              <div>
                <span className="eyebrow">HESAP BİLGİLERİ</span>
                <h2>{profile?.displayName ?? 'Kurye Kullanıcısı'}</h2>
              </div>
            </div>
            <span className={`status-chip ${profile?.isActive === false ? 'cancelled' : 'delivered'}`}>
              {profile?.isActive === false ? 'Pasif' : 'Aktif'}
            </span>
          </div>

          <dl className="info-list">
            <div>
              <dt>Kullanıcı Adı / E-posta</dt>
              <dd>{profile?.username ?? '—'}</dd>
            </div>
            <div>
              <dt>Telefon Numarası</dt>
              <dd>
                {profile?.phone ? (
                  <a className="inline-link" href={`tel:${profile.phone}`}>
                    <PhoneIcon size={14} />
                    <span>{profile.phone}</span>
                  </a>
                ) : (
                  'Kayıtlı telefon yok'
                )}
              </dd>
            </div>
            <div>
              <dt>Kurye Kayıt ID</dt>
              <dd className="mono">{profile?.id ?? userId ?? '—'}</dd>
            </div>
            <div>
              <dt>Son Güncelleme</dt>
              <dd>{formatDateTimeTr(profile?.updatedAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel-card">
          <div className="panel-card-header">
            <div className="panel-title-group">
              <span className="icon-badge icon-badge--accent">
                <RouteIcon size={18} />
              </span>
              <div>
                <span className="eyebrow">SEFER KAPASİTESİ</span>
                <h2>Eşzamanlı Teslimat Limiti</h2>
              </div>
            </div>
            <span className="count-badge">
              {activeCount} / {maxActive}
            </span>
          </div>

          <div className="capacity-box">
            <div className="capacity-stats">
              <div>
                <small>Şu an aktif sefer</small>
                <strong>{activeCount}</strong>
              </div>
              <div>
                <small>Boşta slot</small>
                <strong>{profile?.availableCapacitySlots ?? Math.max(0, maxActive - activeCount)}</strong>
              </div>
              <div>
                <small>Maksimum limit</small>
                <strong>{maxActive}</strong>
              </div>
            </div>
            <div className="progress-track progress-track--lg" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${capacityPct}%` }} />
            </div>
            <p className="muted-note">
              Aynı anda en fazla {maxActive} aktif teslimat taşıyabilirsin. Yeni sefer almak için QR
              okutma ekranını veya şube havuzunu kullanabilirsin.
            </p>
          </div>

          <div className="quick-actions-row">
            <Link href="/deliveries" className="outline-button">
              <RouteIcon size={16} />
              <span>Aktif seferlere git</span>
            </Link>
            <Link href="/claim" className="primary-button">
              <QrIcon size={16} />
              <span>QR ile sefer al</span>
            </Link>
          </div>
        </section>
      </div>

      <section className="panel-card profile-branches-section">
        <div className="panel-card-header">
          <div className="panel-title-group">
            <span className="icon-badge">
              <StoreIcon size={18} />
            </span>
            <div>
              <span className="eyebrow">ŞUBE ATAMALARI</span>
              <h2>Yetkili Olduğun Şubeler ({profile?.branches.length ?? 0})</h2>
            </div>
          </div>
        </div>

        {!profile || profile.branches.length === 0 ? (
          <div className="empty-panel">
            <CheckCircleIcon size={24} />
            <b>Şube ataması bulunamadı</b>
            <p>Operasyon yöneticin seni bir şubeye tanımladığında şubelerin burada listelenir.</p>
          </div>
        ) : (
          <div className="branch-grid">
            {profile.branches.map((branch) => {
              const hasCoords = branch.latitude != null && branch.longitude != null;
              const mapsUrl = hasCoords
                ? `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`
                : null;
              return (
                <article
                  key={branch.id}
                  className={`branch-card ${branch.isPrimary ? 'branch-card--primary' : ''}`}
                >
                  <div className="branch-card-top">
                    <div>
                      {branch.code && <span className="branch-code">{branch.code}</span>}
                      <h3>{branch.name}</h3>
                    </div>
                    {branch.isPrimary && <span className="primary-pill">Ana Şube</span>}
                  </div>
                  <p className="branch-address">{branch.addressLine || 'Adres bilgisi yok'}</p>
                  <div className="branch-card-actions">
                    {branch.phone && (
                      <a className="outline-button compact-btn" href={`tel:${branch.phone}`}>
                        <PhoneIcon size={14} />
                        <span>Şubeyi Ara</span>
                      </a>
                    )}
                    {mapsUrl && (
                      <a
                        className="outline-button compact-btn"
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPinIcon size={14} />
                        <span>Haritada Aç</span>
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
