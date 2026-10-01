'use client';

import type { CourierDelivery } from '@fastfood/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api, deliveryResponseSchema, navigationResponseSchema } from '../../../lib/api';

const labels: Record<string, string> = {
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Şubeden alındı',
  ON_THE_WAY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
  UNASSIGNED: 'Atama bekliyor',
};
const lifecycle = ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];

export default function DeliveryDetailPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const [delivery, setDelivery] = useState<CourierDelivery>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.request({
        path: `/courier/deliveries/${encodeURIComponent(deliveryId)}`,
        schema: deliveryResponseSchema,
      });
      setDelivery(result.data);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Teslimat yüklenemedi.');
    }
  }, [deliveryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function transition(action: string) {
    setBusy(true);
    setError('');
    try {
      const result = await api.request({
        method: 'POST',
        path: `/courier/deliveries/${encodeURIComponent(deliveryId)}/${action}`,
        body: {},
        schema: deliveryResponseSchema,
      });
      setDelivery(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function openNavigation() {
    try {
      const result = await api.request({
        path: `/courier/deliveries/${encodeURIComponent(deliveryId)}/navigation`,
        schema: navigationResponseSchema,
      });
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Navigasyon bağlantısı alınamadı.');
    }
  }

  if (!delivery && !error) return <div className="empty-panel" role="status">Teslimat yükleniyor…</div>;
  const actionByStatus: Partial<Record<CourierDelivery['status'], readonly [string, string]>> = {
    ASSIGNED: ['pickup', 'Şubeden teslim aldım'],
    PICKED_UP: ['on-the-way', 'Yola çıktım'],
    ON_THE_WAY: ['deliver', 'Teslim edildi'],
  };
  const nextAction = delivery ? actionByStatus[delivery.status] : undefined;
  const currentCourierAssignment = delivery?.assignments
    .filter((assignment) => assignment.courierId === delivery.courierId)
    .at(-1);

  return (
    <>
      <Link className="back-link" href="/deliveries">← Seferlere dön</Link>
      <div className="page-heading detail-heading">
        <div>
          <div className="eyebrow">
            TESLİMAT DETAYI <span className="heading-dot" /> #{deliveryId.slice(-8).toUpperCase()}
          </div>
          <h1>Sefer bilgisi</h1>
          <p>Sadece sana atanmış teslimatın güvenli işlem alanı.</p>
        </div>
        {delivery && <span className={`status-chip ${delivery.status.toLowerCase()}`}>{labels[delivery.status]}</span>}
      </div>

      {error && (
        <div className="form-error detail-error" role="alert">
          {error} <button onClick={() => void load()}>Yeniden dene</button>
        </div>
      )}

      {delivery && (
        <div className="detail-grid">
          <section className="detail-card">
            <div className="card-heading">
              <div><span className="eyebrow">ALICI</span><h2>{delivery.recipientName || 'Alıcı bilgisi yok'}</h2></div>
              <span className="contact-glyph">◎</span>
            </div>
            <div className="detail-line">
              <span className="detail-icon">⌖</span>
              <div><small>TESLİMAT ADRESİ</small><b>{delivery.addressLine || 'Adres bilgisi mevcut değil'}</b></div>
            </div>
            {delivery.deliveryNote && (
              <div className="note-box"><span>TESLİMAT NOTU</span><p>{delivery.deliveryNote}</p></div>
            )}
            <div className="order-ref"><span>SİPARİŞ REFERANSI</span><b>{delivery.orderId}</b></div>
            {currentCourierAssignment && (
              <div className="assignment-ref">
                <span>SANA ATAMA ZAMANI</span>
                <time dateTime={new Date(currentCourierAssignment.createdAt).toISOString()}>
                  {new Date(currentCourierAssignment.createdAt).toLocaleString('tr-TR')}
                </time>
              </div>
            )}
            <div className="detail-actions">
              {delivery.recipientPhone && <a className="outline-button" href={`tel:${delivery.recipientPhone}`}>☎ Alıcıyı ara</a>}
              <button className="outline-button" onClick={() => void openNavigation()}>↗ Haritada aç</button>
            </div>
          </section>

          <aside className="detail-card progress-card">
            <span className="eyebrow">TESLİMAT AKIŞI</span>
            <h3>Durum adımları</h3>
            <div className="status-steps">
              {lifecycle.map((status, index) => {
                const complete = lifecycle.indexOf(delivery.status) >= index && delivery.status !== 'CANCELLED';
                return (
                  <div className={`status-step ${complete ? 'done' : ''}`} key={status}>
                    <span>{complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
                    <b>{['Atama alındı', 'Şubeden alındı', 'Yola çıktı', 'Teslim edildi'][index]}</b>
                  </div>
                );
              })}
            </div>
            {nextAction && (
              <button
                className="primary-button wide-button"
                disabled={busy}
                onClick={() => void transition(nextAction[0])}
              >
                {busy ? 'İşleniyor…' : nextAction[1]} <span>→</span>
              </button>
            )}
            {delivery.status === 'DELIVERED' && <div className="success-banner">✓ Bu teslimat başarıyla tamamlandı.</div>}
            {delivery.status === 'CANCELLED' && <div className="form-error">Bu teslimat iptal edilmiş.</div>}
            <p className="security-note">Durum geçişleri sunucu tarafında doğrulanır ve işlem geçmişine kaydedilir.</p>
          </aside>
        </div>
      )}
    </>
  );
}
