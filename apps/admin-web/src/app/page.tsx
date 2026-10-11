'use client';

import { formatTryMinor } from '@fastfood/contracts';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { type LoadState } from '../components/async-boundary';
import { useBranchContext } from '../components/ops/branch-context';
import { OpsBoundary } from '../components/ops/ops-boundary';
import { useOpsSync } from '../components/ops/ops-sync';
import { OperationalTable } from '../components/ops/ops-table';
import { ActionButton, OpsError, OpsLoading, StatusBadge } from '../components/ops/ops-ui';
import { createAdminClient } from '../lib/api';
import { dashboardMetrics } from '../lib/dashboard-metrics';
import { formatOpsDateTime, shortId } from '../lib/ops-time';
import {
  fulfillmentLabel,
  orderStatusLabel,
  orderStatusTone,
  type StatusTone,
} from '../lib/order-status';
import {
  orderSummaryResponseSchema,
  ordersResponseSchema,
  reportBranchesSchema,
  type orderSchema,
} from '../lib/schemas';
import { useDeferredLoad } from '../lib/use-deferred-load';

import styles from './dashboard.module.css';

type Order = z.infer<typeof orderSchema>;
type OrderSummary = z.infer<typeof orderSummaryResponseSchema>['data'];
type BranchReport = z.infer<typeof reportBranchesSchema>['data'][number];
type BranchTotal = {
  id: string;
  name: string;
  code?: string;
  orderCount: number;
  grossMinor: string;
};

function todayInIstanbul(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const FLOW_ITEMS: Array<{
  status: string;
  label: string;
  icon: string;
  tone: StatusTone;
}> = [
  { status: 'BRANCH_ASSIGNED', label: 'Şubeye atandı', icon: 'assignment_ind', tone: 'warn' },
  { status: 'PREPARING', label: 'Hazırlanıyor', icon: 'skillet', tone: 'amber' },
  { status: 'READY_FOR_COURIER', label: 'Paketlendi', icon: 'inventory_2', tone: 'ready' },
  { status: 'ON_THE_WAY', label: 'Yolda', icon: 'local_shipping', tone: 'logistics' },
  { status: 'DELIVERED', label: 'Teslim edildi', icon: 'check_circle', tone: 'ready' },
];

function netRevenueLabel(summary: OrderSummary | null, fallback: string): string {
  if (!summary) return fallback;
  const gross = BigInt(summary.kpis.grossTodayMinor);
  const refunds = BigInt(summary.kpis.refundsTodayMinor);
  return formatTryMinor((gross > refunds ? gross - refunds : 0n).toString(), 'TRY');
}

function orderCountForStatus(
  status: string,
  summary: OrderSummary | null,
  orders: Order[],
): number {
  if (summary) return Number(summary.counts[status] ?? 0);
  return orders.filter((order) => normalizeOrderStatus(order.status) === status).length;
}

function normalizeOrderStatus(status: string): string {
  return status === 'BRANCH_ACCEPTED' ? 'BRANCH_ASSIGNED' : status;
}

export default function AdminHomePage() {
  const router = useRouter();
  const { branchId, selected, branches, loading: branchesLoading } = useBranchContext();
  const [ordersState, setOrdersState] = useState<LoadState<Order[]>>({ status: 'loading' });
  const [branchReportState, setBranchReportState] = useState<LoadState<BranchTotal[]>>({
    status: 'loading',
  });
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [kitchenCount, setKitchenCount] = useState(0);
  const [reportDate, setReportDate] = useState(todayInIstanbul);
  const [branchQuery, setBranchQuery] = useState('');
  const [branchSorting, setBranchSorting] = useState<SortingState>([{ id: 'gross', desc: true }]);
  const [branchPagination, setBranchPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const { markStale, markSynced, registerRefresh } = useOpsSync();

  const load = useCallback(async () => {
    setOrdersState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const [orders, kitchen, summaryResponse] = await Promise.all([
        client.request({
          path: 'admin/orders',
          query: { branchId },
          schema: ordersResponseSchema,
        }),
        client
          .request({
            path: 'admin/kitchen',
            query: { branchId },
            schema: ordersResponseSchema,
          })
          .catch(() => ({ data: [] as Order[] })),
        client
          .request({
            path: 'admin/orders/summary',
            query: { branchId },
            schema: orderSummaryResponseSchema,
          })
          .catch(() => null),
      ]);

      setKitchenCount(kitchen.data.length);
      setSummary(summaryResponse?.data ?? null);
      if (orders.data.length === 0) setOrdersState({ status: 'empty' });
      else setOrdersState({ status: 'ready', data: orders.data });
      markSynced();
    } catch (error) {
      setOrdersState({ status: 'error', error });
      setSummary(null);
      markStale();
    }
  }, [branchId, markStale, markSynced]);

  const loadBranchTotals = useCallback(async () => {
    if (branchesLoading) return;
    setBranchReportState({ status: 'loading' });
    try {
      const response = await createAdminClient().request({
        path: 'admin/reports/branches',
        query: { date: reportDate },
        schema: reportBranchesSchema,
      });
      const reports = new Map<string, BranchReport>(
        response.data.map((row) => [row.branchId, row]),
      );
      const rows = branches.map((branch) => {
        const report = reports.get(branch.id);
        return {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          orderCount: Number(report?.orderCount ?? 0),
          grossMinor: report?.grossMinor ?? '0',
        } satisfies BranchTotal;
      });
      setBranchReportState(rows.length ? { status: 'ready', data: rows } : { status: 'empty' });
      markSynced();
    } catch (error) {
      setBranchReportState({ status: 'error', error });
      markStale();
    }
  }, [branches, branchesLoading, markStale, markSynced, reportDate]);

  const refreshDashboard = useCallback(
    async () => Promise.all([load(), loadBranchTotals()]).then(() => undefined),
    [load, loadBranchTotals],
  );

  useEffect(() => {
    registerRefresh(() => refreshDashboard());
    return () => registerRefresh(null);
  }, [refreshDashboard, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);
  useDeferredLoad(() => void loadBranchTotals(), [loadBranchTotals]);

  const orders = useMemo(
    () => (ordersState.status === 'ready' ? ordersState.data : []),
    [ordersState],
  );
  const metrics =
    ordersState.status === 'ready' ? dashboardMetrics({ orders, kitchenCount }) : null;
  const activeCount = summary?.kpis.activeCount ?? metrics?.activeCount ?? 0;
  const prepCount = summary?.kpis.prepCount ?? metrics?.kitchenCount ?? kitchenCount;
  const deliveredToday = summary?.kpis.deliveredToday ?? 0;
  const averageTicket = summary ? formatTryMinor(summary.kpis.avgTicketMinor, 'TRY') : '—';
  const cancellationRate = summary
    ? `${(Number(summary.kpis.cancellationRateBps) / 100).toFixed(1)}%`
    : metrics
      ? `${metrics.cancelledToday} kayıt`
      : '—';
  const statusRows = useMemo(
    () =>
      FLOW_ITEMS.map((item) => ({
        ...item,
        count: orderCountForStatus(item.status, summary, orders),
      })),
    [orders, summary],
  );
  const maxFlowCount = Math.max(1, ...statusRows.map((item) => item.count));
  const fallbackNetLabel = metrics?.todayNetLabel ?? '—';
  const branchLabel = selected?.name ?? 'Şube kapsamı yükleniyor';
  const dateLabel = formatOpsDateTime(new Date().toISOString());
  const branchRows = useMemo(
    () => (branchReportState.status === 'ready' ? branchReportState.data : []),
    [branchReportState],
  );
  const branchReportTotals = useMemo(
    () =>
      branchRows.reduce(
        (totals, row) => ({
          count: totals.count + row.orderCount,
          amount: totals.amount + BigInt(row.grossMinor),
        }),
        { count: 0, amount: 0n },
      ),
    [branchRows],
  );
  const grandTotalMinor = branchReportTotals.amount.toString();
  const branchColumns = useMemo<ColumnDef<BranchTotal>[]>(
    () => [
      {
        id: 'branch',
        accessorFn: (row) => `${row.name} ${row.code ?? ''}`,
        header: 'Şube',
        cell: ({ row }) => (
          <div className={styles.branchIdentity}>
            <span className={styles.branchMark} aria-hidden="true">
              {row.original.name.slice(0, 1).toLocaleUpperCase('tr-TR')}
            </span>
            <span>
              <strong>{row.original.name}</strong>
              <small>{row.original.code || 'Şube kodu yok'}</small>
            </span>
          </div>
        ),
      },
      {
        id: 'orders',
        accessorKey: 'orderCount',
        header: 'Sipariş adedi',
        cell: ({ getValue }) => <span className={styles.branchCount}>{getValue<number>()}</span>,
      },
      {
        id: 'gross',
        accessorFn: (row) => row.grossMinor,
        header: 'Toplam sipariş tutarı',
        sortingFn: (rowA, rowB) => {
          const amountA = BigInt(rowA.original.grossMinor);
          const amountB = BigInt(rowB.original.grossMinor);
          return amountA === amountB ? 0 : amountA > amountB ? 1 : -1;
        },
        cell: ({ row }) => {
          const amount = BigInt(row.original.grossMinor);
          const total = BigInt(grandTotalMinor);
          const share = total > 0n ? Number((amount * 1000n) / total) / 10 : 0;
          return (
            <div className={styles.branchAmountCell}>
              <strong>{formatTryMinor(row.original.grossMinor, 'TRY')}</strong>
              <span
                className={styles.branchAmountTrack}
                aria-label={`Toplamın yüzde ${share.toFixed(1)}’i`}
              >
                <i style={{ width: `${share}%` }} />
              </span>
            </div>
          );
        },
      },
    ],
    [grandTotalMinor],
  );
  // TanStack returns a stateful table instance that React Compiler intentionally skips memoizing.
  // eslint-disable-next-line react-hooks/incompatible-library
  const branchTable = useReactTable({
    data: branchRows,
    columns: branchColumns,
    state: { globalFilter: branchQuery, sorting: branchSorting, pagination: branchPagination },
    onGlobalFilterChange: setBranchQuery,
    onSortingChange: setBranchSorting,
    onPaginationChange: setBranchPagination,
    globalFilterFn: (row, _columnId, value) => {
      const query = String(value ?? '')
        .trim()
        .toLocaleLowerCase('tr-TR');
      return (
        !query ||
        `${row.original.name} ${row.original.code ?? ''}`.toLocaleLowerCase('tr-TR').includes(query)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className={`ops-page ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="dashboard-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>OPERASYON / KONTROL MERKEZİ</p>
          <h1 id="dashboard-title">Bugünün operasyonu</h1>
          <p className={styles.heroDescription}>
            {branchLabel} için sipariş akışı, mutfak yükü ve ticari özeti tek bakışta yönetin.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.scopeDot} aria-hidden="true" />
            <span>{branchLabel}</span>
            <span className={styles.metaDivider} aria-hidden="true" />
            <span>{dateLabel}</span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <ActionButton variant="ghost" onClick={() => router.push('/orders')}>
            Siparişleri aç
          </ActionButton>
          <ActionButton variant="primary" onClick={() => router.push('/kitchen')}>
            Mutfak kuyruğu
          </ActionButton>
        </div>
      </section>

      <section className={styles.kpiGrid} aria-label="Günün temel göstergeleri">
        <article className={`${styles.kpiCard} ${styles.kpiCardAccent}`}>
          <div className={styles.kpiTopline}>
            <span className={styles.kpiLabel}>Aktif sipariş</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIconAmber}`} aria-hidden="true">
              bolt
            </span>
          </div>
          <strong>{ordersState.status === 'loading' ? '—' : activeCount}</strong>
          <span className={styles.kpiHint}>Terminale ulaşmamış işler</span>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiTopline}>
            <span className={styles.kpiLabel}>Hazırlık kuyruğu</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIconFlame}`} aria-hidden="true">
              restaurant
            </span>
          </div>
          <strong>{ordersState.status === 'loading' ? '—' : prepCount}</strong>
          <span className={styles.kpiHint}>Şube ataması ve mutfak</span>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiTopline}>
            <span className={styles.kpiLabel}>Teslim edilen</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIconGreen}`} aria-hidden="true">
              task_alt
            </span>
          </div>
          <strong>{summary ? deliveredToday : '—'}</strong>
          <span className={styles.kpiHint}>Bugün tamamlanan sipariş</span>
        </article>
        <article className={`${styles.kpiCard} ${styles.kpiCardRevenue}`}>
          <div className={styles.kpiTopline}>
            <span className={styles.kpiLabel}>Net ciro</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIconBlue}`} aria-hidden="true">
              payments
            </span>
          </div>
          <strong>
            {ordersState.status === 'loading' ? '—' : netRevenueLabel(summary, fallbackNetLabel)}
          </strong>
          <span className={styles.kpiHint}>İadeler düşüldükten sonra</span>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiTopline}>
            <span className={styles.kpiLabel}>Ortalama sepet</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIconMuted}`} aria-hidden="true">
              equalizer
            </span>
          </div>
          <strong>{ordersState.status === 'loading' ? '—' : averageTicket}</strong>
          <span className={styles.kpiHint}>Bugünün tamamlanan sepetleri</span>
        </article>
      </section>

      <section
        className={`${styles.panel} ${styles.branchPanel}`}
        aria-labelledby="branch-report-title"
      >
        <header className={`${styles.panelHeader} ${styles.branchPanelHeader}`}>
          <div>
            <p className={styles.panelEyebrow}>ŞUBE KARŞILAŞTIRMASI</p>
            <h2 id="branch-report-title">Şube sipariş toplamları</h2>
            <p className={styles.branchReportDescription}>
              Sipariş oluşturulma gününe göre · tüm sipariş durumları · final sipariş tutarı
            </p>
          </div>
          <label className={styles.dateField}>
            <span>Tarih</span>
            <input
              type="date"
              value={reportDate}
              max={todayInIstanbul()}
              onChange={(event) => {
                setReportDate(event.target.value || reportDate);
                setBranchPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              aria-label="Şube sipariş raporu tarihi"
            />
          </label>
        </header>
        <div className={styles.branchSummary}>
          <div>
            <span className={styles.branchSummaryLabel}>Görünen şubeler</span>
            <strong>{branchReportState.status === 'ready' ? branchRows.length : '—'}</strong>
          </div>
          <div>
            <span className={styles.branchSummaryLabel}>Sipariş adedi</span>
            <strong>{branchReportState.status === 'ready' ? branchReportTotals.count : '—'}</strong>
          </div>
          <div className={styles.branchSummaryAmount}>
            <span className={styles.branchSummaryLabel}>Toplam sipariş tutarı</span>
            <strong>
              {branchReportState.status === 'ready' ? formatTryMinor(grandTotalMinor, 'TRY') : '—'}
            </strong>
          </div>
          <div className={styles.branchSummaryNote}>
            İptal ve iade durumları ayrıca ayıklanmaz; değerler sipariş kayıtlarının toplamıdır.
          </div>
        </div>
        <div className={styles.branchToolbar}>
          <label className={styles.branchSearch}>
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input
              type="search"
              value={branchQuery}
              onChange={(event) => {
                setBranchQuery(event.target.value);
                setBranchPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              placeholder="Şube adı veya koduyla ara"
              aria-label="Şube ara"
            />
          </label>
          <label className={styles.pageSizeField}>
            <span>Sayfa başına</span>
            <select
              value={branchPagination.pageSize}
              onChange={(event) =>
                setBranchPagination({ pageIndex: 0, pageSize: Number(event.target.value) })
              }
              aria-label="Sayfa başına şube sayısı"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
        {branchReportState.status === 'loading' ? (
          <OpsLoading
            title="Şube toplamları yükleniyor"
            description="Seçilen tarihin siparişleri hesaplanıyor…"
          />
        ) : branchReportState.status === 'error' ? (
          <OpsError
            title="Şube raporu alınamadı"
            description="Seçilen tarih için şube toplamları getirilemedi. Rapor iznini ve bağlantıyı kontrol edip yeniden deneyin."
            onRetry={() => void loadBranchTotals()}
          />
        ) : branchReportState.status === 'empty' ? (
          <div className={styles.branchEmpty}>Şube listesi boş.</div>
        ) : (
          <>
            <div className={styles.branchTableWrap}>
              <table
                className={styles.branchTable}
                aria-label="Tarihe göre şube sipariş toplamları"
              >
                <thead>
                  {branchTable.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          aria-sort={
                            header.column.getIsSorted() === 'asc'
                              ? 'ascending'
                              : header.column.getIsSorted() === 'desc'
                                ? 'descending'
                                : 'none'
                          }
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button type="button" onClick={header.column.getToggleSortingHandler()}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span aria-hidden="true">
                                {header.column.getIsSorted() === 'asc'
                                  ? '↑'
                                  : header.column.getIsSorted() === 'desc'
                                    ? '↓'
                                    : '↕'}
                              </span>
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {branchTable.getRowModel().rows.length ? (
                    branchTable.getRowModel().rows.map((row) => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} data-column={cell.column.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={branchColumns.length} className={styles.branchNoMatches}>
                        Aramanızla eşleşen şube bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className={styles.branchPagination}>
              <span>
                {branchTable.getFilteredRowModel().rows.length
                  ? `${branchPagination.pageIndex * branchPagination.pageSize + 1}–${Math.min(
                      (branchPagination.pageIndex + 1) * branchPagination.pageSize,
                      branchTable.getFilteredRowModel().rows.length,
                    )} / ${branchTable.getFilteredRowModel().rows.length} şube`
                  : '0 şube'}
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => branchTable.previousPage()}
                  disabled={!branchTable.getCanPreviousPage()}
                  aria-label="Önceki sayfa"
                >
                  ‹
                </button>
                <span>
                  {branchPagination.pageIndex + 1} / {Math.max(1, branchTable.getPageCount())}
                </span>
                <button
                  type="button"
                  onClick={() => branchTable.nextPage()}
                  disabled={!branchTable.getCanNextPage()}
                  aria-label="Sonraki sayfa"
                >
                  ›
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <div className={styles.dashboardGrid}>
        <section className={styles.panel} aria-labelledby="flow-title">
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>AKIŞ GÖRÜNÜMÜ</p>
              <h2 id="flow-title">Sipariş hattı</h2>
            </div>
            <span className={styles.panelMeta}>Şube bazlı</span>
          </header>
          <div className={styles.flowList}>
            {statusRows.map((item) => (
              <div className={styles.flowRow} key={item.status}>
                <div
                  className={`${styles.flowIcon} ${styles[`flowIcon--${item.tone}`]}`}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <div>
                  <div className={styles.flowTitleLine}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className={styles.flowTrack} aria-hidden="true">
                    <span style={{ width: `${Math.round((item.count / maxFlowCount) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <footer className={styles.panelFooter}>
            <span>Akış verisi sipariş özetinden hesaplanır.</span>
            <button
              type="button"
              className={styles.textAction}
              onClick={() => router.push('/orders')}
            >
              Tüm siparişler <span aria-hidden="true">↗</span>
            </button>
          </footer>
        </section>

        <aside className={styles.sideRail} aria-label="Operasyon uyarıları ve hızlı erişim">
          <section className={`${styles.panel} ${styles.pulsePanel}`} aria-labelledby="pulse-title">
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>OPERASYON PULSU</p>
                <h2 id="pulse-title">Dikkat gerektirenler</h2>
              </div>
              <span className={styles.pulseSignal} aria-hidden="true" />
            </header>
            <div className={styles.alertList}>
              <div className={styles.alertRow}>
                <span
                  className={`${styles.alertMarker} ${styles.alertMarkerAmber}`}
                  aria-hidden="true"
                />
                <div>
                  <strong>{prepCount} sipariş</strong>
                  <span>mutfak akışında bekliyor</span>
                </div>
                <button
                  type="button"
                  className={styles.iconAction}
                  onClick={() => router.push('/kitchen')}
                  aria-label="Mutfak kuyruğunu aç"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
              <div className={styles.alertRow}>
                <span
                  className={`${styles.alertMarker} ${styles.alertMarkerRed}`}
                  aria-hidden="true"
                />
                <div>
                  <strong>{cancellationRate}</strong>
                  <span>bugünün iptal oranı</span>
                </div>
                <button
                  type="button"
                  className={styles.iconAction}
                  onClick={() => router.push('/orders')}
                  aria-label="Siparişleri aç"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </section>
          <section className={styles.panel} aria-labelledby="shortcuts-title">
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>HIZLI ERİŞİM</p>
                <h2 id="shortcuts-title">Operasyon araçları</h2>
              </div>
            </header>
            <div className={styles.shortcutGrid}>
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className={styles.shortcut}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  receipt_long
                </span>
                <span>Sipariş merkezi</span>
                <span className={styles.shortcutArrow} aria-hidden="true">
                  ↗
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/kitchen')}
                className={styles.shortcut}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  soup_kitchen
                </span>
                <span>Mutfak KDS</span>
                <span className={styles.shortcutArrow} aria-hidden="true">
                  ↗
                </span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      <section className={`${styles.panel} ${styles.ordersPanel}`} aria-labelledby="orders-title">
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>SON HAREKETLER</p>
            <h2 id="orders-title">Son siparişler</h2>
          </div>
          <button
            type="button"
            className={styles.textAction}
            onClick={() => router.push('/orders')}
          >
            Sipariş merkezine git <span aria-hidden="true">↗</span>
          </button>
        </header>
        <OpsBoundary
          state={ordersState}
          emptyTitle="Henüz sipariş yok"
          emptyDescription="Bu şubede listelenecek bir sipariş bulunmuyor."
          onRetry={() => void load()}
        >
          {(rows) => (
            <div className={styles.tableFrame}>
              <OperationalTable<Order>
                ariaLabel="Son siparişler"
                rowKey={(row) => row.id}
                onRowClick={(row) => router.push(`/orders/${row.id}`)}
                columns={[
                  {
                    key: 'order',
                    header: 'Sipariş',
                    mono: true,
                    render: (row) => (
                      <span className={styles.orderCell}>
                        <strong>{row.displayNumber ?? shortId(row.id)}</strong>
                        <small>{shortId(row.id)}</small>
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Durum',
                    render: (row) => (
                      <StatusBadge tone={orderStatusTone(normalizeOrderStatus(row.status))}>
                        {orderStatusLabel(normalizeOrderStatus(row.status))}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: 'mode',
                    header: 'Kanal',
                    render: (row) => fulfillmentLabel(row.fulfillmentMode),
                  },
                  {
                    key: 'amount',
                    header: 'Tutar',
                    numeric: true,
                    render: (row) =>
                      row.finalPayableMinor
                        ? formatTryMinor(row.finalPayableMinor, row.currency ?? 'TRY')
                        : '—',
                  },
                  {
                    key: 'created',
                    header: 'Son güncelleme',
                    render: (row) => formatOpsDateTime(row.createdAt),
                  },
                ]}
                rows={rows.slice(0, 8)}
              />
            </div>
          )}
        </OpsBoundary>
      </section>

      <div className={styles.footerNote}>
        <span className="material-symbols-outlined" aria-hidden="true">
          info
        </span>
        <span>
          Veriler son başarılı yenilemede güncellendi. Otomatik canlı soket bağlantısı yoktur.
        </span>
      </div>
    </div>
  );
}
