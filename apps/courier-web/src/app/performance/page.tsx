'use client';

import type { CourierDelivery, CourierPerformance } from '@fastfood/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ChartIcon,
  HistoryIcon,
  QrIcon,
  RefreshIcon,
  RouteIcon,
  StoreIcon,
} from '../../components/icons';
import { useSession } from '../../components/session-provider';
import {
  api,
  courierErrorMessage,
  deliveriesResponseSchema,
  formatDateTimeTr,
  formatDurationMinutes,
  formatTryMinor,
  performanceResponseSchema,
} from '../../lib/api';

export default function PerformancePage() {
  const { profile } = useSession();
  const [perf, setPerf] = useState<CourierPerformance | null>(null);
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    const [perfRes, listRes] = await Promise.allSettled([
      api.request({
        path: '/courier/me/performance',
        schema: performanceResponseSchema,
      }),
      api.request({
        path: '/courier/deliveries',
        schema: deliveriesResponseSchema,
      }),
    ]);

    if (perfRes.status === 'fulfilled') {
      setPerf(perfRes.value.data);
    } else {
      setError(courierErrorMessage(perfRes.reason, 'Performans verileri alınamadı.'));
    }

    if (listRes.status === 'fulfilled') {
      setDeliveries(listRes.value.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(false);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const recentDelivered = useMemo(
    () => deliveries.filter((d) => d.status === 'DELIVERED').slice(0, 6),
    [deliveries],
  );

  const activeCount = perf?.activeCount ?? profile?.activeDeliveriesCount ?? 0;
  const maxActive = perf?.maxActiveDeliveries ?? profile?.maxActiveDeliveries ?? 3;
  const capacityPct = maxActive > 0 ? Math.min(100, Math.round((activeCount / maxActive) * 100)) : 0;
  const completionPct = Math.round(perf?.completionRatePercent ?? 100);
  const totalTipFormatted = formatTryMinor(perf?.totalTipMinor ?? '0') ?? '₺0,00';

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">VARDİYA & PERFORMANS ÖZETİ</div>
          <h1>Kurye Performans Göstergeleri</h1>
          <p>
            Günlük teslimat hızını, tamamlama oranını, kapasite kullanımını ve kazandığın
            bahşiş toplamını takip et.
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline-button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
          >
            <RefreshIcon size={16} />
            <span>{refreshing ? 'Yenileniyor…' : 'Yenile'}</span>
          </button>
          <Link className="primary-button" href="/deliveries">
            <RouteIcon size={16} />
            <span>Seferlere git</span>
          </Link>
        </div>
      </div>

      {error && (
        <p className="detail-error" role="alert">
          {error}
        </p>
      )}

      {loading && !perf ? (
        <div className="empty-panel">
          <p className="muted-note">Performans metrikleri hesaplanıyor…</p>
        </div>
      ) : (
        <>
          <section className="perf-summary-grid" aria-label="Performans KPI kartları">
            <div className="metric-tile accent">
              <span>BUGÜN TESLİM EDİLEN</span>
              <strong>{perf?.todayDeliveredCount ?? 0}</strong>
              <small>Europe/Istanbul gün içi</small>
            </div>
            <div className="metric-tile">
              <span>TOPLAM TESLİM EDİLEN</span>
              <strong>{perf?.deliveredCount ?? 0}</strong>
              <small>Tüm dönem başarıyla kapanan</small>
            </div>
            <div className="metric-tile">
              <span>AKTİF SEFER / KAPASİTE</span>
              <strong>
                {activeCount}
                <small className="metric-cap">/{maxActive}</small>
              </strong>
              <small>Bekleyen atanan: {perf?.assignedCount ?? 0}</small>
            </div>
            <div className="metric-tile">
              <span>ORT. TESLİMAT SÜRESİ</span>
              <strong>
                {perf?.avgDeliveryMinutes != null ? `${perf.avgDeliveryMinutes} dk` : '—'}
              </strong>
              <small>Teslim alma ile varış arası</small>
            </div>
            <div className="metric-tile">
              <span>BAŞARI ORANI</span>
              <strong>%{completionPct}</strong>
              <small>İptal sayısı: {perf?.cancelledCount ?? 0}</small>
            </div>
            <div className="metric-tile metric-tile--warm">
              <span>TOPLAM BAHŞİŞ</span>
              <strong>{totalTipFormatted}</strong>
              <small>Tamamlanan teslimatlardan</small>
            </div>
          </section>

          <section className="perf-bars-grid" aria-label="Kapasite ve başarı çubukları">
            <article className="panel-card">
              <div className="panel-card-header">
                <div className="panel-title-group">
                  <span className="eyebrow">TESLİMAT KALİTESİ</span>
                  <h2>Tamamlama & Başarı Oranı</h2>
                </div>
                <span className="count-badge">%{completionPct}</span>
              </div>
              <div className="capacity-box">
                <div className="capacity-stats">
                  <span>Teslim edilen: {perf?.deliveredCount ?? 0}</span>
                  <strong>İptal: {perf?.cancelledCount ?? 0}</strong>
                </div>
                <div className="progress-track progress-track--lg" aria-hidden="true">
                  <div className="progress-fill" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              <p className="muted-note">
                Atanan toplam görevler içerisinden başarıyla teslim edilme oranı gösterilir.
              </p>
            </article>

            <article className="panel-card">
              <div className="panel-card-header">
                <div className="panel-title-group">
                  <span className="eyebrow">ANLIK SEFER DOLULUĞU</span>
                  <h2>Vardiya Kapasite Kullanımı</h2>
                </div>
                <span className="count-badge">
                  {activeCount}/{maxActive}
                </span>
              </div>
              <div className="capacity-box">
                <div className="capacity-stats">
                  <span>Aktif paket: {activeCount}</span>
                  <strong>Boş slot: {Math.max(0, maxActive - activeCount)}</strong>
                </div>
                <div className="progress-track progress-track--lg" aria-hidden="true">
                  <div className="progress-fill" style={{ width: `${capacityPct}%` }} />
                </div>
              </div>
              <div className="quick-actions-row">
                <Link className="outline-button compact-btn" href="/claim">
                  <QrIcon size={15} />
                  <span>QR ile yeni paket al</span>
                </Link>
                <Link className="outline-button compact-btn" href="/history">
                  <HistoryIcon size={15} />
                  <span>Tüm geçmiş</span>
                </Link>
              </div>
            </article>
          </section>

          <section className="perf-recent-card" aria-label="Son tamamlanan teslimatlar">
            <div className="panel-card-header">
              <div className="panel-title-group">
                <span className="eyebrow">SON TESLİMAT KAYITLARI</span>
                <h2>Son Tamamlanan Paketler</h2>
              </div>
              <span className="icon-badge">
                <ChartIcon size={16} />
              </span>
            </div>

            {recentDelivered.length === 0 ? (
              <p className="muted-note">Henüz tamamlanmış teslimat kaydı bulunmuyor.</p>
            ) : (
              <div className="claim-pool-list">
                {recentDelivered.map((item) => {
                  const code =
                    item.order?.displayNumber ?? `SP-${item.orderId.slice(-6).toUpperCase()}`;
                  const duration = formatDurationMinutes(
                    item.pickedUpAt ?? item.createdAt,
                    item.deliveredAt,
                  );
                  const tipText =
                    item.order?.tipMinor && Number(item.order.tipMinor) > 0
                      ? formatTryMinor(item.order.tipMinor)
                      : null;
                  return (
                    <div key={item.id} className="claim-pool-item">
                      <div className="delivery-card-top">
                        <div className="delivery-card-ids">
                          <span className="order-code-pill">#{code}</span>
                          {item.branch && (
                            <span className="branch-pill">
                              <StoreIcon size={12} />
                              <span>{item.branch.name}</span>
                            </span>
                          )}
                        </div>
                        <span className="status-chip delivered">Teslim edildi</span>
                      </div>
                      <p className="delivery-address">
                        {item.recipientName || 'Alıcı'} — {item.addressLine || 'Adres kayıtlı değil'}
                      </p>
                      <div className="delivery-card-meta">
                        <span className="meta-stat">
                          Teslim: {formatDateTimeTr(item.deliveredAt ?? item.updatedAt)}
                        </span>
                        {duration != null && (
                          <span className="meta-stat">Süre: {duration} dk</span>
                        )}
                        {tipText && <span className="meta-stat">Bahşiş: {tipText}</span>}
                        <Link
                          className="inline-more-link"
                          href={`/deliveries/${item.id}`}
                        >
                          Detay
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
