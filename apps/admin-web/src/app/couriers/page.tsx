'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { useBranchContext } from '../../components/ops/branch-context';
import { ConfirmDialog } from '../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { useOpsToast } from '../../components/ops/ops-toast';
import { ActionButton } from '../../components/ops/ops-ui';
import { useStaffAccess } from '../../components/ops/staff-access-context';
import { createAdminClient } from '../../lib/api';
import {
  createRequestFromDraft,
  filterCouriers,
  passwordPolicyState,
  rosterSummary,
  type Courier,
  type CourierDraft,
  type CourierFilter,
  type CourierMetrics,
} from '../../lib/courier-admin';
import {
  courierResponseSchema,
  couriersResponseSchema,
  deliveriesCreateSchema,
  reportCouriersSchema,
  unknownDataSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { CourierCreateDialog } from './courier-create-dialog';
import { CourierDetail } from './courier-detail';
import { CourierRoster } from './courier-roster';
import styles from './couriers.module.css';

const EMPTY_METRICS: Record<string, CourierMetrics> = {};
const EMPTY_ROSTER: Courier[] = [];

type MetricTone = 'ready' | 'paused' | 'muted';

const METRIC_TONE_CLASS: Record<MetricTone, string> = {
  ready: 'metricReady',
  paused: 'metricPaused',
  muted: 'metricMuted',
};

function MetricCell(props: {
  label: string;
  value: number;
  hint: string;
  tone?: MetricTone;
  testId?: string;
}) {
  const toneClass = props.tone ? styles[METRIC_TONE_CLASS[props.tone]] : undefined;
  return (
    <div
      className={toneClass ? `${styles.metricCell} ${toneClass}` : styles.metricCell}
      data-ff-metric={props.testId}
    >
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
      <span>{props.hint}</span>
    </div>
  );
}

function PasswordDialog(props: {
  courier: Courier;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const state = passwordPolicyState(password);
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const ready = state.met && !mismatch && password === confirmation;

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={props.onCancel}>
      <section
        className={`${styles.modal} ${styles.modalNarrow}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="courier-password-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.kicker}>GİRİŞ BİLGİSİ</span>
            <h2 id="courier-password-title">Şifre sıfırla</h2>
            <p>
              {props.courier.displayName} · @{props.courier.username}
            </p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Pencereyi kapat"
            onClick={props.onCancel}
            disabled={props.busy}
          >
            <OpsIcon name="close" />
          </button>
        </header>
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="courier-new-password">
              Yeni şifre
            </label>
            <input
              id="courier-new-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              aria-describedby="courier-new-password-hint"
            />
            <span
              className={state.met ? styles.fieldHintOk : styles.fieldHint}
              id="courier-new-password-hint"
            >
              {state.met
                ? 'Uzunluk kuralı karşılandı.'
                : `En az 12 karakter · ${state.remaining} eksik`}
            </span>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="courier-new-password-confirm">
              Yeni şifre tekrar
            </label>
            <input
              id="courier-new-password-confirm"
              className={styles.input}
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              aria-describedby={mismatch ? 'courier-new-password-confirm-hint' : undefined}
            />
            {mismatch ? (
              <span className={styles.fieldHint} id="courier-new-password-confirm-hint">
                Şifreler aynı değil.
              </span>
            ) : null}
          </div>
        </div>
        <footer className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={props.onCancel}
            disabled={props.busy}
          >
            Vazgeç
          </button>
          <ActionButton
            variant="primary"
            disabled={props.busy || !ready}
            onClick={() => props.onSubmit(password)}
          >
            {props.busy ? 'Sıfırlanıyor' : 'Şifreyi kaydet'}
          </ActionButton>
        </footer>
      </section>
    </div>
  );
}

export default function CouriersPage() {
  const branch = useBranchContext();
  const access = useStaffAccess();
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();

  const [state, setState] = useState<LoadState<Courier[]>>({ status: 'loading' });
  const [metrics, setMetrics] = useState<Record<string, CourierMetrics>>(EMPTY_METRICS);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CourierFilter>('all');
  const [branchScope, setBranchScope] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordFor, setPasswordFor] = useState<Courier | null>(null);
  const [deliveryFor, setDeliveryFor] = useState<{ courier: Courier; orderId: string } | null>(
    null,
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const roster = await client.request({
        path: 'admin/couriers',
        schema: couriersResponseSchema,
      });
      let reportMetrics: Record<string, CourierMetrics> = {};
      try {
        const report = await client.request({
          path: 'admin/reports/couriers',
          schema: reportCouriersSchema,
        });
        reportMetrics = Object.fromEntries(
          report.data.map((row) => [
            row.courierId,
            { activeCount: row.activeCount ?? 0, deliveredCount: row.deliveredCount ?? 0 },
          ]),
        );
      } catch {
        // Reporting needs a separate permission; the roster works without it.
      }
      setMetrics(reportMetrics);
      setSelectedId((previous) => previous || roster.data[0]?.id || '');
      setState(roster.data.length ? { status: 'ready', data: roster.data } : { status: 'empty' });
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

  const rows = useMemo(() => (state.status === 'ready' ? state.data : EMPTY_ROSTER), [state]);
  const summary = useMemo(() => rosterSummary(rows, metrics), [rows, metrics]);
  const visible = useMemo(
    () => filterCouriers(rows, { query, filter, branchId: branchScope }),
    [branchScope, filter, query, rows],
  );
  // The detail column must always describe a row the operator can actually see.
  // Searching or filtering can hide the previously selected courier; falling
  // through to the first visible row keeps the two columns in step instead of
  // showing a profile that is not in the list.
  const selected = useMemo(() => {
    const stillVisible = visible.find((courier) => courier.id === selectedId);
    return stillVisible ?? visible[0] ?? rows[0];
  }, [rows, selectedId, visible]);

  const lockedBranchId = access.isSuperAdmin ? null : (access.branchIds[0] ?? null);
  const branchOptions = useMemo(
    () => branch.branches.map((option) => ({ id: option.id, name: option.name })),
    [branch.branches],
  );

  async function run(action: string, task: () => Promise<string>): Promise<void> {
    setBusyAction(action);
    try {
      toast.success(await task());
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  function createCourier(draft: CourierDraft): void {
    void run('create', async () => {
      await createAdminClient().request({
        method: 'POST',
        path: 'admin/couriers',
        body: createRequestFromDraft(draft),
        schema: courierResponseSchema,
      });
      setCreateOpen(false);
      return `${draft.displayName.trim()} kurye olarak eklendi.`;
    });
  }

  function toggleActive(courier: Courier): void {
    void run('active', async () => {
      const next = await createAdminClient().request({
        method: 'PATCH',
        path: `admin/couriers/${courier.id}`,
        body: { isActive: !courier.isActive },
        schema: courierResponseSchema,
      });
      return `${next.data.displayName} ${next.data.isActive ? 'uygun' : 'beklemeye'} alındı.`;
    });
  }

  function saveBranches(courier: Courier, branchIds: string[]): void {
    void run('branches', async () => {
      const next = await createAdminClient().request({
        method: 'PUT',
        path: `admin/couriers/${courier.id}/branches`,
        body: { branchIds },
        schema: courierResponseSchema,
      });
      return `${next.data.displayName} için ${next.data.branches.length} şube atandı.`;
    });
  }

  function resetPassword(password: string): void {
    const courier = passwordFor;
    if (!courier) return;
    void run('password', async () => {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/couriers/${courier.id}/password`,
        body: { password },
        schema: courierResponseSchema,
      });
      setPasswordFor(null);
      return `${courier.displayName} için yeni şifre tanımlandı.`;
    });
  }

  function assignDelivery(): void {
    const target = deliveryFor;
    if (!target) return;
    void run('delivery', async () => {
      const client = createAdminClient();
      const created = await client.request({
        method: 'POST',
        path: 'admin/deliveries',
        body: { orderId: target.orderId, branchId: branch.branchId },
        schema: deliveriesCreateSchema,
      });
      await client.request({
        method: 'POST',
        path: `admin/deliveries/${created.data.id}/assign`,
        body: { courierId: target.courier.id },
        schema: unknownDataSchema,
      });
      setDeliveryFor(null);
      return `${target.courier.displayName} için teslimat görevi oluşturuldu.`;
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>
            <OpsIcon name="two_wheeler" /> Operasyon / Teslimat
          </div>
          <h1>Kurye filosu</h1>
          <p>
            Her kurye bir hesaptır: giriş bilgileri, şube ataması ve anlık yükü tek ekrandan
            yönetin.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.liveState}>
            <i /> Canlı filo görünümü
          </span>
          <ActionButton variant="primary" onClick={() => setCreateOpen(true)}>
            Yeni kurye
          </ActionButton>
        </div>
      </header>

      <dl className={styles.metricRail} aria-label="Kurye özet metrikleri">
        <MetricCell
          label="Toplam kurye"
          value={summary.total}
          hint="kayıtlı hesap"
          testId="total"
        />
        <MetricCell
          label="Uygun"
          value={summary.ready}
          hint="girişe hazır"
          tone="ready"
          testId="ready"
        />
        <MetricCell
          label="Beklemede"
          value={summary.paused}
          hint="duraklatılmış"
          tone="paused"
          testId="paused"
        />
        <MetricCell
          label="Şubesiz"
          value={summary.unassigned}
          hint="atanması gerekiyor"
          testId="unassigned"
        />
        <MetricCell
          label="Aktif görev"
          value={summary.activeDeliveries}
          hint={`${summary.capacity} toplam kapasite`}
          testId="load"
        />
      </dl>

      <OpsBoundary
        state={state}
        emptyTitle="Filoda kayıt yok"
        emptyDescription="İlk kuryeyi ekleyerek teslimat operasyonunu başlatın."
        onRetry={() => void load()}
      >
        {() => (
          <div className={styles.workspace}>
            <CourierRoster
              couriers={visible}
              metrics={metrics}
              selectedId={selected?.id ?? ''}
              query={query}
              filter={filter}
              branchOptions={branchOptions}
              branchScope={branchScope}
              canPickBranch={access.isSuperAdmin}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onBranchScopeChange={setBranchScope}
              onSelect={setSelectedId}
              onRefresh={() => void load()}
              refreshing={state.status === 'loading'}
            />
            {selected ? (
              <CourierDetail
                key={selected.id}
                courier={selected}
                metrics={metrics[selected.id]}
                branchOptions={branchOptions}
                canEditBranches={access.isSuperAdmin}
                busyAction={busyAction}
                deliveryBranchName={branch.selected?.name ?? 'Seçili şube'}
                onToggleActive={toggleActive}
                onSaveBranches={saveBranches}
                onResetPassword={setPasswordFor}
                onRequestDelivery={(courier, orderId) => setDeliveryFor({ courier, orderId })}
              />
            ) : null}
          </div>
        )}
      </OpsBoundary>

      {createOpen ? (
        <CourierCreateDialog
          branches={branchOptions}
          lockedBranchId={lockedBranchId}
          busy={busyAction === 'create'}
          onClose={() => setCreateOpen(false)}
          onSubmit={createCourier}
        />
      ) : null}

      {passwordFor ? (
        <PasswordDialog
          courier={passwordFor}
          busy={busyAction === 'password'}
          onCancel={() => {
            setPasswordFor(null);
          }}
          onSubmit={resetPassword}
        />
      ) : null}

      <ConfirmDialog
        open={deliveryFor !== null}
        title="Teslimat görevi oluştur"
        body={
          deliveryFor
            ? `${deliveryFor.orderId} siparişi ${deliveryFor.courier.displayName} için teslimat kuyruğuna alınacak.`
            : ''
        }
        confirmLabel="Görevi oluştur"
        busy={busyAction === 'delivery'}
        onCancel={() => setDeliveryFor(null)}
        onConfirm={assignDelivery}
      />
    </div>
  );
}
