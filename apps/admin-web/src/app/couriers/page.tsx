'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { useBranchContext } from '../../components/ops/branch-context';
import { ConfirmDialog } from '../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { ActionButton } from '../../components/ops/ops-ui';
import { createAdminClient } from '../../lib/api';
import { canDispatchAssign, isUuid } from '../../lib/fulfillment-ops';
import {
  courierCreateSchema,
  couriersResponseSchema,
  deliveriesCreateSchema,
  reportCouriersSchema,
  unknownDataSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './couriers.module.css';

type Courier = z.infer<typeof couriersResponseSchema>['data'][number];
type CourierMetrics = { activeCount: number; deliveredCount: number };
type Filter = 'all' | 'active' | 'paused';
const EMPTY_COURIERS: Courier[] = [];

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}` : value.slice(0, 2)
  ).toUpperCase();
}

function courierName(courier: Courier): string {
  return courier.displayName?.trim() || 'İsimsiz kurye';
}

function capacityLabel(courier: Courier, metrics: CourierMetrics | undefined): string {
  return `${metrics?.activeCount ?? 0} / ${courier.maxActiveDeliveries ?? 3}`;
}

export default function CouriersPage() {
  const branch = useBranchContext();
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Courier[]>>({ status: 'loading' });
  const [metrics, setMetrics] = useState<Record<string, CourierMetrics>>({});
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [lastDeliveryId, setLastDeliveryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const courierResponse = await client.request({
        path: 'admin/couriers',
        schema: couriersResponseSchema,
      });

      let reportMetrics: Record<string, CourierMetrics> = {};
      try {
        const reportResponse = await client.request({
          path: 'admin/reports/couriers',
          schema: reportCouriersSchema,
        });
        reportMetrics = Object.fromEntries(
          reportResponse.data.map((row) => [
            row.courierId,
            { activeCount: row.activeCount ?? 0, deliveredCount: row.deliveredCount ?? 0 },
          ]),
        );
      } catch {
        // The roster remains useful when the optional reporting permission is absent.
      }

      setMetrics(reportMetrics);
      setSelectedId((prev) => prev || courierResponse.data[0]?.id || '');
      setState(
        courierResponse.data.length
          ? { status: 'ready', data: courierResponse.data }
          : { status: 'empty' },
      );
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const rows = state.status === 'ready' ? state.data : EMPTY_COURIERS;
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return rows.filter((courier) => {
      const name = courierName(courier).toLocaleLowerCase('tr-TR');
      const matchesSearch = !query || name.includes(query) || courier.phone?.includes(query);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' ? courier.isActive !== false : courier.isActive === false);
      return matchesSearch && matchesFilter;
    });
  }, [filter, rows, search]);

  const selected = rows.find((courier) => courier.id === selectedId) ?? filteredRows[0] ?? rows[0];
  const selectedMetrics = selected ? metrics[selected.id] : undefined;
  const activeCount = rows.filter((courier) => courier.isActive !== false).length;
  const pausedCount = rows.length - activeCount;
  const totalCapacity = rows.reduce((sum, courier) => sum + (courier.maxActiveDeliveries ?? 3), 0);
  const activeDeliveries = rows.reduce(
    (sum, courier) => sum + (metrics[courier.id]?.activeCount ?? 0),
    0,
  );

  async function registerCourier() {
    setBusy(true);
    setFormError(null);
    setFlash(null);
    if (!displayName.trim() || !isUuid(userId)) {
      setFormError('Kurye adı ve geçerli personel hesabı UUID bilgisi zorunlu.');
      setBusy(false);
      return;
    }
    try {
      await createAdminClient().request({
        method: 'POST',
        path: 'admin/couriers',
        body: {
          userId: userId.trim(),
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
        },
        schema: courierCreateSchema,
      });
      setFlash('Kurye filosuna yeni kayıt eklendi.');
      setDisplayName('');
      setUserId('');
      setPhone('');
      setRegisterOpen(false);
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function assignDelivery() {
    if (!selected) {
      setFormError('Önce atanacak bir kurye seçin.');
      setConfirmAssign(false);
      return;
    }
    const payload = {
      orderId: orderId.trim(),
      courierId: selected.id,
      branchId: branch.branchId,
    };
    if (!canDispatchAssign(payload)) {
      setFormError('Sipariş, kurye ve teslimat şubesi bilgilerini kontrol edin.');
      setConfirmAssign(false);
      return;
    }
    setBusy(true);
    setFormError(null);
    setFlash(null);
    try {
      const client = createAdminClient();
      const created = await client.request({
        method: 'POST',
        path: 'admin/deliveries',
        body: { orderId: payload.orderId, branchId: payload.branchId },
        schema: deliveriesCreateSchema,
      });
      await client.request({
        method: 'POST',
        path: `admin/deliveries/${created.data.id}/assign`,
        body: { courierId: payload.courierId },
        schema: unknownDataSchema,
      });
      setLastDeliveryId(created.data.id);
      setFlash(`${courierName(selected)} için teslimat görevi oluşturuldu.`);
      setOrderId('');
      setConfirmAssign(false);
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>
            <OpsIcon name="two_wheeler" /> Operasyon / Teslimat
          </div>
          <h1>Kurye kontrol kulesi</h1>
          <p>Filonun uygunluğunu, kapasitesini ve teslimat atamalarını tek akışta yönetin.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.liveState}>
            <i /> Canlı filo görünümü
          </span>
          <ActionButton variant="primary" onClick={() => setRegisterOpen(true)}>
            Yeni kurye
          </ActionButton>
        </div>
      </header>

      {flash ? (
        <div className={styles.notice} role="status">
          <OpsIcon name="check_circle" /> {flash}
          <button type="button" aria-label="Bildirimi kapat" onClick={() => setFlash(null)}>
            <OpsIcon name="close" />
          </button>
        </div>
      ) : null}
      {formError ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <OpsIcon name="error" /> {formError}
          <button
            type="button"
            aria-label="Hata bildirimini kapat"
            onClick={() => setFormError(null)}
          >
            <OpsIcon name="close" />
          </button>
        </div>
      ) : null}

      <dl className={styles.metrics} aria-label="Kurye özet metrikleri">
        <div className={styles.metric}>
          <dt>Toplam filo</dt>
          <dd>{rows.length}</dd>
          <span>kayıtlı kurye</span>
        </div>
        <div className={`${styles.metric} ${styles.metricGreen}`}>
          <dt>Uygun</dt>
          <dd>{activeCount}</dd>
          <span>aktif profil</span>
        </div>
        <div className={`${styles.metric} ${styles.metricBlue}`}>
          <dt>Aktif görev</dt>
          <dd>{activeDeliveries}</dd>
          <span>{totalCapacity || 0} toplam kapasite</span>
        </div>
        <div className={`${styles.metric} ${styles.metricMuted}`}>
          <dt>Beklemede</dt>
          <dd>{pausedCount}</dd>
          <span>pasif profil</span>
        </div>
      </dl>

      <OpsBoundary
        state={state}
        emptyTitle="Filoda kayıt yok"
        emptyDescription="İlk kuryeyi ekleyerek teslimat operasyonunu başlatın."
        onRetry={() => void load()}
      >
        {() => (
          <div className={styles.workspace}>
            <section className={styles.roster} aria-label="Kurye filosu">
              <header className={styles.sectionHeader}>
                <div>
                  <span className={styles.sectionKicker}>FİLO GÖRÜNÜMÜ</span>
                  <h2>Kurye filosu</h2>
                  <p>{filteredRows.length} kayıt · kapasite ve durum özeti</p>
                </div>
                <button type="button" className={styles.refreshButton} onClick={() => void load()}>
                  <OpsIcon name="refresh" /> Yenile
                </button>
              </header>
              <div className={styles.rosterTools}>
                <label className={styles.search}>
                  <OpsIcon name="search" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="İsim veya telefon ara"
                    aria-label="İsim veya telefon ara"
                  />
                  {search ? (
                    <button
                      type="button"
                      aria-label="Aramayı temizle"
                      onClick={() => setSearch('')}
                    >
                      <OpsIcon name="close" />
                    </button>
                  ) : null}
                </label>
                <div
                  className={styles.filterGroup}
                  role="tablist"
                  aria-label="Kurye durumu filtresi"
                >
                  {(
                    [
                      ['all', 'Tümü'],
                      ['active', 'Uygun'],
                      ['paused', 'Beklemede'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={filter === value}
                      className={filter === value ? styles.filterActive : undefined}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.rosterList}>
                {filteredRows.length === 0 ? (
                  <div className={styles.listEmpty}>
                    <OpsIcon name="manage_search" />
                    <strong>Sonuç bulunamadı</strong>
                    <span>Arama veya durum filtresini değiştirin.</span>
                  </div>
                ) : (
                  filteredRows.map((courier) => {
                    const courierMetrics = metrics[courier.id];
                    const max = courier.maxActiveDeliveries ?? 3;
                    const loadPercent = Math.min(
                      100,
                      ((courierMetrics?.activeCount ?? 0) / max) * 100,
                    );
                    const active = courier.isActive !== false;
                    return (
                      <button
                        type="button"
                        key={courier.id}
                        className={
                          selected?.id === courier.id
                            ? `${styles.courierRow} ${styles.courierRowSelected}`
                            : styles.courierRow
                        }
                        onClick={() => setSelectedId(courier.id)}
                      >
                        <span className={styles.avatar}>{initials(courierName(courier))}</span>
                        <span className={styles.courierIdentity}>
                          <strong>{courierName(courier)}</strong>
                          <small>{courier.phone || 'Telefon bilgisi yok'}</small>
                        </span>
                        <span className={styles.courierLoad}>
                          <span>
                            <b>{capacityLabel(courier, courierMetrics)}</b> görev
                          </span>
                          <i>
                            <em style={{ width: `${loadPercent}%` }} />
                          </i>
                        </span>
                        <span className={active ? styles.statusReady : styles.statusPaused}>
                          <i /> {active ? 'Uygun' : 'Beklemede'}
                        </span>
                        <OpsIcon name="chevron_right" />
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <aside className={styles.detail} aria-label="Seçili kurye ayrıntıları">
              {selected ? (
                <>
                  <header className={styles.detailHeader}>
                    <div className={styles.detailProfile}>
                      <span className={styles.avatarLarge}>{initials(courierName(selected))}</span>
                      <div>
                        <span className={styles.sectionKicker}>SEÇİLİ KURYE</span>
                        <h2>{courierName(selected)}</h2>
                        <p>{selected.phone || 'Telefon bilgisi yok'}</p>
                      </div>
                    </div>
                    <span
                      className={
                        selected.isActive === false ? styles.statusPaused : styles.statusReady
                      }
                    >
                      <i /> {selected.isActive === false ? 'Beklemede' : 'Uygun'}
                    </span>
                  </header>
                  <div className={styles.detailStats}>
                    <div>
                      <span>Aktif görev</span>
                      <strong>{selectedMetrics?.activeCount ?? 0}</strong>
                    </div>
                    <div>
                      <span>Kapasite</span>
                      <strong>{selected.maxActiveDeliveries ?? 3}</strong>
                    </div>
                    <div>
                      <span>Tamamlanan</span>
                      <strong>{selectedMetrics?.deliveredCount ?? 0}</strong>
                    </div>
                  </div>
                  <section className={styles.assignment}>
                    <header>
                      <div>
                        <span className={styles.sectionKicker}>HIZLI ATAMA</span>
                        <h3>Yeni teslimat görevi</h3>
                      </div>
                      <OpsIcon name="assignment_ind" />
                    </header>
                    <p>
                      Seçili şubeden bir siparişi {courierName(selected)} için teslimat kuyruğuna
                      alın.
                    </p>
                    <label>
                      Sipariş numarası veya ID
                      <input
                        className={styles.input}
                        value={orderId}
                        onChange={(event) => setOrderId(event.target.value)}
                        placeholder="Örn. SP00030 veya UUID"
                      />
                    </label>
                    <div className={styles.assignmentMeta}>
                      <span>
                        <OpsIcon name="storefront" /> {branch.selected?.name ?? 'Seçili şube'}
                      </span>
                      <span>
                        <OpsIcon name="speed" /> {capacityLabel(selected, selectedMetrics)} görev
                      </span>
                    </div>
                    <ActionButton
                      variant="primary"
                      disabled={
                        busy ||
                        selected.isActive === false ||
                        !canDispatchAssign({
                          orderId,
                          courierId: selected.id,
                          branchId: branch.branchId,
                        })
                      }
                      onClick={() => setConfirmAssign(true)}
                    >
                      Teslimatı ata
                    </ActionButton>
                    {lastDeliveryId ? (
                      <small className={styles.lastDelivery}>
                        Son görev: {lastDeliveryId.slice(0, 8)}…
                      </small>
                    ) : null}
                  </section>
                  <section className={styles.profileFacts}>
                    <header>
                      <span className={styles.sectionKicker}>PROFİL BİLGİSİ</span>
                      <OpsIcon name="verified_user" />
                    </header>
                    <div>
                      <span>Personel hesabı</span>
                      <strong>Bağlı</strong>
                    </div>
                    <div>
                      <span>Azami aktif görev</span>
                      <strong>{selected.maxActiveDeliveries ?? 3} teslimat</strong>
                    </div>
                    <div>
                      <span>Kurye kimliği</span>
                      <strong>{selected.id.slice(0, 8)}…</strong>
                    </div>
                  </section>
                </>
              ) : null}
            </aside>
          </div>
        )}
      </OpsBoundary>

      {registerOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setRegisterOpen(false)}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="courier-register-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <span className={styles.sectionKicker}>FİLOYA EKLE</span>
                <h2 id="courier-register-title">Yeni kurye profili</h2>
                <p>Personel hesabını teslimat operasyonuna bağlayın.</p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Pencereyi kapat"
                onClick={() => setRegisterOpen(false)}
              >
                <OpsIcon name="close" />
              </button>
            </header>
            <div className={styles.modalBody}>
              <label>
                Kurye adı
                <input
                  className={styles.input}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Örn. Deniz Yılmaz"
                />
              </label>
              <label>
                Personel hesabı UUID
                <input
                  className={`${styles.input} ${styles.inputMono}`}
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="Hesap UUID bilgisini girin"
                />
              </label>
              <label>
                Telefon <span>isteğe bağlı</span>
                <input
                  className={styles.input}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="05xx xxx xx xx"
                />
              </label>
              <div className={styles.formHint}>
                <OpsIcon name="info" /> Aktif görev kapasitesi sistem varsayılanı olan 3 teslimatla
                başlar.
              </div>
            </div>
            <footer className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setRegisterOpen(false)}
              >
                Vazgeç
              </button>
              <ActionButton
                variant="primary"
                disabled={busy}
                onClick={() => void registerCourier()}
              >
                {busy ? 'Kaydediliyor' : 'Kurye oluştur'}
              </ActionButton>
            </footer>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmAssign}
        title="Teslimat görevi oluştur"
        body={
          selected
            ? `${courierName(selected)} için ${orderId.trim()} siparişine yeni teslimat kaydı oluşturulacak ve kurye atanacak.`
            : 'Seçili kurye bulunamadı.'
        }
        confirmLabel="Görevi oluştur"
        busy={busy}
        onCancel={() => setConfirmAssign(false)}
        onConfirm={() => void assignDelivery()}
      />
    </div>
  );
}
