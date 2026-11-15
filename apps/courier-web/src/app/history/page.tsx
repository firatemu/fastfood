'use client';

import type { CourierDelivery } from '@fastfood/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PackageIcon, RefreshIcon, RouteIcon, SearchIcon, StoreIcon } from '../../components/icons';
import {
  api,
  courierErrorMessage,
  deliveriesResponseSchema,
  formatDateTimeTr,
  formatDurationMinutes,
  formatTryMinor,
  statusLabel,
} from '../../lib/api';

type HistoryFilter = 'ALL' | 'DELIVERED' | 'CANCELLED';

export default function HistoryPage() {
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);
    try {
      const res = await api.request({
        path: '/courier/deliveries',
        schema: deliveriesResponseSchema,
      });
      setDeliveries(res.data.filter((d) => d.status === 'DELIVERED' || d.status === 'CANCELLED'));
    } catch (err) {
      setError(courierErrorMessage(err, 'Teslimat geçmişi yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory(false);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadHistory]);

  const summary = useMemo(() => {
    const delivered = deliveries.filter((d) => d.status === 'DELIVERED');
    const cancelled = deliveries.filter((d) => d.status === 'CANCELLED');

    const durations = delivered
      .map((d) => formatDurationMinutes(d.pickedUpAt ?? d.createdAt, d.deliveredAt))
      .filter((val): val is number => val != null);

    const avgMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((acc, v) => acc + v, 0) / durations.length)
        : null;

    let totalTipMinor = 0n;
    for (const item of delivered) {
      const tipRaw = item.order?.tipMinor;
      if (tipRaw && /^\d+$/.test(tipRaw)) {
        totalTipMinor += BigInt(tipRaw);
      }
    }

    return {
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      avgMinutes,
      totalTipMinor: totalTipMinor.toString(),
    };
  }, [deliveries]);

  const visibleList = useMemo(() => {
    const byStatus =
      filter === 'ALL' ? deliveries : deliveries.filter((d) => d.status === filter);

    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return byStatus;

    return byStatus.filter((d) => {
      const candidates = [
        d.order?.displayNumber,
        d.recipientName,
        d.addressLine,
        d.branch?.name,
        d.orderId,
      ];
      return candidates.some((val) => val?.toLocaleLowerCase('tr-TR').includes(q));
    });
  }, [deliveries, filter, searchQuery]);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GEÇMİŞ TESLİMATLAR</div>
          <h1>Tamamlanan & İptal Edilen Seferler</h1>
          <p>
            Tamamladığın veya iptal olan teslimatların şube, süre, sipariş özeti ve bahşiş
            detaylarını incele.
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline-button"
            onClick={() => void loadHistory(true)}
            disabled={refreshing}
          >
            <RefreshIcon size={16} />
            <span>{refreshing ? 'Yenileniyor…' : 'Yenile'}</span>
          </button>
          <Link className="primary-button" href="/deliveries">
            <RouteIcon size={16} />
            <span>Aktif seferlere dön</span>
          </Link>
        </div>
      </div>

      {error && (
        <p className="detail-error" role="alert">
          {error}
        </p>
      )}

      <section className="metric-row" aria-label="Geçmiş teslimat özeti">
        <div className="metric-tile accent">
          <span>TESLİM EDİLEN</span>
          <strong>{summary.deliveredCount.toString().padStart(2, '0')}</strong>
          <small>Başarıyla kapanan sipariş</small>
        </div>
        <div className="metric-tile">
          <span>İPTAL EDİLEN</span>
          <strong>{summary.cancelledCount.toString().padStart(2, '0')}</strong>
          <small>İptal statüsündeki kayıt</small>
        </div>
        <div className="metric-tile">
          <span>ORT. TESLİMAT SÜRESİ</span>
          <strong>{summary.avgMinutes != null ? `${summary.avgMinutes} dk` : '—'}</strong>
          <small>Teslim alma ile varış arası</small>
        </div>
        <div className="metric-tile metric-tile--warm">
          <span>TOPLAM BAHŞİŞ</span>
          <strong>{formatTryMinor(summary.totalTipMinor) ?? '₺0,00'}</strong>
          <small>Tamamlanan teslimatlardan</small>
        </div>
      </section>

      <section className="history-toolbar" aria-label="Geçmiş filtreleri">
        <div className="filter-tabs" role="tablist" aria-label="Durum filtresi">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'ALL'}
            className={filter === 'ALL' ? 'selected' : ''}
            onClick={() => setFilter('ALL')}
          >
            Tümü ({deliveries.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'DELIVERED'}
            className={filter === 'DELIVERED' ? 'selected' : ''}
            onClick={() => setFilter('DELIVERED')}
          >
            Teslim Edildi ({summary.deliveredCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'CANCELLED'}
            className={filter === 'CANCELLED' ? 'selected' : ''}
            onClick={() => setFilter('CANCELLED')}
          >
            İptal ({summary.cancelledCount})
          </button>
        </div>

        <div className="search-box">
          <SearchIcon size={15} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sipariş no, müşteri, şube veya adres ara…"
            aria-label="Geçmiş teslimatlarda ara"
          />
        </div>
      </section>

      <section className="history-list-container" aria-label="Geçmiş teslimat kayıtları">
        {loading ? (
          <div className="empty-panel">
            <p className="muted-note">Teslimat geçmişi yükleniyor…</p>
          </div>
        ) : visibleList.length === 0 ? (
          <div className="empty-panel">
            <h3>Kayıt bulunamadı</h3>
            <p className="muted-note">
              Seçili filtre veya arama kriteriyle eşleşen geçmiş teslimat yok.
            </p>
          </div>
        ) : (
          <div className="history-list-grid">
            {visibleList.map((delivery, idx) => {
              const code =
                delivery.order?.displayNumber ?? `SP-${delivery.orderId.slice(-6).toUpperCase()}`;
              const durationMin = formatDurationMinutes(
                delivery.pickedUpAt ?? delivery.createdAt,
                delivery.deliveredAt,
              );
              const totalFormatted = formatTryMinor(delivery.order?.finalPayableMinor);
              const tipFormatted =
                delivery.order?.tipMinor && Number(delivery.order.tipMinor) > 0
                  ? formatTryMinor(delivery.order.tipMinor)
                  : null;
              const itemsPreview =
                delivery.order?.items
                  .map((item) => `${item.quantity}x ${item.productName}`)
                  .join(', ') ?? null;

              return (
                <article key={delivery.id} className="delivery-card">
                  <div className="delivery-card-top">
                    <div className="delivery-card-ids">
                      <span className="order-mark">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="order-code-pill">#{code}</span>
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
                      <p className="delivery-address">
                        {delivery.addressLine || 'Adres bilgisi mevcut değil'}
                      </p>
                      {itemsPreview && (
                        <p className="delivery-items-preview">
                          <PackageIcon size={13} />
                          <span>
                            {delivery.order?.itemCount ?? 0} ürün · {itemsPreview}
                          </span>
                        </p>
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
                        <small>Teslim Zamanı</small>
                        <strong>
                          {formatDateTimeTr(delivery.deliveredAt ?? delivery.updatedAt)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="delivery-badges">
                    {durationMin != null && (
                      <span className="tag-badge tag-badge--mint">Süre: {durationMin} dk</span>
                    )}
                    {tipFormatted && (
                      <span className="tag-badge tag-badge--tip">Bahşiş: {tipFormatted}</span>
                    )}
                    {delivery.order?.contactless && (
                      <span className="tag-badge">Temassız teslimat</span>
                    )}
                  </div>

                  <div className="delivery-card-actions">
                    <Link
                      className="outline-button compact-btn"
                      href={`/deliveries/${delivery.id}`}
                    >
                      Detayları incele
                    </Link>
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
