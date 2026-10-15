'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { ConfirmDialog } from '../../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { OpsPageHeader } from '../../../components/ops/ops-page-header';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { useOpsToast } from '../../../components/ops/ops-toast';
import { ActionButton, KeylineCard, StatusBadge } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import { digitsOnlyMinor, isE164Phone, isHhMm, weekdayLabel } from '../../../lib/fulfillment-ops';
import {
  adminBranchSchema,
  operatingHoursSchema,
  serviceAreasSchema,
  unknownDataSchema,
} from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

type Branch = z.infer<typeof adminBranchSchema>['data'];
type HourRow = z.infer<typeof operatingHoursSchema>['data'][number];
type ServiceArea = z.infer<typeof serviceAreasSchema>['data'][number];

function defaultHours(): HourRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    opensAt: dayOfWeek === 0 ? '10:00' : '09:00',
    closesAt: dayOfWeek === 0 ? '22:00' : '23:00',
    isClosed: false,
  }));
}

/** Inline-edit row for a single service area */
function ServiceAreaRow({
  area,
  branchId,
  onDone,
}: {
  area: ServiceArea;
  branchId: string;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(area.name ?? '');
  const [editPriority, setEditPriority] = useState(String(area.priority ?? 0));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  async function saveEdit() {
    setRowError(null);
    const priority = Number(editPriority);
    if (!editName.trim() || !Number.isInteger(priority) || priority < 0) {
      setRowError('Ad boş olamaz; öncelik 0 veya pozitif tam sayı olmalı.');
      return;
    }
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/branches/${branchId}/service-areas/${area.id}`,
        body: { name: editName.trim(), priority },
        schema: unknownDataSchema,
      });
      setEditing(false);
      onDone();
    } catch (err) {
      setRowError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    setRowError(null);
    try {
      await createAdminClient().request({
        method: 'DELETE',
        path: `admin/branches/${branchId}/service-areas/${area.id}`,
        schema: z.unknown(),
      });
      setConfirmDelete(false);
      onDone();
    } catch (err) {
      setRowError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 0',
          borderBottom: '1px solid var(--ops-border, #2a2a2a)',
          flexWrap: 'wrap',
        }}
      >
        {editing ? (
          <>
            <input
              className="ops-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ flex: '1 1 160px', minWidth: 0 }}
              aria-label="Alan adı"
            />
            <input
              className="ops-input"
              value={editPriority}
              inputMode="numeric"
              style={{ width: '5rem' }}
              aria-label="Öncelik"
              onChange={(e) => setEditPriority(e.target.value)}
            />
            <ActionButton variant="primary" disabled={busy} onClick={() => void saveEdit()}>
              {busy ? 'Kaydediliyor' : 'Kaydet'}
            </ActionButton>
            <ActionButton
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setEditName(area.name ?? '');
                setEditPriority(String(area.priority ?? 0));
                setRowError(null);
              }}
            >
              İptal
            </ActionButton>
          </>
        ) : (
          <>
            <span style={{ flex: '1 1 0', fontWeight: 500, fontSize: '0.875rem' }}>
              {area.name ?? '—'}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--ops-text-muted, #888)',
                whiteSpace: 'nowrap',
              }}
            >
              Öncelik {area.priority ?? '—'}
            </span>
            <ActionButton disabled={busy} onClick={() => setEditing(true)}>
              Düzenle
            </ActionButton>
            <ActionButton variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Sil
            </ActionButton>
          </>
        )}
      </div>
      {rowError ? (
        <p className="ops-flash ops-flash--err" role="alert" style={{ marginTop: '0.25rem' }}>
          {rowError}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        title="Servis alanını kaldır"
        body={`"${area.name ?? area.id}" alanını pasife almak istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmLabel="Kaldır"
        danger
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void doDelete()}
      />
    </>
  );
}

/** Card showing all service areas for the branch with add (10km) + inline edit/delete */
function ServiceAreasCard({ branchId }: { branchId: string }) {
  const toast = useOpsToast();
  const [areasState, setAreasState] = useState<LoadState<ServiceArea[]>>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  const loadAreas = useCallback(async () => {
    setAreasState({ status: 'loading' });
    try {
      const res = await createAdminClient().request({
        path: `admin/branches/${branchId}/service-areas`,
        schema: serviceAreasSchema,
      });
      if (res.data.length === 0) setAreasState({ status: 'empty' });
      else setAreasState({ status: 'ready', data: res.data });
    } catch (error) {
      setAreasState({ status: 'error', error });
    }
  }, [branchId]);

  useDeferredLoad(() => void loadAreas(), [loadAreas]);

  async function generate10km() {
    setBusy(true);
    setAreaError(null);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/branches/${branchId}/service-areas/generate-circle`,
        body: { radiusKm: 10 },
        schema: unknownDataSchema,
      });
      toast.success('10 km servis ağı oluşturuldu.');
      await loadAreas();
    } catch (err) {
      setAreaError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const areas = areasState.status === 'ready' ? areasState.data : [];

  return (
    <KeylineCard
      title="Hizmet bölgeleri"
      actions={
        <ActionButton disabled={busy} onClick={() => void generate10km()}>
          + Alan ekle (10 km)
        </ActionButton>
      }
    >
      <p className="ops-page__lede" style={{ marginBottom: '0.75rem' }}>
        Seçili şubeye tanımlı aktif alanlar
      </p>
      {areaError ? (
        <p className="ops-flash ops-flash--err" role="alert">
          {areaError}
        </p>
      ) : null}
      {areasState.status === 'loading' ? (
        <p style={{ color: 'var(--ops-text-muted, #888)', fontSize: '0.875rem' }}>Yükleniyor…</p>
      ) : areasState.status === 'error' ? (
        <p className="ops-flash ops-flash--err" role="alert">
          {errorMessage(areasState.error)}
        </p>
      ) : areasState.status === 'empty' ? (
        <p style={{ color: 'var(--ops-text-muted, #888)', fontSize: '0.875rem' }}>
          Bu şubeye bağlı aktif servis alanı yok.
        </p>
      ) : (
        <div>
          {areas.map((area) => (
            <ServiceAreaRow
              key={area.id}
              area={area}
              branchId={branchId}
              onDone={() => void loadAreas()}
            />
          ))}
        </div>
      )}
    </KeylineCard>
  );
}

export default function BranchDetailPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();
  const [state, setState] = useState<LoadState<Branch>>({ status: 'loading' });

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [hours, setHours] = useState<HourRow[]>(defaultHours());

  // UI state
  const [busy, setBusy] = useState(false);
  const [hoursBusy, setHoursBusy] = useState(false);
  const [confirmAccepting, setConfirmAccepting] = useState(false);

  // Map picker reference & sync
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const apply = useCallback((branch: Branch, nextHours: HourRow[]) => {
    setName(branch.name);
    setAddress(branch.addressLine ?? '');
    setLatitude(branch.latitude != null ? String(branch.latitude) : '');
    setLongitude(branch.longitude != null ? String(branch.longitude) : '');
    setPhone(branch.phone ?? '');
    setMinOrder(branch.minOrderMinor ?? '');
    setDeliveryFee(branch.deliveryFeeMinor ?? '');
    const byDay = new Map(nextHours.map((h) => [h.dayOfWeek, h]));
    setHours(
      defaultHours().map((row) => {
        const existing = byDay.get(row.dayOfWeek);
        return existing ?? row;
      }),
    );
  }, []);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const [branch, hoursRes] = await Promise.all([
        client.request({ path: `admin/branches/${branchId}`, schema: adminBranchSchema }),
        client.request({
          path: `admin/branches/${branchId}/operating-hours`,
          schema: operatingHoursSchema,
        }),
      ]);
      apply(branch.data, hoursRes.data);
      setState({ status: 'ready', data: branch.data });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [apply, branchId, markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  // Handle postMessage communication from the map picker iframe
  useEffect(() => {
    function receiveMapMessage(event: MessageEvent<unknown>) {
      let message = event.data;
      if (typeof message === 'string') {
        try {
          message = JSON.parse(message);
        } catch {
          return;
        }
      }
      if (!message || typeof message !== 'object') return;

      const payload = message as { type?: string; latitude?: number; longitude?: number };

      if (payload.type === 'map-ready') {
        setMapLoaded(true);
      } else if (payload.type === 'location-selected') {
        if (typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
          setLatitude(payload.latitude.toFixed(6));
          setLongitude(payload.longitude.toFixed(6));
        }
      }
    }

    window.addEventListener('message', receiveMapMessage);
    return () => window.removeEventListener('message', receiveMapMessage);
  }, []);

  // Send focus/location update to map iframe
  const sendLocationToMap = useCallback((lat: number, lng: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        type: 'focus-location',
        latitude: lat,
        longitude: lng,
      }),
      '*',
    );
  }, []);

  // Update map when coordinates input changes or when user clicks "Haritada Göster"
  const handleCoordinateFocus = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      Number.isFinite(lng) &&
      lng >= -180 &&
      lng <= 180
    ) {
      sendLocationToMap(lat, lng);
    }
  };

  async function saveProfile() {
    setBusy(true);
    if (!name.trim() || !address.trim()) {
      toast.error('Ad ve adres zorunlu.');
      setBusy(false);
      return;
    }
    if (phone.trim() && !isE164Phone(phone.trim())) {
      toast.error('Telefon E.164 formatında olmalı (+90…).');
      setBusy(false);
      return;
    }
    const minOrderMinor = digitsOnlyMinor(minOrder);
    const deliveryFeeMinor = digitsOnlyMinor(deliveryFee);
    if (!minOrderMinor || !deliveryFeeMinor) {
      toast.error('Min. sipariş ve teslimat ücreti kuruş cinsinden olmalı.');
      setBusy(false);
      return;
    }

    let latNum: number | undefined;
    let lngNum: number | undefined;

    if (latitude.trim() || longitude.trim()) {
      latNum = Number(latitude);
      lngNum = Number(longitude);
      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        toast.error('Enlem -90 ile 90 arasında geçerli bir sayı olmalıdır.');
        setBusy(false);
        return;
      }
      if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
        toast.error('Boylam -180 ile 180 arasında geçerli bir sayı olmalıdır.');
        setBusy(false);
        return;
      }
    }

    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/branches/${branchId}`,
        body: {
          name: name.trim(),
          addressLine: address.trim(),
          latitude: latNum,
          longitude: lngNum,
          phone: phone.trim() ? phone.trim() : null,
          minOrderMinor,
          deliveryFeeMinor,
        },
        schema: adminBranchSchema,
      });
      toast.success('Şube bilgileri ve harita konumu başarıyla güncellendi.');
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function setAccepting(isAcceptingOrders: boolean) {
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/branches/${branchId}`,
        body: { isAcceptingOrders },
        schema: adminBranchSchema,
      });
      toast.success(isAcceptingOrders ? 'Sipariş alımı açıldı.' : 'Sipariş alımı kapatıldı.');
      setConfirmAccepting(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveHours() {
    setHoursBusy(true);
    if (hours.some((h) => !isHhMm(h.opensAt) || !isHhMm(h.closesAt))) {
      toast.error('Saatler HH:MM formatında olmalıdır.');
      setHoursBusy(false);
      return;
    }
    try {
      await createAdminClient().request({
        method: 'PUT',
        path: `admin/branches/${branchId}/operating-hours`,
        body: {
          hours: hours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            opensAt: h.opensAt,
            closesAt: h.closesAt,
            isClosed: h.isClosed,
          })),
        },
        schema: operatingHoursSchema,
      });
      toast.success('Çalışma saatleri kaydedildi.');
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setHoursBusy(false);
    }
  }

  return (
    <div className="ops-page">
      <OpsBoundary state={state} emptyTitle="Şube yok" onRetry={() => void load()}>
        {(branch) => {
          const initialMapUrl = `/branch-location-picker.html?lat=${branch.latitude ?? 39.0}&lng=${branch.longitude ?? 35.0}`;

          return (
            <>
              <OpsPageHeader
                title={branch.name ?? branch.code ?? 'Şube'}
                scope={branch.code ?? undefined}
                lede="Şubenin kimliğini, harita koordinatlarını, çalışma saatlerini ve sipariş alım durumunu yönetin. Seçilen harita konumu 10 km müşteri servis ağının merkezini belirler."
                actions={
                  <StatusBadge tone={branch.isAcceptingOrders === false ? 'warn' : 'ready'}>
                    {branch.isAcceptingOrders === false ? 'Sipariş kapalı' : 'Sipariş alıyor'}
                  </StatusBadge>
                }
              />

              {/* Main Top Section: Branch Info Form & Interactive Map Picker Side-by-Side */}
              <div className="ops-split">
                {/* Form Card */}
                <KeylineCard title="Şube Bilgileri">
                  <div className="ops-form">
                    <p className="ops-page__lede">
                      Kod <span className="mono">{branch.code ?? '—'}</span> · Gel-al{' '}
                      {branch.pickupEnabled === false ? 'hayır' : 'evet'} · Teslimat{' '}
                      {branch.deliveryEnabled === false ? 'hayır' : 'evet'} · Aktif{' '}
                      {branch.isActive === false ? 'hayır' : 'evet'}
                      {branch.estimatedDeliveryMinutesMin != null
                        ? ` · ETA ${branch.estimatedDeliveryMinutesMin}–${branch.estimatedDeliveryMinutesMax ?? '—'} dk`
                        : ''}
                    </p>

                    <label className="ops-field">
                      Şube Adı
                      <input
                        className="ops-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Örn: Kadıköy Şubesi"
                      />
                    </label>

                    <label className="ops-field">
                      Adres Satırı
                      <input
                        className="ops-input"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Açık adres bilgisi"
                      />
                    </label>

                    {/* Coordinates Selection Inputs */}
                    <div
                      style={{
                        padding: '0.85rem',
                        background: 'rgba(255, 183, 77, 0.05)',
                        border: '1px solid rgba(255, 183, 77, 0.25)',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--ops-accent, #ffb74d)',
                          }}
                        >
                          📍 Şube GPS Koordinatları
                        </span>
                        <ActionButton onClick={handleCoordinateFocus}>Haritada Odakla</ActionButton>
                      </div>

                      <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}
                      >
                        <label className="ops-field" style={{ margin: 0 }}>
                          <span style={{ fontSize: '0.75rem' }}>Enlem (Lat)</span>
                          <input
                            className="ops-input mono"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            placeholder="37.066220"
                          />
                        </label>
                        <label className="ops-field" style={{ margin: 0 }}>
                          <span style={{ fontSize: '0.75rem' }}>Boylam (Lng)</span>
                          <input
                            className="ops-input mono"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            placeholder="37.383320"
                          />
                        </label>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--ops-text-muted, #888)' }}>
                        Yandaki haritaya tıklayarak veya pini sürükleyerek konumu anında
                        seçebilirsiniz.
                      </span>
                    </div>

                    <label className="ops-field">
                      Telefon
                      <input
                        className="ops-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+905551234567"
                      />
                    </label>

                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}
                    >
                      <label className="ops-field">
                        Min. sipariş (kuruş)
                        <input
                          className="ops-input"
                          value={minOrder}
                          inputMode="numeric"
                          onChange={(e) => setMinOrder(e.target.value)}
                        />
                      </label>
                      <label className="ops-field">
                        Teslimat ücreti (kuruş)
                        <input
                          className="ops-input"
                          value={deliveryFee}
                          inputMode="numeric"
                          onChange={(e) => setDeliveryFee(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="ops-form-actions">
                      <ActionButton
                        variant="primary"
                        onClick={() => void saveProfile()}
                        disabled={busy}
                      >
                        {busy ? 'Kaydediliyor…' : 'Şube Bilgilerini Kaydet'}
                      </ActionButton>
                      {branch.isAcceptingOrders === false ? (
                        <ActionButton disabled={busy} onClick={() => void setAccepting(true)}>
                          Sipariş alımını aç
                        </ActionButton>
                      ) : (
                        <ActionButton
                          variant="danger"
                          disabled={busy}
                          onClick={() => setConfirmAccepting(true)}
                        >
                          Sipariş alımını kapat
                        </ActionButton>
                      )}
                    </div>
                  </div>
                </KeylineCard>

                {/* Map Location Picker Card */}
                <KeylineCard
                  title="Harita ile Konum Seçimi"
                  actions={
                    branch.latitude != null && branch.longitude != null ? (
                      <ActionButton
                        onClick={() => {
                          setLatitude(String(branch.latitude));
                          setLongitude(String(branch.longitude));
                          sendLocationToMap(branch.latitude!, branch.longitude!);
                        }}
                      >
                        Kayıtlı Konuma Sıfırla
                      </ActionButton>
                    ) : undefined
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: 'var(--ops-text-muted, #aaa)' }}>
                        Konum:{' '}
                        <strong className="mono" style={{ color: 'var(--ops-accent, #ffb74d)' }}>
                          {latitude && longitude ? `${latitude}, ${longitude}` : 'Seçilmedi'}
                        </strong>
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(255, 183, 77, 0.12)',
                          color: '#ffb74d',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 183, 77, 0.3)',
                        }}
                      >
                        10 km Servis Yarıçapı Önizlemeli
                      </span>
                    </div>

                    {/* Map Frame Container */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '420px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--ops-border, #30363d)',
                        background: '#0d1117',
                      }}
                    >
                      <iframe
                        ref={iframeRef}
                        src={initialMapUrl}
                        title="Şube Konum Belirleme Haritası"
                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                      />
                      {!mapLoaded && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            background: 'rgba(13, 17, 23, 0.85)',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#e6edf3',
                            border: '1px solid #30363d',
                            pointerEvents: 'none',
                          }}
                        >
                          Harita hazırlanıyor…
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--ops-text-muted, #888)',
                        lineHeight: 1.45,
                      }}
                    >
                      💡 <strong>Nasıl kullanılır:</strong> Haritada şubenin bulunduğu konuma
                      tıklayın veya turuncu şube işaretçisini sürükleyin. Kesikli daire, şubenin
                      müşterilere sunacağı <strong>maksimum 10 km</strong> servis alanını gösterir.
                      Değişikliklerin kaydedilmesi için <strong>Şube Bilgilerini Kaydet</strong>{' '}
                      butonuna basmayı unutmayın.
                    </div>
                  </div>
                </KeylineCard>
              </div>

              {/* Lower Section: Operating Hours & Service Areas */}
              <div className="ops-split" style={{ marginTop: '1.5rem' }}>
                <KeylineCard title="Çalışma saatleri">
                  <div className="ops-form">
                    {hours.map((row) => (
                      <div className="ops-field" key={row.dayOfWeek}>
                        <span>{weekdayLabel(row.dayOfWeek)}</span>
                        <span className="ops-form-actions">
                          <input
                            className="ops-input"
                            value={row.opensAt}
                            aria-label={`${weekdayLabel(row.dayOfWeek)} açılış`}
                            onChange={(e) =>
                              setHours((prev) =>
                                prev.map((h) =>
                                  h.dayOfWeek === row.dayOfWeek
                                    ? { ...h, opensAt: e.target.value }
                                    : h,
                                ),
                              )
                            }
                          />
                          <input
                            className="ops-input"
                            value={row.closesAt}
                            aria-label={`${weekdayLabel(row.dayOfWeek)} kapanış`}
                            onChange={(e) =>
                              setHours((prev) =>
                                prev.map((h) =>
                                  h.dayOfWeek === row.dayOfWeek
                                    ? { ...h, closesAt: e.target.value }
                                    : h,
                                ),
                              )
                            }
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={row.isClosed}
                              onChange={(e) =>
                                setHours((prev) =>
                                  prev.map((h) =>
                                    h.dayOfWeek === row.dayOfWeek
                                      ? { ...h, isClosed: e.target.checked }
                                      : h,
                                  ),
                                )
                              }
                            />{' '}
                            Kapalı
                          </label>
                        </span>
                      </div>
                    ))}
                    <ActionButton
                      variant="primary"
                      onClick={() => void saveHours()}
                      disabled={hoursBusy}
                    >
                      {hoursBusy ? 'Kaydediliyor…' : 'Saatleri kaydet'}
                    </ActionButton>
                  </div>
                </KeylineCard>

                <ServiceAreasCard branchId={branchId} />
              </div>
            </>
          );
        }}
      </OpsBoundary>
      <ConfirmDialog
        open={confirmAccepting}
        title="Sipariş alımını kapat"
        body="Bu şube yeni sipariş kabul etmez. Pickup/delivery bayrakları değişmez (PATCH yok)."
        confirmLabel="Kapat"
        danger
        busy={busy}
        onCancel={() => setConfirmAccepting(false)}
        onConfirm={() => void setAccepting(false)}
      />
    </div>
  );
}
