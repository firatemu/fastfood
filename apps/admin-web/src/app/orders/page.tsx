'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

import { type LoadState } from '../../components/async-boundary';
import { useBranchContext } from '../../components/ops/branch-context';
import {
  ColumnVisibilityMenu,
  useColumnMenuAnchor,
  useColumnVisibility,
} from '../../components/ops/column-visibility-menu';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { useOpsSync } from '../../components/ops/ops-sync';
import { ActionButton, KeylineCard, OperationalMetric } from '../../components/ops/ops-ui';
import { OrderItemsDialog } from '../../components/ops/order-items-dialog';
import { OrderReceipt } from '../../components/ops/order-receipt';
import { OrdersDataGrid } from '../../components/ops/orders-data-grid';
import { createAdminClient } from '../../lib/api';
import {
  STATUS_GROUPS,
  fulfillmentLabel,
  orderStatusLabel,
  type StatusGroupId,
} from '../../lib/order-status';
import { countForGroup, summarizeKpis } from '../../lib/order-summary';
import {
  orderResponseSchema,
  orderSummaryResponseSchema,
  ordersResponseSchema,
  pickupTokenResponseSchema,
  type orderSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

type Order = z.infer<typeof orderSchema>;

type GroupFilter = 'all' | StatusGroupId;

const GROUP_OPTIONS: { id: GroupFilter; label: string; statuses: readonly string[] }[] = [
  { id: 'all', label: 'Tümü', statuses: [] },
  { id: 'active', label: 'Aktif', statuses: STATUS_GROUPS.active },
  { id: 'waiting', label: 'Mutfakta', statuses: STATUS_GROUPS.waiting },
  { id: 'completed', label: 'Tamamlanan', statuses: STATUS_GROUPS.completed },
  { id: 'refunded', label: 'İade', statuses: STATUS_GROUPS.refunded },
];

const DATE_PRESETS = [
  { id: 'today', label: 'Bugün' },
  { id: '7d', label: 'Son 7 gün' },
  { id: '30d', label: 'Son 30 gün' },
  { id: 'all', label: 'Tüm zamanlar' },
] as const;

type DatePresetId = (typeof DATE_PRESETS)[number]['id'];

/**
 * Verilen tarih ön ayarına karşılık UTC aralığını döndürür.
 * Çıktı ISO-8601 UTC formatındadır; backend sorgularında kullanılır.
 */
function dateRangeFor(preset: DatePresetId): { from?: string; to?: string } {
  const now = new Date();
  if (preset === 'all') return {};
  const start = new Date(now);
  if (preset === 'today') {
    start.setUTCHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  start.setUTCDate(now.getUTCDate() - (preset === '7d' ? 7 : 30));
  return { from: start.toISOString(), to: now.toISOString() };
}

export default function OrdersPage() {
  const params = useSearchParams();
  const { branchId, selected } = useBranchContext();
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [ordersState, setOrdersState] = useState<LoadState<Order[]>>({ status: 'loading' });
  const [summaryState, setSummaryState] = useState<LoadState<unknown>>({ status: 'loading' });
  const [group, setGroup] = useState<GroupFilter>(
    (params.get('group') as GroupFilter | null) ?? 'active',
  );
  const [preset, setPreset] = useState<DatePresetId>(
    (params.get('preset') as DatePresetId | null) ?? '7d',
  );
  const [mode, setMode] = useState<string>(params.get('mode') ?? '');
  const [query, setQuery] = useState<string>(params.get('q') ?? '');
  const [minMinor, setMinMinor] = useState<string>(params.get('minMinor') ?? '');
  const [maxMinor, setMaxMinor] = useState<string>(params.get('maxMinor') ?? '');
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [receiptToken, setReceiptToken] = useState<{
    token: string;
    prefix: string;
    expiresAt: string;
  } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const {
    visibility: columnVisibility,
    mounted: columnsMounted,
    setVisibility: setColumnVisibility,
  } = useColumnVisibility();
  const columnsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const columnsMenu = useColumnMenuAnchor(columnsTriggerRef);

  const openReceipt = useCallback(async (order: Order) => {
    setReceiptOrder(order);
    setPrinting(true);
    try {
      const res = await createAdminClient().request({
        method: 'POST',
        path: `admin/orders/${order.id}/pickup-token`,
        schema: pickupTokenResponseSchema,
      });
      setReceiptToken({
        token: res.data.token,
        prefix: res.data.prefix,
        expiresAt: res.data.expiresAt,
      });
    } catch (err) {
      console.warn('Fiş kodu (pickup token) alınamadı:', err);
      setReceiptToken(null);
    } finally {
      setPrinting(false);
    }
  }, []);

  const closeReceipt = useCallback(() => {
    setReceiptOrder(null);
    setReceiptToken(null);
  }, []);

  const printReceipt = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  const buildFilters = useCallback(
    (currentCursor: string | null) => {
      const groupDef = GROUP_OPTIONS.find((option) => option.id === group) ?? GROUP_OPTIONS[0];
      if (!groupDef) {
        throw new Error('GROUP_OPTIONS must contain at least the default entry.');
      }
      const statuses = group === 'all' ? [] : [...groupDef.statuses];
      const range = dateRangeFor(preset);
      return {
        branchId,
        statuses: statuses.length > 0 ? statuses.join(',') : undefined,
        mode: mode === '' ? undefined : mode,
        from: range.from,
        to: range.to,
        minMinor: minMinor && minMinor !== '' ? minMinor : undefined,
        maxMinor: maxMinor && maxMinor !== '' ? maxMinor : undefined,
        q: query && query !== '' ? query : undefined,
        cursor: currentCursor ?? undefined,
        limit: 50,
      };
    },
    [branchId, group, mode, minMinor, maxMinor, preset, query],
  );

  const load = useCallback(
    async (cursorOverride: string | null = null) => {
      setOrdersState({ status: 'loading' });
      try {
        const res = await createAdminClient().request({
          path: 'admin/orders',
          query: buildFilters(cursorOverride),
          schema: ordersResponseSchema,
        });
        setTotal(typeof res.meta?.total === 'number' ? res.meta.total : res.data.length);
        setCursor(typeof res.meta?.nextCursor === 'string' ? res.meta.nextCursor : null);
        if (res.data.length === 0) setOrdersState({ status: 'empty' });
        else setOrdersState({ status: 'ready', data: res.data });
        markSynced();
      } catch (error) {
        setOrdersState({ status: 'error', error });
        markStale();
      }
    },
    [buildFilters, markStale, markSynced],
  );

  const loadSummary = useCallback(async () => {
    setSummaryState({ status: 'loading' });
    try {
      const res = await createAdminClient().request({
        path: 'admin/orders/summary',
        query: { branchId },
        schema: orderSummaryResponseSchema,
      });
      setSummaryState({ status: 'ready', data: res.data });
    } catch (error) {
      setSummaryState({ status: 'error', error });
    }
  }, [branchId]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void loadSummary(), [loadSummary]);
  useDeferredLoad(() => void load(null), [load]);

  const runInlineTransition = useCallback(
    async (row: Order, toStatus: string) => {
      setTransitioningId(row.id);
      setTransitionError(null);
      try {
        await createAdminClient().request({
          method: 'POST',
          path: `admin/orders/${row.id}/transitions`,
          body: { toStatus, reason: 'datagrid_inline' },
          schema: orderResponseSchema,
        });
        await load(cursor);
      } catch (err) {
        const reason =
          err && typeof err === 'object' && 'envelope' in err
            ? (err as { envelope: { error: { message: string } } }).envelope.error.message
            : err instanceof Error
              ? err.message
              : 'İşlem tamamlanamadı.';
        setTransitionError(reason);
      } finally {
        setTransitioningId(null);
      }
    },
    [cursor, load],
  );

  const goPage = useCallback(
    (next: 'next' | 'prev') => {
      if (next === 'next' && cursor) {
        setCursorStack((prev) => [...prev, cursor]);
        void load(cursor);
      } else if (next === 'prev' && cursorStack.length > 0) {
        const nextCursor = cursorStack[cursorStack.length - 1] ?? null;
        const nextStack = cursorStack.slice(0, -1);
        setCursorStack(nextStack);
        void load(nextCursor);
      }
    },
    [cursor, cursorStack, load],
  );

  const summaryKpis = useMemo(() => {
    if (summaryState.status !== 'ready') return null;
    const data = summaryState.data as { kpis?: unknown; counts?: Record<string, number> };
    return {
      ...summarizeKpis(data.kpis as never),
      counts: data.counts ?? {},
    };
  }, [summaryState]);

  const activeGroupCount = useMemo(() => {
    if (!summaryKpis) return null;
    if (group === 'all') {
      return Object.values(summaryKpis.counts).reduce((acc, value) => acc + Number(value ?? 0), 0);
    }
    const groupDef = GROUP_OPTIONS.find((option) => option.id === group);
    return countForGroup(summaryKpis.counts, groupDef?.statuses ?? []);
  }, [summaryKpis, group]);

  const orders = useMemo<Order[]>(
    () => (ordersState.status === 'ready' ? ordersState.data : []),
    [ordersState],
  );

  const exportCsv = useCallback(() => {
    if (orders.length === 0) return;
    const rows: string[] = [
      ['Sipariş No', 'Durum', 'Kanal', 'Müşteri', 'Tutar', 'Yaş', 'Ödeme'].join(','),
    ];
    for (const row of orders) {
      rows.push(
        [
          row.id,
          orderStatusLabel(row.status),
          fulfillmentLabel(row.fulfillmentMode),
          row.userId ?? '—',
          row.finalPayableMinor
            ? formatTryMinor(row.finalPayableMinor, row.currency ?? 'TRY')
            : '—',
          row.createdAt ?? '',
          row.payment?.status ?? '',
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${branchId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [orders, branchId]);

  return (
    <div className="ops-page">
      <header className="ops-orders-header">
        <div className="ops-orders-header__row">
          <div className="ops-orders-header__title">
            <h1 className="ops-page__hero-title">Siparişler</h1>
            <span className="ops-scope-tag">Şube · {selected?.name ?? '—'}</span>
          </div>
          <div className="ops-orders-header__actions">
            <ActionButton onClick={() => void load()}>Yenile</ActionButton>
            <ActionButton onClick={exportCsv} disabled={orders.length === 0}>
              CSV indir
            </ActionButton>
          </div>
        </div>
        <div className="ops-orders-header__meta">
          <code>admin/orders</code> · <code>admin/orders/summary</code> · ERP üst düzey görünüm.
        </div>
      </header>

      <dl className="ops-metrics ops-metrics--premium" aria-label="Operasyonel KPI">
        <OperationalMetric
          label={`Bu sekme${activeGroupCount != null ? '' : ''}`}
          value={activeGroupCount != null ? String(activeGroupCount) : '—'}
          hint={GROUP_OPTIONS.find((option) => option.id === group)?.label ?? 'Tümü'}
        />
        <OperationalMetric
          label="Hazırlanan"
          value={summaryKpis ? String(summaryKpis.prepCount) : '—'}
          hint="Mutfakta / paketlendi"
        />
        <OperationalMetric
          label="Bugün ciro"
          value={summaryKpis?.grossTodayLabel ?? '—'}
          hint="Ödendi + Teslim edildi"
        />
        <OperationalMetric
          label="Bugün iade"
          value={summaryKpis?.refundsTodayLabel ?? '—'}
          hint="iade serisi durumlar"
        />
        <OperationalMetric
          label="Ortalama sepet"
          value={summaryKpis?.avgTicketLabel ?? '—'}
          hint="Bugün teslim edildi"
        />
        <OperationalMetric
          label="İptal oranı"
          value={summaryKpis?.cancellationRateLabel ?? '—'}
          hint="İptal + Reddedildi"
        />
      </dl>

      <section className="ops-toolbar ops-orders-toolbar" aria-label="Filtreler">
        <label className="ops-field ops-field--wide">
          Arama
          <input
            className="ops-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sipariş / müşteri"
            aria-label="Sipariş ara"
          />
        </label>
        <label className="ops-field">
          Kanal
          <select
            className="ops-select"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            aria-label="Kanal"
          >
            <option value="">Tümü</option>
            <option value="DELIVERY">Teslimat</option>
            <option value="PICKUP">Gel-al</option>
          </select>
        </label>
        <label className="ops-field">
          Tarih
          <select
            className="ops-select"
            value={preset}
            onChange={(event) => setPreset(event.target.value as DatePresetId)}
            aria-label="Tarih aralığı"
          >
            {DATE_PRESETS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ops-field">
          Min tutar
          <input
            className="ops-input"
            inputMode="numeric"
            value={minMinor}
            onChange={(event) => setMinMinor(event.target.value)}
            placeholder="kuruş"
            aria-label="Minimum tutar (kuruş)"
          />
        </label>
        <label className="ops-field">
          Maks tutar
          <input
            className="ops-input"
            inputMode="numeric"
            value={maxMinor}
            onChange={(event) => setMaxMinor(event.target.value)}
            placeholder="kuruş"
            aria-label="Maksimum tutar (kuruş)"
          />
        </label>
      </section>

      <div className="ops-status-tabs" role="tablist" aria-label="Durum sekmeleri">
        {GROUP_OPTIONS.map((option) => {
          const active = option.id === group;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`ops-status-tab${active ? ' ops-status-tab--active' : ''}`}
              onClick={() => {
                setGroup(option.id);
                setCursorStack([]);
                setCursor(null);
              }}
            >
              {option.label}
              {summaryKpis ? (
                <span className="ops-status-tab__count">
                  {option.id === 'all'
                    ? Object.values(summaryKpis.counts).reduce(
                        (acc, value) => acc + Number(value ?? 0),
                        0,
                      )
                    : countForGroup(summaryKpis.counts, option.statuses)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {transitionError ? (
        <p className="ops-alert ops-alert--err" role="alert">
          {transitionError}
        </p>
      ) : null}

      <div className="orders-toolbar">
        <div className="orders-toolbar__summary">
          <span className="orders-toolbar__count">
            <strong>{orders.length}</strong> sipariş gösteriliyor
          </span>
        </div>
        <div className="orders-toolbar__actions">
          <ActionButton onClick={() => void load(cursor)}>Yenile</ActionButton>
          <button
            ref={columnsTriggerRef}
            type="button"
            className="orders-toolbar__columns-trigger"
            aria-haspopup="dialog"
            aria-expanded={columnsMenu.open}
            onClick={columnsMenu.toggle}
            data-ff-columns-trigger="true"
          >
            <span className="material-symbols-outlined">view_column</span>
            Kolonlar
          </button>
        </div>
      </div>

      <OpsBoundary
        state={ordersState}
        emptyTitle="Bu görünümde sipariş yok"
        emptyDescription="Seçili filtrelerle eşleşen sipariş bulunamadı. Filtreleri değiştirip tekrar deneyin."
        onRetry={() => void load()}
      >
        {(rows) => (
          <>
            <OrdersDataGrid
              rows={rows}
              onRowClick={setDetailOrder}
              onTransition={(row, toStatus) => void runInlineTransition(row, toStatus)}
              onPrintReceipt={(row) => void openReceipt(row)}
              busyOrderId={transitioningId}
              visibility={
                columnsMounted
                  ? columnVisibility
                  : {
                      orderNo: true,
                      status: true,
                      customer: true,
                      items: true,
                      amount: true,
                      elapsed: true,
                      receipt: true,
                      mode: false,
                    }
              }
              ariaLabel="Sipariş tablosu"
            />
            <div className="ops-premium-table__pager">
              <span className="ops-premium-table__total">Toplam {total ?? rows.length}</span>
              <div className="ops-premium-table__pager-buttons">
                <ActionButton onClick={() => goPage('prev')} disabled={cursorStack.length === 0}>
                  Önceki
                </ActionButton>
                <ActionButton onClick={() => goPage('next')} disabled={!cursor}>
                  Sonraki
                </ActionButton>
              </div>
            </div>
          </>
        )}
      </OpsBoundary>

      {columnsMounted ? (
        <ColumnVisibilityMenu
          open={columnsMenu.open}
          onClose={columnsMenu.close}
          visibility={columnVisibility}
          onChange={setColumnVisibility}
          anchorTop={columnsMenu.anchor.top}
          anchorLeft={columnsMenu.anchor.left}
        />
      ) : null}

      <OrderItemsDialog order={detailOrder} onClose={() => setDetailOrder(null)} />

      {receiptOrder ? (
        <div
          className="ops-receipt-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Sipariş fişi"
          onClick={closeReceipt}
        >
          <div className="ops-receipt-modal__panel" onClick={(event) => event.stopPropagation()}>
            <header className="ops-receipt-modal__header">
              <div>
                <strong>Sipariş fişini yazdır</strong>
                <p className="muted">
                  Sipariş no: {receiptOrder.displayNumber ?? receiptOrder.id.slice(0, 8)} ·{' '}
                  {receiptToken
                    ? 'Fiş kodu alındı'
                    : printing
                      ? 'Fiş kodu alınıyor…'
                      : 'Fiş kodu alınamadı'}
                </p>
              </div>
              <div className="ops-receipt-modal__actions">
                <ActionButton onClick={closeReceipt}>Kapat</ActionButton>
                <ActionButton variant="primary" onClick={printReceipt}>
                  Yazdır
                </ActionButton>
              </div>
            </header>
            <OrderReceipt
              order={receiptOrder}
              pickupToken={receiptToken?.token}
              pickupPrefix={receiptToken?.prefix}
              pickupExpiresAt={receiptToken?.expiresAt}
            />
          </div>
        </div>
      ) : null}

      <KeylineCard title="Veri kaynakları">
        <p className="ops-page__lede">
          Şube kapsamı {selected?.name ?? '—'}. Operasyon özetleri <code>admin/orders/summary</code>
          , liste <code>admin/orders</code> uçlarından çekilir; mutfak canlı kartı{' '}
          <code>admin/kitchen</code> ile KDS panelinde tutulur.
        </p>
      </KeylineCard>
    </div>
  );
}
