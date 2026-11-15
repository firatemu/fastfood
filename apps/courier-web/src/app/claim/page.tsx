'use client';

import type { CourierDelivery } from '@fastfood/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  CheckCircleIcon,
  MapPinIcon,
  PackageIcon,
  QrIcon,
  RefreshIcon,
  RouteIcon,
  StoreIcon,
} from '../../components/icons';
import { QrScanner } from '../../components/qr-scanner';
import { useSession } from '../../components/session-provider';
import {
  api,
  claimResponseSchema,
  courierErrorMessage,
  deliveriesResponseSchema,
  formatTimeTr,
  formatTryMinor,
} from '../../lib/api';

export default function ClaimPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useSession();
  const [token, setToken] = useState('');
  const [poolDeliveries, setPoolDeliveries] = useState<CourierDelivery[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);
  const [refreshingPool, setRefreshingPool] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolNotice, setPoolNotice] = useState<string | null>(null);

  const loadPool = useCallback(async (isManual = false) => {
    if (isManual) setRefreshingPool(true);
    try {
      const res = await api.request({
        path: '/courier/deliveries/pool',
        schema: deliveriesResponseSchema,
      });
      setPoolDeliveries(res.data);
      setPoolNotice(null);
    } catch (err) {
      setPoolNotice(courierErrorMessage(err, 'Şube havuzu yüklenemedi.'));
    } finally {
      setLoadingPool(false);
      setRefreshingPool(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPool(false);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPool]);

  const handleCameraRead = useCallback((scanned: string) => {
    const trimmed = scanned.trim();
    if (!trimmed) return;
    setToken(trimmed);
    setError(null);
  }, []);

  const handlePaste = async () => {
    setError(null);
    try {
      if (!navigator.clipboard?.readText) {
        setError('Tarayıcı panodan otomatik okuma izin vermedi. Jetonu elle yapıştırın.');
        return;
      }
      const clipText = (await navigator.clipboard.readText()).trim();
      if (!clipText) {
        setError('Panoda kopyalanmış bir QR jetonu bulunamadı.');
        return;
      }
      setToken(clipText);
    } catch {
      setError('Pano okunamadı. Jetonu doğrudan metin alanına yapıştırabilirsiniz.');
    }
  };

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError('Lütfen geçerli bir QR jetonu girin veya kameradan okutun.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await api.request({
        method: 'POST',
        path: '/courier/deliveries/claim-qr',
        body: { token: trimmed },
        schema: claimResponseSchema,
      });
      await refreshProfile();
      router.push(`/deliveries/${res.data.id}`);
    } catch (err) {
      setError(courierErrorMessage(err, 'QR teslim alma işlemi tamamlanamadı.'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = profile?.activeDeliveriesCount ?? 0;
  const maxActive = profile?.maxActiveDeliveries ?? 3;
  const availableSlots = profile?.availableCapacitySlots ?? Math.max(0, maxActive - activeCount);
  const capacityPct = maxActive > 0 ? Math.min(100, Math.round((activeCount / maxActive) * 100)) : 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">QR İLE PAKET TESLİM ALMA</div>
          <h1>QR İle Teslimat Sahiplen</h1>
          <p>
            Şube ekranındaki veya paket etiketindeki tek kullanımlık QR kodunu okutarak paketi
            doğrudan aktif seferine ekle.
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline-button"
            onClick={() => void loadPool(true)}
            disabled={refreshingPool}
          >
            <RefreshIcon size={16} />
            <span>{refreshingPool ? 'Havuz yenileniyor…' : 'Havuzu yenile'}</span>
          </button>
          <Link className="outline-button" href="/deliveries">
            <RouteIcon size={16} />
            <span>Seferlerime dön</span>
          </Link>
        </div>
      </div>

      <section className="claim-layout">
        <div className="claim-card">
          <div className="card-heading">
            <div className="qr-emblem" aria-hidden="true">
              <QrIcon size={22} />
            </div>
            <div>
              <h2>Kamera veya QR Jetonu</h2>
              <p className="claim-hint">
                Kamera izni vererek kodu taratın ya da şubeden alınan jetonu aşağıdaki alana
                girin.
              </p>
            </div>
          </div>

          <QrScanner onRead={handleCameraRead} />

          <form onSubmit={submitClaim}>
            <label htmlFor="claim-token-input">
              <span>QR Jeton Kodu</span>
              <div className="token-input-row">
                <input
                  id="claim-token-input"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Örn: dev-qr-claim-token-..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button type="button" className="paste-btn" onClick={() => void handlePaste()}>
                  Panodan yapıştır
                </button>
              </div>
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="primary-button wide-button"
              disabled={submitting || availableSlots <= 0}
            >
              <CheckCircleIcon size={17} />
              <span>
                {submitting
                  ? 'Teslimat alınıyor…'
                  : availableSlots <= 0
                    ? 'Aktif sefer kapasiteniz dolu'
                    : 'QR ile teslimatı üzerime al'}
              </span>
            </button>
          </form>

          {availableSlots <= 0 && (
            <p className="muted-note">
              Maksimum aktif sefer limitine ({activeCount}/{maxActive}) ulaştın. Yeni paket almak
              için mevcut teslimatlardan birini tamamlamalısın.
            </p>
          )}
        </div>

        <aside className="claim-side">
          <section className="panel-card" aria-label="Kurye kapasite durumu">
            <div className="panel-card-header">
              <div className="panel-title-group">
                <span className="eyebrow">KAPASİTE DURUMU</span>
                <h2>Aktif Görev Limiti</h2>
              </div>
              <span className="count-badge">
                {activeCount}/{maxActive}
              </span>
            </div>

            <div className="capacity-box">
              <div className="capacity-stats">
                <span>Üzerindeki sefer: {activeCount}</span>
                <strong>Boş slot: {availableSlots}</strong>
              </div>
              <div className="progress-track progress-track--lg" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${capacityPct}%` }} />
              </div>
            </div>
            <p className="muted-note">
              Şube havuzundaki paketleri yalnızca QR jetonu doğrulaması ile üzerine alabilirsin.
            </p>
          </section>

          <section className="claim-pool-card" aria-label="Şube havuzunda bekleyen paketler">
            <div className="panel-card-header">
              <div className="panel-title-group">
                <span className="eyebrow">ŞUBE HAVUZU</span>
                <h2>Bekleyen Paketler</h2>
              </div>
              <span className="count-badge">{poolDeliveries.length}</span>
            </div>

            {poolNotice && <p className="muted-note">{poolNotice}</p>}

            {loadingPool ? (
              <p className="muted-note">Şube havuzu kontrol ediliyor…</p>
            ) : poolDeliveries.length === 0 ? (
              <p className="muted-note">
                Bağlı olduğun şubelerde şu an atama bekleyen paket bulunmuyor.
              </p>
            ) : (
              <div className="claim-pool-list">
                {poolDeliveries.map((item) => {
                  const code =
                    item.order?.displayNumber ?? `SP-${item.orderId.slice(-6).toUpperCase()}`;
                  const amount = formatTryMinor(item.order?.finalPayableMinor);
                  return (
                    <article key={item.id} className="claim-pool-item">
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
                        {amount && <strong>{amount}</strong>}
                      </div>
                      <p className="delivery-address">
                        <MapPinIcon size={13} />{' '}
                        <span>{item.addressLine || 'Teslimat adresi tanımlı değil'}</span>
                      </p>
                      <div className="delivery-card-meta">
                        <span className="meta-stat">
                          <PackageIcon size={13} /> {item.order?.itemCount ?? 0} ürün
                        </span>
                        <span className="meta-stat">Kayıt: {formatTimeTr(item.createdAt)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel-card" aria-label="QR ile teslim alma adımları">
            <div className="panel-title-group">
              <span className="eyebrow">KULLANIM REHBERİ</span>
              <h2>3 Adımda QR Teslim Alma</h2>
            </div>
            <div className="claim-step">
              <strong>1. Şube paketini doğrula</strong>
              <p>Şube tezgahındaki paket numarası ile havuzdaki sipariş kodunu karşılaştır.</p>
            </div>
            <div className="claim-step">
              <strong>2. Kodu okut veya yapıştır</strong>
              <p>Kamerayı QR koduna tut ya da kopyalanan jetonu yukarıdaki alana yapıştır.</p>
            </div>
            <div className="claim-step">
              <strong>3. Seferi başlat</strong>
              <p>Sahiplenilen teslimat anında detay ekranında açılır ve aktif kuyruğuna düşer.</p>
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}
