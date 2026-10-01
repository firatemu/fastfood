'use client';

import { formatTryMinor } from '@fastfood/contracts';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { useOpsSync } from '../../components/ops/ops-sync';
import { createAdminClient } from '../../lib/api';
import { paymentStatusLabel } from '../../lib/finance-ops';
import { adminPaymentsSchema } from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './payments.module.css';

type Row = z.infer<typeof adminPaymentsSchema>['data'][number];
function money(minor?: string, currency = 'TRY') {
  if (minor == null) return '—';
  try {
    return formatTryMinor(minor, currency);
  } catch {
    return '—';
  }
}
function dateTime(value?: string | Date) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}
function methodLabel(row: Row): string {
  const method = row.paymentMethodCode ?? row.provider;
  const labels: Record<string, string> = {
    iyzico_hosted: 'Banka / kredi kartı',
    iyzico: 'Banka / kredi kartı',
    masterpass: 'Masterpass',
    card_on_delivery: 'Kapıda kredi kartı',
  };
  return method ? (labels[method] ?? 'Diğer yöntem') : 'Belirtilmedi';
}
function fulfillmentLabel(value?: string | null): string {
  return value === 'PICKUP' ? 'Gel-al' : value === 'DELIVERY' ? 'Teslimat' : '—';
}

export default function PaymentsPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Row[]>>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tümü');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [columnsOpen, setColumnsOpen] = useState(false);

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const response = await createAdminClient().request({
        path: 'admin/payments',
        schema: adminPaymentsSchema,
      });
      setState(
        response.data.length ? { status: 'ready', data: response.data } : { status: 'empty' },
      );
      markSynced();
    } catch (cause) {
      setState({ status: 'error', error: cause });
      markStale();
    }
  }, [markStale, markSynced]);
  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);
  useDeferredLoad(() => void load(), [load]);

  const rows = useMemo(
    () =>
      state.status !== 'ready'
        ? []
        : state.data.filter((row) => {
            if (status !== 'Tümü' && row.status !== status) return false;
            const q = query.trim().toLocaleLowerCase('tr-TR');
            return (
              !q ||
              [
                row.orderDisplayNumber,
                methodLabel(row),
                fulfillmentLabel(row.fulfillmentMode),
                paymentStatusLabel(row.status),
                dateTime(row.createdAt),
                money(row.amountMinor, row.currency),
              ].some((value) => value?.toLocaleLowerCase('tr-TR').includes(q))
            );
          }),
    [query, state, status],
  );
  const statuses = useMemo(
    () =>
      state.status === 'ready'
        ? [
            ...new Set(
              state.data.map((row) => row.status).filter((value): value is string => !!value),
            ),
          ]
        : [],
    [state],
  );
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'order',
        accessorFn: (row) => row.orderDisplayNumber ?? '',
        header: 'Sipariş',
        cell: ({ row }) => (
          <div className={styles.orderIdentity}>
            <span className={styles.paymentMark}>SP</span>
            <span>
              <strong>
                {row.original.orderDisplayNumber ??
                  (row.original.status === 'PAID' ? 'Sipariş eşleşmedi' : 'Sipariş oluşmadı')}
              </strong>
              <small>{fulfillmentLabel(row.original.fulfillmentMode)}</small>
            </span>
          </div>
        ),
      },
      {
        id: 'amount',
        accessorFn: (row) => (row.amountMinor ? BigInt(row.amountMinor) : 0n),
        header: 'Tutar',
        cell: ({ row }) => (
          <strong className={styles.amount}>
            {money(row.original.amountMinor, row.original.currency)}
          </strong>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Ödeme durumu',
        cell: ({ row }) => (
          <span
            className={`${styles.status} ${row.original.status === 'PAID' ? styles.paid : row.original.status === 'FAILED' ? styles.failed : styles.pending}`}
          >
            <i />
            {paymentStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: 'method',
        accessorFn: methodLabel,
        header: 'Ödeme yöntemi',
        cell: ({ row }) => <span className={styles.method}>{methodLabel(row.original)}</span>,
      },
      {
        id: 'created',
        accessorFn: (row) => row.createdAt ?? '',
        header: 'İşlem tarihi',
        cell: ({ row }) => <span className={styles.date}>{dateTime(row.original.createdAt)}</span>,
      },
    ],
    [],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination, columnVisibility: visibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            FİNANS <span>/</span> ÖDEMELER
          </div>
          <h1>Ödemeler</h1>
          <p>Sipariş bağlantısı, tahsilat tutarı ve işlem durumu tek tabloda.</p>
        </div>
        <button className={styles.refreshButton} onClick={() => void load()}>
          ↻ Yenile
        </button>
      </header>
      <section className={styles.panel} aria-label="Ödeme kayıtları">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>İŞLEM KAYITLARI</span>
            <h2>Son ödemeler</h2>
            <p>Sunucunun döndürdüğü son 50 kayıt · Arama ve sıralama bu kayıtlar içinde yapılır</p>
          </div>
          <div className={styles.tools}>
            <label className={styles.search}>
              <span aria-hidden>⌕</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder="Sipariş, tutar veya ödeme yöntemi ara"
                aria-label="Ödeme ara"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Aramayı temizle">
                  ×
                </button>
              )}
            </label>
            <div className={styles.columnMenu}>
              <button
                className={styles.toolButton}
                onClick={() => setColumnsOpen(!columnsOpen)}
                aria-expanded={columnsOpen}
              >
                Sütunlar ▾
              </button>
              {columnsOpen && (
                <div className={styles.columnMenuPanel}>
                  {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <label key={column.id}>
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                        />
                        {typeof column.columnDef.header === 'string'
                          ? column.columnDef.header
                          : column.id}
                      </label>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={styles.filters}>
          <span>Durum</span>
          <div className={styles.segmented}>
            {['Tümü', ...statuses].map((value) => (
              <button
                key={value}
                className={status === value ? styles.filterActive : styles.filterButton}
                onClick={() => {
                  setStatus(value);
                  table.setPageIndex(0);
                }}
              >
                {value === 'Tümü' ? value : paymentStatusLabel(value)}
              </button>
            ))}
          </div>
          <span className={styles.resultCount}>{rows.length} kayıt</span>
        </div>
        {state.status === 'loading' && (
          <div className={styles.statePanel}>Ödeme kayıtları yükleniyor…</div>
        )}
        {state.status === 'error' && (
          <div className={styles.statePanel}>
            <strong>Ödemeler yüklenemedi</strong>
            <span>{errorMessage(state.error)}</span>
            <button onClick={() => void load()}>Tekrar dene</button>
          </div>
        )}
        {state.status === 'empty' && (
          <div className={styles.statePanel}>
            <strong>Henüz ödeme kaydı yok</strong>
          </div>
        )}
        {state.status === 'ready' && (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table} aria-label="Ödemeler veri tablosu">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th key={header.id}>
                          <button
                            className={styles.sortButton}
                            disabled={!header.column.getCanSort()}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span>
                                {header.column.getIsSorted() === 'asc'
                                  ? '↑'
                                  : header.column.getIsSorted() === 'desc'
                                    ? '↓'
                                    : '↕'}
                              </span>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className={styles.statePanel}>Filtreye uygun ödeme bulunamadı.</div>
              )}
            </div>
            <footer className={styles.footer}>
              <span>
                Gösterilen {table.getRowModel().rows.length} / {rows.length} kayıt
              </span>
              <div>
                <label>
                  Sayfa başına{' '}
                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={(event) => table.setPageSize(Number(event.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <button
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  aria-label="Önceki sayfa"
                >
                  ‹
                </button>
                <span>
                  {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
                </span>
                <button
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  aria-label="Sonraki sayfa"
                >
                  ›
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
