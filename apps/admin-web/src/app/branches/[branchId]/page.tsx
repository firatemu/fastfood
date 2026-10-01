'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { ConfirmDialog } from '../../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../../components/ops/ops-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { ActionButton, KeylineCard, StatusBadge } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import {
  digitsOnlyMinor,
  isE164Phone,
  isHhMm,
  weekdayLabel,
} from '../../../lib/fulfillment-ops';
import { adminBranchSchema, operatingHoursSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

type Branch = z.infer<typeof adminBranchSchema>['data'];
type HourRow = z.infer<typeof operatingHoursSchema>['data'][number];

function defaultHours(): HourRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    opensAt: dayOfWeek === 0 ? '10:00' : '09:00',
    closesAt: dayOfWeek === 0 ? '22:00' : '23:00',
    isClosed: false,
  }));
}

export default function BranchDetailPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Branch>>({ status: 'loading' });
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [hours, setHours] = useState<HourRow[]>(defaultHours());
  const [busy, setBusy] = useState(false);
  const [hoursBusy, setHoursBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAccepting, setConfirmAccepting] = useState(false);

  const apply = useCallback((branch: Branch, nextHours: HourRow[]) => {
    setName(branch.name);
    setAddress(branch.addressLine ?? '');
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

  async function saveProfile() {
    setBusy(true);
    setFormError(null);
    setFlash(null);
    if (!name.trim() || !address.trim()) {
      setFormError('Ad ve adres zorunlu.');
      setBusy(false);
      return;
    }
    if (phone.trim() && !isE164Phone(phone.trim())) {
      setFormError('Telefon E.164 olmalı (+90…).');
      setBusy(false);
      return;
    }
    const minOrderMinor = digitsOnlyMinor(minOrder);
    const deliveryFeeMinor = digitsOnlyMinor(deliveryFee);
    if (!minOrderMinor || !deliveryFeeMinor) {
      setFormError('Min. sipariş ve teslimat ücreti kuruş olmalı.');
      setBusy(false);
      return;
    }
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/branches/${branchId}`,
        body: {
          name: name.trim(),
          addressLine: address.trim(),
          phone: phone.trim() ? phone.trim() : null,
          minOrderMinor,
          deliveryFeeMinor,
        },
        schema: adminBranchSchema,
      });
      setFlash('Şube kaydı güncellendi.');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function setAccepting(isAcceptingOrders: boolean) {
    setBusy(true);
    setFormError(null);
    setFlash(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/branches/${branchId}`,
        body: { isAcceptingOrders },
        schema: adminBranchSchema,
      });
      setFlash(isAcceptingOrders ? 'Sipariş alımı açıldı.' : 'Sipariş alımı kapatıldı.');
      setConfirmAccepting(false);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveHours() {
    setHoursBusy(true);
    setFormError(null);
    setFlash(null);
    if (hours.some((h) => !isHhMm(h.opensAt) || !isHhMm(h.closesAt))) {
      setFormError('Saatler HH:MM olmalı.');
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
      setFlash('Çalışma saatleri kaydedildi.');
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setHoursBusy(false);
    }
  }

  return (
    <div className="ops-page">
      <p className="ops-page__lede">
        `ROUTE_IDENTIFIED_BRANCH` · rota `{branchId}` · topbar şube seçimi bu kaydı sessizce
        değiştirmez · pickup/delivery/aktif PATCH yok.
      </p>
      <OpsBoundary state={state} emptyTitle="Şube yok" onRetry={() => void load()}>
        {(branch) => (
          <div className="ops-split">
            <KeylineCard
              title="Kayıt"
              actions={
                <StatusBadge tone={branch.isAcceptingOrders === false ? 'warn' : 'ready'}>
                  {branch.isAcceptingOrders === false ? 'Sipariş kapalı' : 'Sipariş alıyor'}
                </StatusBadge>
              }
            >
              <div className="ops-form">
                <p className="ops-page__lede">
                  Kod <span className="mono">{branch.code ?? '—'}</span> ·{' '}
                  {branch.latitude != null && branch.longitude != null
                    ? `${branch.latitude}, ${branch.longitude}`
                    : 'koordinat yok'}{' '}
                  · gel-al {branch.pickupEnabled === false ? 'hayır' : 'evet'} · teslimat{' '}
                  {branch.deliveryEnabled === false ? 'hayır' : 'evet'} · aktif{' '}
                  {branch.isActive === false ? 'hayır' : 'evet'}
                  {branch.estimatedDeliveryMinutesMin != null
                    ? ` · ETA ${branch.estimatedDeliveryMinutesMin}–${branch.estimatedDeliveryMinutesMax ?? '—'} dk`
                    : ''}
                </p>
                <label className="ops-field">
                  Ad
                  <input className="ops-input" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="ops-field">
                  Adres
                  <input
                    className="ops-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                <label className="ops-field">
                  Telefon
                  <input className="ops-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
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
                <div className="ops-form-actions">
                  <ActionButton variant="primary" onClick={() => void saveProfile()} disabled={busy}>
                    {busy ? 'Kaydediliyor' : 'Kaydet'}
                  </ActionButton>
                  {branch.isAcceptingOrders === false ? (
                    <ActionButton disabled={busy} onClick={() => void setAccepting(true)}>
                      Sipariş alımını aç
                    </ActionButton>
                  ) : (
                    <ActionButton variant="danger" disabled={busy} onClick={() => setConfirmAccepting(true)}>
                      Sipariş alımını kapat
                    </ActionButton>
                  )}
                </div>
                {flash ? (
                  <p className="ops-flash ops-flash--ok" role="status">
                    {flash}
                  </p>
                ) : null}
                {formError ? (
                  <p className="ops-flash ops-flash--err" role="alert">
                    {formError}
                  </p>
                ) : null}
              </div>
            </KeylineCard>
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
                              h.dayOfWeek === row.dayOfWeek ? { ...h, opensAt: e.target.value } : h,
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
                              h.dayOfWeek === row.dayOfWeek ? { ...h, closesAt: e.target.value } : h,
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
                                h.dayOfWeek === row.dayOfWeek ? { ...h, isClosed: e.target.checked } : h,
                              ),
                            )
                          }
                        />{' '}
                        Kapalı
                      </label>
                    </span>
                  </div>
                ))}
                <ActionButton variant="primary" onClick={() => void saveHours()} disabled={hoursBusy}>
                  {hoursBusy ? 'Kaydediliyor' : 'Saatleri kaydet'}
                </ActionButton>
              </div>
            </KeylineCard>
          </div>
        )}
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
