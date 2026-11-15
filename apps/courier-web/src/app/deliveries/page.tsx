'use client';

import type { CourierDelivery } from '@fastfood/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
  QrIcon,
  RefreshIcon,
  RouteIcon,
  SearchIcon,
  StoreIcon,
} from '../../components/icons';
import { useSession } from '../../components/session-provider';
import {
  api,
  courierErrorMessage,
  deliveriesResponseSchema,
  formatTimeTr,
  formatTryMinor,
  statusLabel,
} from '../../lib/api';

const ACTIVE_STATUSES = new Set(['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY']);

type FilterTab = 'ACTIVE' | 'POOL' | 'DELIVERED' | 'ALL';

function DeliveryCard({
  delivery,
  index,
  isPool,
}: {
  delivery: CourierDelivery;
  index: number;
  isPool: boolean;
}) {
  const orderCode = delivery.order?.displayNumber ?? `SP-${delivery.orderId.slice(-6).toUpperCase()}`;
  const tipFormatted = formatTryMinor(delivery.order?.tipMinor);
  const totalFormatted = formatTryMinor(delivery.order?.finalPayableMinor);
  const hasTip = Boolean(delivery.order?.tipMinor && Number(delivery.order.tipMinor) > 0);
  const itemSummary =
    delivery.order?.items.map((item) => `${item.quantity}x ${item.productName}`).join(', ') ?? null;
  const mapsUrl =
    delivery.latitude != null && delivery.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${delivery.latitude},${delivery.longitude}`
      : null;

  return (
    <article className={`delivery-card ${isPool ? 'delivery-card--pool' : ''}`}>
      <div className="delivery-card-top">
        <div className="delivery-card-ids">
          <span className="order-mark">{String(index + 1).padStart(2, '0')}</span>
          <span className="order-code-pill">#{orderCode}</span>
          {delivery.branch && (
            <span className="branch-pill">
              <StoreIcon size={12} />
              <span>{delivery.branch.name}</span>
            </span>
          )}
        </div>
        <span className={`status-chip ${delivery.status.toLowerCase()}`}>
          {statusLabel(delivery.status)}
        </span>
      </div>

      <div className="delivery-card-body">
        <div className="delivery-card-primary">
          <h3>{delivery.recipientName || 'Alıcı bilgisi yok'}</h3>
          <p className="delivery-address">{delivery.addressLine || 'Adres bilgisi mevcut değil'}</p>
          {itemSummary && (
            <p className="delivery-items-preview">
              <PackageIcon size={13} />
              <span>
                {delivery.order?.itemCount ?? 0} ürün · {itemSummary}
              </span>
            </p>
          )}
          {delivery.deliveryNote && (
            <p className="delivery-inline-note">Not: {delivery.deliveryNote}</p>
          )}
        </div>

        <div className="delivery-card-meta">
          {totalFormatted && (
            <div className="meta-stat">
              <small>Sipariş Tutarı</small>
              <strong>{totalFormatted}</strong>
            </div>
          )}
          <div className="meta-stat">
            <small>{delivery.deliveredAt ? 'Teslim Saati' : 'Atama / Kayıt'}</small>
            <strong>{formatTimeTr(delivery.deliveredAt ?? delivery.createdAt)}</strong>
          </div>
        </div>
      </div>

      {(delivery.order?.contactless ||
        delivery.order?.ecoPackaging ||
        delivery.order?.buildingAccessCode ||
        delivery.order?.scheduledFor ||
        hasTip) && (
        <div className="delivery-badges" aria-label="Teslimat özellikleri">
          {delivery.order?.contactless && <span className="tag-badge">Temassız Teslimat</span>}
          {delivery.order?.buildingAccessCode && (
            <span className="tag-badge tag-badge--warn">
              Kapı Kodu: {delivery.order.buildingAccessCode}
            </span>
          )}
          {delivery.order?.ecoPackaging && <span className="tag-badge tag-badge--mint">Eko Paket</span>}
          {hasTip && tipFormatted && (
            <span className="tag-badge tag-badge--tip">Bahşiş: {tipFormatted}</span>
          )}
          {delivery.order?.scheduledFor && (
            <span className="tag-badge">Planlı: {formatTimeTr(delivery.order.scheduledFor)}</span>
          )}
        </div>
      )}

      <div className="delivery-card-actions">
        {isPool ? (
          <Link href="/claim" className="primary-button compact-btn">
            <QrIcon size={15} />
            <span>QR ile Üzerine Al</span>
          </Link>
        ) : (
          <Link href={`/deliveries/${delivery.id}`} className="primary-button compact-btn">
            <span>Detay & İşlem</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}

        {!isPool && delivery.recipientPhone && (
          <a className="outline-button compact-btn" href={`tel:${delivery.recipientPhone}`}>
            <PhoneIcon size={14} />
            <span>Alıcıyı Ara</span>
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
            <span>Harita</span>
          </a>
        )}
      </div>
    </article>
  );
}

export default function DeliveriesPage() {
  const { profile, refreshProfile } = useSession();
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [poolDeliveries, setPoolDeliveries] = useState<CourierDelivery[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterTab>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const [mineRes, poolRes] = await Promise.all([
          api.request({
            path: '/courier/deliveries',
            schema: deliveriesResponseSchema,
          }),
          api
            .request({
              path: '/courier/deliveries/pool',
              schema: deliveriesResponseSchema,
            })
            .catch(() => ({ data: [] as CourierDelivery[] })),
        ]);
        setDeliveries(mineRes.data);
        setPoolDeliveries(poolRes.data);
        setError('');
        if (manual) void refreshProfile();
      } catch (caught) {
        setError(courierErrorMessage(caught, 'Seferler yüklenemedi.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshProfile],
  );

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(false), 0);
    const timer = window.setInterval(() => void refresh(false), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const counts = useMemo(
    () => ({
      active: deliveries.filter((d) => ACTIVE_STATUSES.has(d.status)).length,
      onTheWay: deliveries.filter((d) => d.status === 'ON_THE_WAY').length,
      delivered: deliveries.filter((d) => d.status === 'DELIVERED').length,
      pool: poolDeliveries.length,
      total: deliveries.length,
    }),
    [deliveries, poolDeliveries],
  );

  const visibleList = useMemo(() => {
    const source =
      filter === 'POOL'
        ? poolDeliveries
        : filter === 'ACTIVE'
          ? deliveries.filter((d) => ACTIVE_STATUSES.has(d.status))
          : filter === 'DELIVERED'
            ? deliveries.filter((d) => d.status === 'DELIVERED')
            : deliveries;

    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return source;
    return source.filter((d) => {
      const fields = [
        d.order?.displayNumber,
        d.recipientName,
        d.addressLine,
        d.branch?.name,
        d.deliveryNote,
        d.orderId,
      ];
      return fields.some((field) => field?.toLocaleLowerCase('tr-TR').includes(q));
    });
  }, [deliveries, poolDeliveries, filter, searchQuery]);

  const maxActive = profile?.maxActiveDeliveries ?? 3;
  const capacityPct = maxActive > 0 ? Math.min(100, Math.round((counts.active / maxActive) * 100)) : 0;

  const todayLabel = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toLocaleUpperCase('tr-TR');

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {todayLabel} <span className="heading-dot" /> GÜNÜN OPERASYONU
          </div>
          <h1>Seferler & Teslimat Kuyruğu</h1>
          <p>Atanan paketlerini, şube havuzunu ve teslimat adımlarını tek ekrandan yönet.</p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline-button"
            onClick={() => void refresh(true)}
            disabled={refreshing}
          >
            <RefreshIcon size={16} />
            <span>{refreshing ? 'Yenileniyor…' : 'Yenile'}</span>
          </button>
          <Link className="primary-button" href="/claim">
            <QrIcon size={16} />
            <span>QR ile teslimat al</span>
          </Link>
        </div>
      </div>

      <section className="metric-row" aria-label="Günlük teslimat özeti">
        <div className="metric-tile accent">
          <span>AKTİF SEFER</span>
          <strong>
            {counts.active.toString().padStart(2, '0')}
            <small className="metric-cap">/{maxActive}</small>
          </strong>
          <small>Şu an üzerinde olan görevler</small>
        </div>
        <div className="metric-tile">
          <span>YOLDAKİ PAKET</span>
          <strong>{counts.onTheWay.toString().padStart(2, '0')}</strong>
          <small>Dağıtımda olan teslimat</small>
        </div>
        <div className="metric-tile">
          <span>TAMAMLANAN</span>
          <strong>{counts.delivered.toString().padStart(2, '0')}</strong>
          <small>Başarıyla teslim edildi</small>
        </div>
        <div className="metric-tile metric-tile--warm">
          <span>ŞUBE HAVUZU</span>
          <strong>{counts.pool.toString().padStart(2, '0')}</strong>
          <small>QR ile alınmayı bekleyen paket</small>
        </div>
      </section>

      <section className="dispatch-layout">
        <div className="dispatch-list">
          <div className="section-top">
            <div>
              <span className="eyebrow">CANLI SEFER PANOSU</span>
              <h2>
                {filter === 'POOL' ? 'Şube havuzu' : 'Teslimat kuyruğu'}{' '}
                <span className="count-badge">{visibleList.length}</span>
              </h2>
            </div>
            <div className="search-box">
              <SearchIcon size={15} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sipariş no, alıcı, adres, şube ara…"
                aria-label="Teslimat ara"
              />
            </div>
          </div>

          <div className="filter-tabs" role="tablist" aria-label="Teslimat filtresi">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'ACTIVE'}
              className={filter === 'ACTIVE' ? 'selected' : ''}
              onClick={() => setFilter('ACTIVE')}
            >
              Aktif <b>{counts.active}</b>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'POOL'}
              className={filter === 'POOL' ? 'selected' : ''}
              onClick={() => setFilter('POOL')}
            >
              Şube Havuzu <b>{counts.pool}</b>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'DELIVERED'}
              className={filter === 'DELIVERED' ? 'selected' : ''}
              onClick={() => setFilter('DELIVERED')}
            >
              Tamamlanan <b>{counts.delivered}</b>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'ALL'}
              className={filter === 'ALL' ? 'selected' : ''}
              onClick={() => setFilter('ALL')}
            >
              Tümü <b>{counts.total}</b>
            </button>
          </div>

          <div className="delivery-list-container">
            {loading ? (
              <div className="empty-panel" role="status">
                Seferler yükleniyor…
              </div>
            ) : error ? (
              <div className="empty-panel" role="alert">
                <b>Bağlantı kurulamadı</b>
                <p>{error}</p>
                <button type="button" onClick={() => void refresh(true)}>
                  Yeniden dene
                </button>
              </div>
            ) : visibleList.length === 0 ? (
              <div className="empty-panel">
                <RouteIcon size={26} />
                <b>
                  {searchQuery.trim()
                    ? 'Arama kriterine uygun sefer bulunamadı'
                    : filter === 'POOL'
                      ? 'Şube havuzunda bekleyen paket yok'
                      : 'Bu sekmede sefer bulunmuyor'}
                </b>
                <p>
                  {searchQuery.trim()
                    ? 'Farklı bir sipariş numarası, müşteri adı veya adres deneyin.'
                    : 'Şubedeki hazır paketleri QR kod okutarak üzerine alabilirsin.'}
                </p>
                <Link href="/claim">QR kodla teslimat al →</Link>
              </div>
            ) : (
              <div className="delivery-cards">
                {visibleList.map((delivery, index) => (
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    index={index}
                    isPool={filter === 'POOL'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="dispatch-aside">
          <div className="route-slip-head">
            <div>
              <span className="eyebrow">VİTES & KAPASİTE</span>
              <h3>
                Aktif taşıma
                <br />
                durumu
              </h3>
            </div>
            <span className="route-stamp">
              {counts.active}/{maxActive}
            </span>
          </div>

          <div className="route-slip-body">
            <div className="aside-capacity-row">
              <span>Doluluk oranı</span>
              <b>%{capacityPct}</b>
            </div>
            <div className="progress-track progress-track--lg" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${capacityPct}%` }} />
            </div>

            {profile && profile.branches.length > 0 && (
              <div className="aside-branch-list">
                <span className="eyebrow">YETKİLİ ŞUBELER ({profile.branches.length})</span>
                <ul>
                  {profile.branches.slice(0, 4).map((branch) => (
                    <li key={branch.id}>
                      <span>{branch.name}</span>
                      {branch.isPrimary && <b>Ana</b>}
                    </li>
                  ))}
                </ul>
                {profile.branches.length > 4 && (
                  <Link href="/profile" className="inline-more-link">
                    Tüm şubeleri gör ({profile.branches.length}) →
                  </Link>
                )}
              </div>
            )}
          </div>

          <p className="aside-note">
            Şubedeki paketlerin QR kodunu okutarak teslimatı anında üzerine alabilirsin. Konum
            bildirimi yalnızca teslimat detayında manuel tetiklenir.
          </p>

          <Link href="/claim" className="outline-button aside-cta">
            <span>QR kod ile sefer al</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </section>
    </>
  );
}
