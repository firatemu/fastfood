'use client';

import type { CourierDelivery } from '@fastfood/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import {
  CheckCircleIcon,
  CompassIcon,
  CopyIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
  RefreshIcon,
  StoreIcon,
} from '../../../components/icons';
import { useSession } from '../../../components/session-provider';
import {
  api,
  courierErrorMessage,
  deliveryResponseSchema,
  formatDateTimeTr,
  formatDurationMinutes,
  formatTimeTr,
  formatTryMinor,
  locationResponseSchema,
  navigationResponseSchema,
  statusLabel,
} from '../../../lib/api';

const LIFECYCLE = [
  { status: 'ASSIGNED', label: 'Atama Alındı' },
  { status: 'PICKED_UP', label: 'Şubeden Alındı' },
  { status: 'ON_THE_WAY', label: 'Yola Çıktı' },
  { status: 'DELIVERED', label: 'Teslim Edildi' },
] as const;

export default function DeliveryDetailPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const { refreshProfile } = useSession();
  const [delivery, setDelivery] = useState<CourierDelivery>();
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();

  const load = useCallback(async () => {
    try {
      const result = await api.request({
        path: `/courier/deliveries/${encodeURIComponent(deliveryId)}`,
        schema: deliveryResponseSchema,
      });
      setDelivery(result.data);
      setError('');
    } catch (caught) {
      setError(courierErrorMessage(caught, 'Teslimat yüklenemedi.'));
    }
  }, [deliveryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function transition(action: string) {
    setBusy(true);
    setError('');
    setActionMessage('');
    try {
      const result = await api.request({
        method: 'POST',
        path: `/courier/deliveries/${encodeURIComponent(deliveryId)}/${action}`,
        body: {},
        schema: deliveryResponseSchema,
      });
      setDelivery(result.data);
      void refreshProfile();
      setActionMessage(
        action === 'deliver'
          ? 'Teslimat başarıyla tamamlandı olarak işaretlendi.'
          : 'Teslimat durumu güncellendi.',
      );
    } catch (caught) {
      setError(courierErrorMessage(caught, 'İşlem tamamlanamadı.'));
    } finally {
      setBusy(false);
    }
  }

  async function openCustomerNavigation() {
    setError('');
    try {
      if (delivery?.navigationUrl) {
        window.open(delivery.navigationUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const result = await api.request({
        path: `/courier/deliveries/${encodeURIComponent(deliveryId)}/navigation`,
        schema: navigationResponseSchema,
      });
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      setError(courierErrorMessage(caught, 'Navigasyon bağlantısı alınamadı.'));
    }
  }

  async function copyAddress() {
    if (!delivery?.addressLine) return;
    try {
      await navigator.clipboard.writeText(delivery.addressLine);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionMessage('Adres panoya kopyalanamadı.');
    }
  }

  function sendCurrentLocation() {
    setError('');
    setActionMessage('');
    if (!navigator.geolocation) {
      setError('Bu tarayıcı konum servisini desteklemiyor.');
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void api
          .request({
            method: 'POST',
            path: `/courier/deliveries/${encodeURIComponent(deliveryId)}/location`,
            body: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyM:
                Number.isFinite(position.coords.accuracy) && position.coords.accuracy > 0
                  ? Math.round(position.coords.accuracy * 10) / 10
                  : undefined,
            },
            schema: locationResponseSchema,
          })
          .then(async () => {
            await load();
            setActionMessage('Anlık konumunuz başarıyla kaydedildi.');
          })
          .catch((caught) => {
            setError(courierErrorMessage(caught, 'Konum bilgisi sunucuya gönderilemedi.'));
          })
          .finally(() => setLocBusy(false));
      },
      (geoError) => {
        setLocBusy(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Konum izni reddedildi. Tarayıcı ayarlarından konum izni verebilirsiniz.');
        } else {
          setError('Cihaz konumu alınamadı. Lütfen açık alanda tekrar deneyin.');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
    );
  }

  function handlePrimaryActionClick(actionKey: string) {
    if (actionKey === 'deliver') {
      confirmDialogRef.current?.showModal();
      return;
    }
    void transition(actionKey);
  }

  function handleDialogClose() {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    const choice = dialog.returnValue;
    dialog.returnValue = '';
    if (choice === 'confirm') {
      void transition('deliver');
    }
  }

  if (!delivery && !error) {
    return (
      <div className="empty-panel" role="status">
        Teslimat detayları yükleniyor…
      </div>
    );
  }

  const actionByStatus: Partial<Record<CourierDelivery['status'], readonly [string, string]>> = {
    ASSIGNED: ['pickup', 'Şubeden teslim aldım'],
    PICKED_UP: ['on-the-way', 'Yola çıktım'],
    ON_THE_WAY: ['deliver', 'Teslimatı tamamla'],
  };
  const nextAction = delivery ? actionByStatus[delivery.status] : undefined;
  const currentCourierAssignment = delivery?.assignments
    .filter((assignment) => assignment.courierId === delivery.courierId)
    .at(-1);

  const orderCode =
    delivery?.order?.displayNumber ?? `SP-${(delivery?.orderId ?? deliveryId).slice(-6).toUpperCase()}`;
  const branchMapsUrl =
    delivery?.branch?.latitude != null && delivery?.branch?.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${delivery.branch.latitude},${delivery.branch.longitude}`
      : null;
  const durationMinutes = formatDurationMinutes(
    delivery?.pickedUpAt ?? delivery?.createdAt,
    delivery?.deliveredAt,
  );
  const totalFormatted = formatTryMinor(delivery?.order?.finalPayableMinor);
  const tipFormatted = formatTryMinor(delivery?.order?.tipMinor);
  const canSendLocation =
    delivery != null &&
    (delivery.status === 'ASSIGNED' ||
      delivery.status === 'PICKED_UP' ||
      delivery.status === 'ON_THE_WAY');

  return (
    <>
      <div className="detail-topbar-row">
        <Link className="back-link" href="/deliveries">
          ← Seferlere dön
        </Link>
        <button type="button" className="outline-button compact-btn" onClick={() => void load()}>
          <RefreshIcon size={14} />
          <span>Yenile</span>
        </button>
      </div>

      <div className="page-heading detail-heading">
        <div>
          <div className="eyebrow">
            SİPARİŞ #{orderCode} <span className="heading-dot" /> TESLİMAT DETAYI
          </div>
          <h1>{delivery?.recipientName || 'Sefer bilgisi'}</h1>
          <p>
            {delivery?.branch?.name
              ? `${delivery.branch.name} şubesinden teslimat`
              : 'Yalnızca sana atanmış teslimatın güvenli işlem alanı.'}
          </p>
        </div>
        {delivery && (
          <div className="detail-status-cluster">
            <span className={`status-chip ${delivery.status.toLowerCase()}`}>
              {statusLabel(delivery.status)}
            </span>
            {durationMinutes != null && (
              <span className="duration-badge">{durationMinutes} dk sürede teslim</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="form-error detail-error" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>
            {error}{' '}
            <button type="button" onClick={() => void load()}>
              Yeniden dene
            </button>
          </span>
        </div>
      )}

      {actionMessage && (
        <div className="success-banner detail-success" role="status">
          <CheckCircleIcon size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {delivery && (
        <div className="detail-grid">
          <div className="detail-column">
            <section className="detail-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">ALICI & TESLİMAT NOKTASI</span>
                  <h2>{delivery.recipientName || 'Alıcı bilgisi yok'}</h2>
                </div>
                <span className="contact-glyph" aria-hidden="true">
                  <MapPinIcon size={19} />
                </span>
              </div>

              {(delivery.order?.contactless ||
                delivery.order?.ecoPackaging ||
                delivery.order?.buildingAccessCode ||
                delivery.order?.scheduledFor) && (
                <div className="delivery-badges detail-badges">
                  {delivery.order?.contactless && (
                    <span className="tag-badge">Temassız Teslimat</span>
                  )}
                  {delivery.order?.buildingAccessCode && (
                    <span className="tag-badge tag-badge--warn">
                      Bina/Kapı Şifresi: {delivery.order.buildingAccessCode}
                    </span>
                  )}
                  {delivery.order?.ecoPackaging && (
                    <span className="tag-badge tag-badge--mint">Eko Ambalaj</span>
                  )}
                  {delivery.order?.scheduledFor && (
                    <span className="tag-badge">
                      Planlanan Saat: {formatTimeTr(delivery.order.scheduledFor)}
                    </span>
                  )}
                </div>
              )}

              <div className="detail-line">
                <span className="detail-icon" aria-hidden="true">
                  <MapPinIcon size={16} />
                </span>
                <div>
                  <small>TESLİMAT ADRESİ</small>
                  <b>{delivery.addressLine || 'Adres bilgisi mevcut değil'}</b>
                </div>
              </div>

              {(delivery.deliveryNote || delivery.order?.deliveryNote) && (
                <div className="note-box">
                  <span>MÜŞTERİ TESLİMAT NOTU</span>
                  <p>{delivery.deliveryNote || delivery.order?.deliveryNote}</p>
                </div>
              )}

              <div className="detail-actions">
                {delivery.recipientPhone && (
                  <a className="outline-button" href={`tel:${delivery.recipientPhone}`}>
                    <PhoneIcon size={15} />
                    <span>Alıcıyı ara ({delivery.recipientPhone})</span>
                  </a>
                )}
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => void openCustomerNavigation()}
                >
                  <CompassIcon size={15} />
                  <span>Müşteriye yol tarifi ↗</span>
                </button>
                {delivery.addressLine && (
                  <button type="button" className="outline-button" onClick={() => void copyAddress()}>
                    <CopyIcon size={15} />
                    <span>{copied ? 'Kopyalandı ✓' : 'Adresi kopyala'}</span>
                  </button>
                )}
              </div>
            </section>

            {delivery.branch && (
              <section className="detail-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">ALIM ŞUBESİ</span>
                    <h2>{delivery.branch.name}</h2>
                  </div>
                  {delivery.branch.code && (
                    <span className="branch-code">{delivery.branch.code}</span>
                  )}
                </div>
                <p className="branch-address detail-branch-address">
                  {delivery.branch.addressLine || 'Şube adresi kayıtlı değil.'}
                </p>
                <div className="detail-actions">
                  {delivery.branch.phone && (
                    <a className="outline-button" href={`tel:${delivery.branch.phone}`}>
                      <PhoneIcon size={15} />
                      <span>Şubeyi ara</span>
                    </a>
                  )}
                  {branchMapsUrl && (
                    <a
                      className="outline-button"
                      href={branchMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <StoreIcon size={15} />
                      <span>Şubeye yol tarifi ↗</span>
                    </a>
                  )}
                </div>
              </section>
            )}

            <section className="detail-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">SİPARİŞ İÇERİĞİ</span>
                  <h2>
                    #{orderCode}{' '}
                    {delivery.order ? `(${delivery.order.itemCount} ürün)` : ''}
                  </h2>
                </div>
                <span className="contact-glyph" aria-hidden="true">
                  <PackageIcon size={18} />
                </span>
              </div>

              {delivery.order && delivery.order.items.length > 0 ? (
                <ul className="order-items-list">
                  {delivery.order.items.map((item) => (
                    <li key={item.id} className="order-item-row">
                      <span className="item-qty">{item.quantity}x</span>
                      <div className="item-copy">
                        <strong>{item.productName}</strong>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <small>+ {item.modifiers.join(', ')}</small>
                        )}
                        {item.removals && item.removals.length > 0 && (
                          <small className="item-removal">
                            Çıkarılan: {item.removals.join(', ')}
                          </small>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-note">Bu teslimata bağlı kalem detayı bulunmuyor.</p>
              )}

              {(totalFormatted || tipFormatted) && (
                <div className="order-financials">
                  {totalFormatted && (
                    <div>
                      <small>Sipariş Toplamı</small>
                      <strong>{totalFormatted}</strong>
                    </div>
                  )}
                  {tipFormatted && (
                    <div>
                      <small>Kurye Bahşişi</small>
                      <strong className="tip-value">{tipFormatted}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="order-ref">
                <span>SİPARİŞ & TESLİMAT ID</span>
                <b>
                  {delivery.orderId} · {delivery.id}
                </b>
              </div>
            </section>
          </div>

          <aside className="detail-column">
            <section className="detail-card progress-card">
              <span className="eyebrow">TESLİMAT AKIŞI</span>
              <h3>Durum adımları</h3>
              <div className="status-steps">
                {LIFECYCLE.map((step, index) => {
                  const currentIndex = LIFECYCLE.findIndex((s) => s.status === delivery.status);
                  const complete = currentIndex >= index && delivery.status !== 'CANCELLED';
                  const stepTimestamp =
                    step.status === 'ASSIGNED'
                      ? (currentCourierAssignment?.createdAt ?? delivery.createdAt)
                      : step.status === 'PICKED_UP'
                        ? delivery.pickedUpAt
                        : step.status === 'DELIVERED'
                          ? delivery.deliveredAt
                          : null;
                  return (
                    <div className={`status-step ${complete ? 'done' : ''}`} key={step.status}>
                      <span>{complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
                      <div className="step-text">
                        <b>{step.label}</b>
                        {stepTimestamp && <small>{formatDateTimeTr(stepTimestamp)}</small>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {nextAction && (
                <button
                  type="button"
                  className="primary-button wide-button"
                  disabled={busy}
                  onClick={() => handlePrimaryActionClick(nextAction[0])}
                >
                  <span>{busy ? 'İşleniyor…' : nextAction[1]}</span>
                  <span aria-hidden="true">→</span>
                </button>
              )}

              {delivery.status === 'DELIVERED' && (
                <div className="success-banner">✓ Bu teslimat başarıyla tamamlandı.</div>
              )}
              {delivery.status === 'CANCELLED' && (
                <div className="form-error">Bu teslimat iptal edilmiş.</div>
              )}

              <p className="security-note">
                Durum geçişleri sunucu tarafında doğrulanır ve işlem geçmişine kaydedilir.
              </p>
            </section>

            <section className="detail-card">
              <span className="eyebrow">KONUM BİLDİRİMİ</span>
              <h3>Canlı GPS Kaydı</h3>
              {delivery.latestLocation ? (
                <div className="location-box">
                  <div>
                    <small>SON KOORDİNATLAR</small>
                    <strong className="mono">
                      {delivery.latestLocation.latitude.toFixed(5)},{' '}
                      {delivery.latestLocation.longitude.toFixed(5)}
                    </strong>
                  </div>
                  <div className="location-meta">
                    {delivery.latestLocation.accuracyM != null && (
                      <span>Hassasiyet: ±{Math.round(delivery.latestLocation.accuracyM)} m</span>
                    )}
                    <span>Zaman: {formatDateTimeTr(delivery.latestLocation.recordedAt)}</span>
                  </div>
                </div>
              ) : (
                <p className="muted-note">
                  Bu teslimat için henüz konum kaydı gönderilmedi. İsterseniz manuel olarak anlık
                  konum bildirebilirsiniz.
                </p>
              )}

              {canSendLocation && (
                <button
                  type="button"
                  className="outline-button wide-button"
                  disabled={locBusy}
                  onClick={sendCurrentLocation}
                >
                  <span>{locBusy ? 'Konum alınıyor…' : '📍 Anlık konumu bildir'}</span>
                  <span aria-hidden="true">↗</span>
                </button>
              )}
            </section>

            {delivery.assignments.length > 0 && (
              <section className="detail-card">
                <span className="eyebrow">ATAMA KAYITLARI</span>
                <h3>Sefer Geçmişi ({delivery.assignments.length})</h3>
                <ul className="assignment-history">
                  {delivery.assignments.map((assignment) => (
                    <li key={assignment.id}>
                      <b>{assignment.reason === 'qr_claim' ? 'QR ile teslim alındı' : 'Şube ataması'}</b>
                      <time dateTime={new Date(assignment.createdAt).toISOString()}>
                        {formatDateTimeTr(assignment.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}

      <dialog
        ref={confirmDialogRef}
        className="confirm-dialog"
        aria-labelledby={dialogTitleId}
        onClose={handleDialogClose}
      >
        <div className="confirm-dialog-body">
          <span className="eyebrow">TESLİMAT ONAYI</span>
          <h2 id={dialogTitleId}>Teslimat tamamlandı olarak işaretlensin mi?</h2>
          <p>
            <strong>#{orderCode}</strong> numaralı sipariş{' '}
            <strong>{delivery?.recipientName || 'alıcı'}</strong> adına teslim edildi olarak
            kaydedilecek ve geri alınamayacaktır.
          </p>
          <form method="dialog" className="confirm-dialog-actions">
            <button type="submit" value="cancel" className="outline-button" autoFocus>
              Vazgeç
            </button>
            <button type="submit" value="confirm" className="primary-button">
              Evet, teslim edildi
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
