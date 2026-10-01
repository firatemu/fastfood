'use client';

import type { CourierDelivery } from '@fastfood/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { api, deliveriesResponseSchema } from '../../lib/api';

const activeStatuses = new Set(['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY']);
const statusLabels: Record<string, string> = {
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Şubeden alındı',
  ON_THE_WAY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
  UNASSIGNED: 'Atama bekliyor',
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ACTIVE' | 'ALL' | 'DELIVERED'>('ACTIVE');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.request({ path: '/courier/deliveries', schema: deliveriesResponseSchema });
      setDeliveries(result.data);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Seferler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const counts = {
    active: deliveries.filter((delivery) => activeStatuses.has(delivery.status)).length,
    total: deliveries.length,
    delivered: deliveries.filter((delivery) => delivery.status === 'DELIVERED').length,
  };
  const visibleDeliveries = deliveries.filter((delivery) =>
    filter === 'ACTIVE'
      ? activeStatuses.has(delivery.status)
      : filter === 'DELIVERED'
        ? delivery.status === 'DELIVERED'
        : true,
  );
  const todayLabel = new Intl.DateTimeFormat('tr-TR', {
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
          <h1>Seferlerin</h1>
          <p>Atanan teslimatlarını ve gün içindeki ilerlemeni buradan yönet.</p>
        </div>
        <Link className="primary-button" href="/claim">
          ⌗ <span>QR ile teslimat al</span>
        </Link>
      </div>

      <section className="metric-row" aria-label="Günlük teslimat özeti">
        <div className="metric-tile accent">
          <span>AKTİF SEFER</span>
          <strong>{counts.active.toString().padStart(2, '0')}</strong>
          <small>Şu an devam ediyor</small>
          <i>↗</i>
        </div>
        <div className="metric-tile">
          <span>TOPLAM SEFER</span>
          <strong>{counts.total.toString().padStart(2, '0')}</strong>
          <small>Kurye hesabına atanmış</small>
        </div>
        <div className="metric-tile">
          <span>TAMAMLANAN</span>
          <strong>{counts.delivered.toString().padStart(2, '0')}</strong>
          <small>Başarıyla teslim edildi</small>
        </div>
        <div className="shift-tile">
          <span className="shift-icon">◷</span>
          <div>
            <b>İyi sürüşler!</b>
            <small>Güvenli sürüş, mutlu teslimat.</small>
          </div>
        </div>
      </section>

      <section className="dispatch-layout">
        <div className="dispatch-list">
          <div className="section-top">
            <div>
              <span className="eyebrow">CANLI SEFER PANOSU</span>
              <h2>
                Teslimat kuyruğu <span className="count-badge">{visibleDeliveries.length}</span>
              </h2>
            </div>
            <button className="icon-refresh" onClick={() => void refresh()} aria-label="Yenile">
              ↻
            </button>
          </div>
          <div className="filter-tabs" role="group" aria-label="Teslimat filtresi">
            <button className={filter === 'ACTIVE' ? 'selected' : ''} onClick={() => setFilter('ACTIVE')}>
              Aktif <b>{counts.active}</b>
            </button>
            <button className={filter === 'ALL' ? 'selected' : ''} onClick={() => setFilter('ALL')}>
              Tümü
            </button>
            <button
              className={filter === 'DELIVERED' ? 'selected' : ''}
              onClick={() => setFilter('DELIVERED')}
            >
              Tamamlanan
            </button>
          </div>

          {loading ? (
            <div className="empty-panel" role="status">Seferler yükleniyor…</div>
          ) : error ? (
            <div className="empty-panel" role="alert">
              <b>Bağlantı kurulamadı</b>
              <p>{error}</p>
              <button onClick={() => void refresh()}>Yeniden dene</button>
            </div>
          ) : visibleDeliveries.length === 0 ? (
            <div className="empty-panel">
              <span>⌁</span>
              <b>Şimdilik sefer yok</b>
              <p>Yeni atamalar geldiğinde burada görünecek.</p>
              <Link href="/claim">QR kodla teslimat al →</Link>
            </div>
          ) : (
            <div className="delivery-rows">
              {visibleDeliveries.map((delivery, index) => (
                <Link
                  href={`/deliveries/${delivery.id}`}
                  key={delivery.id}
                  className="delivery-row"
                >
                  <div className="order-mark">{String(index + 1).padStart(2, '0')}</div>
                  <div className="delivery-main">
                    <b>{delivery.recipientName || 'Alıcı bilgisi yok'}</b>
                    <span>{delivery.addressLine || 'Adres bilgisi mevcut değil'}</span>
                    <small>SİPARİŞ · {delivery.orderId.slice(-8).toUpperCase()}</small>
                  </div>
                  <div className={`status-chip ${delivery.status.toLowerCase()}`}>
                    {statusLabels[delivery.status]}
                  </div>
                  <span className="row-arrow">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="dispatch-aside">
          <div className="route-slip-head">
            <div>
              <span className="eyebrow">KURYE NOTU</span>
              <h3>Her teslimat<br />bir iz bırakır.</h3>
            </div>
            <span className="route-stamp">FF<br />GO</span>
          </div>
          <div className="route-slip-body">
            <div className="slip-perforation" />
            <div className="slip-point">
              <i className="origin-point" />
              <div><small>SEFER DURUMU</small><b>Atama → teslimat</b></div>
            </div>
            <div className="slip-path" />
            <div className="slip-point">
              <i className="target-point" />
              <div><small>GÜVENLİK</small><b>Web’den konum gönderilmez</b></div>
            </div>
          </div>
          <p className="aside-note">Kurye Web cihaz konumunu istemez veya arka planda göndermez.</p>
          <Link href="/claim" className="outline-button">
            QR kod ile sefer al <span>↗</span>
          </Link>
        </aside>
      </section>
    </>
  );
}
