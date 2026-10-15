'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useBranchContext } from '../../../components/ops/branch-context';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { useOpsToast } from '../../../components/ops/ops-toast';
import { createAdminClient } from '../../../lib/api';
import { filterAvailabilityRows, type AvailabilityFilter } from '../../../lib/fulfillment-ops';
import {
  productAvailabilityListSchema,
  productAvailabilityPatchSchema,
} from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './availability.module.css';

type Row = z.infer<typeof productAvailabilityListSchema>['data'][number];
type Editor = { row: Row; branchId: string };

const EMPTY_ROWS: Row[] = [];
const PAGE_SIZES = [10, 20, 50];

export default function ProductAvailabilityPage() {
  const branch = useBranchContext();
  const branchId = branch.branchId;
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();
  const [state, setState] = useState<LoadState<Row[]>>({ status: 'loading' });
  const [loadedBranchId, setLoadedBranchId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AvailabilityFilter>('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draftAvailable, setDraftAvailable] = useState(true);
  const [draftReason, setDraftReason] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const currentBranchId = useRef(branchId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentBranchId.current = branchId;
  }, [branchId]);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const response = await createAdminClient().request({
        path: `admin/branches/${branchId}/product-availability`,
        schema: productAvailabilityListSchema,
      });
      if (currentRequest !== requestId.current) return;
      setLoadedBranchId(branchId);
      setState(
        response.data.length ? { status: 'ready', data: response.data } : { status: 'empty' },
      );
      markSynced();
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setLoadedBranchId(branchId);
      setState({ status: 'error', error });
      markStale();
    }
  }, [branchId, markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);
  useDeferredLoad(() => void load(), [load]);

  const activeEditor = editor?.branchId === branchId ? editor : null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeEditor && !dialog.open) dialog.showModal();
    if (!activeEditor && dialog.open) dialog.close();
  }, [activeEditor]);

  const allRows = state.status === 'ready' && loadedBranchId === branchId ? state.data : EMPTY_ROWS;
  const visibleRows = useMemo(
    () => filterAvailabilityRows(allRows, { q: query, filter }),
    [allRows, filter, query],
  );
  const counts = useMemo(
    () => ({
      all: allRows.length,
      available: allRows.filter((row) => row.isAvailable).length,
      unavailable: allRows.filter((row) => !row.isAvailable).length,
      inactive: allRows.filter((row) => row.isActive === false).length,
    }),
    [allRows],
  );

  const openEditor = useCallback(
    (row: Row, trigger: HTMLButtonElement) => {
      triggerRef.current = trigger;
      setDraftAvailable(row.isAvailable);
      setDraftReason(row.isAvailable ? '' : (row.reason ?? ''));
      setEditor({ row, branchId });
    },
    [branchId],
  );

  function closeEditor() {
    if (busy) return;
    setEditor(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeEditor || busy) return;
    const reason = draftReason.trim();
    const unchanged =
      draftAvailable === activeEditor.row.isAvailable &&
      (draftAvailable || reason === (activeEditor.row.reason ?? '').trim());
    if (unchanged) return;
    if (reason.length > 255) {
      toast.error('Gerekçe en fazla 255 karakter olabilir.');
      return;
    }
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/branches/${activeEditor.branchId}/product-availability/${activeEditor.row.productId}`,
        body: { isAvailable: draftAvailable, ...(!draftAvailable && reason ? { reason } : {}) },
        schema: productAvailabilityPatchSchema,
      });
      setEditor(null);
      toast.success(
        draftAvailable
          ? `${activeEditor.row.name} bu şubede yeniden müsait.`
          : `${activeEditor.row.name} bu şubede durduruldu.`,
      );
      if (currentBranchId.current === activeEditor.branchId) await load();
    } catch (error) {
      toast.error(errorMessage(error));
      markStale();
    } finally {
      setBusy(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name.toLocaleLowerCase('tr-TR'),
        header: 'Ürün',
        cell: ({ row }) => <strong className={styles.productName}>{row.original.name}</strong>,
      },
      {
        id: 'global',
        accessorFn: (row) => (row.isActive === false ? 0 : 1),
        header: 'Genel katalog',
        cell: ({ row }) => (
          <span
            className={row.original.isActive === false ? styles.badgeMuted : styles.badgeNeutral}
          >
            {row.original.isActive === false ? 'Pasif' : 'Aktif'}
          </span>
        ),
      },
      {
        id: 'branch',
        accessorFn: (row) => (row.isAvailable ? 1 : 0),
        header: 'Şube durumu',
        cell: ({ row }) => (
          <span className={row.original.isAvailable ? styles.badgeReady : styles.badgePaused}>
            {row.original.isAvailable ? 'Müsait' : 'Durduruldu'}
          </span>
        ),
      },
      {
        id: 'reason',
        accessorFn: (row) => row.reason ?? '',
        header: 'Gerekçe',
        cell: ({ row }) => (
          <span className={styles.reason} title={row.original.reason ?? undefined}>
            {row.original.isAvailable ? '—' : row.original.reason?.trim() || 'Belirtilmedi'}
          </span>
        ),
      },
      {
        id: 'action',
        header: 'İşlem',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.rowAction}
            onClick={(event) => openEditor(row.original, event.currentTarget)}
            aria-label={`${row.original.name} şube müsaitliğini düzenle`}
          >
            Düzenle
          </button>
        ),
      },
    ],
    [openEditor],
  );
  const table = useReactTable({
    data: visibleRows,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const loadingForBranch = loadedBranchId !== branchId;
  const canShowTable = !loadingForBranch && state.status === 'ready';
  const branchName = branch.selected?.name ?? 'Seçili şube';
  const hasChanges =
    activeEditor !== null &&
    (draftAvailable !== activeEditor.row.isAvailable ||
      (!draftAvailable && draftReason.trim() !== (activeEditor.row.reason ?? '').trim()));

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.breadcrumb}>Şubeler / Ürün müsaitliği</p>
          <h1>Ürün müsaitliği</h1>
          <p>Ürünlerin şubedeki satış durumunu yönetin.</p>
        </div>
        <div className={styles.branchContext}>
          <span>Seçili şube</span>
          <strong>{branchName}</strong>
        </div>
      </header>

      <div className={styles.scopeNote}>
        <span className={styles.scopeIcon} aria-hidden="true">
          i
        </span>
        Genel katalogda pasif olan ürünler, şubede müsait görünse de müşterilere sunulmaz.
      </div>

      <section className={styles.panel} aria-label="Şube ürün müsaitliği">
        <div className={styles.panelHead}>
          <div>
            <h2>Ürün listesi</h2>
            <p>
              {counts.all} katalog ürünü · {branchName}
            </p>
          </div>
          <label className={styles.search}>
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                table.setPageIndex(0);
              }}
              placeholder="Ürün adı ara"
              aria-label="Ürün ara"
            />
          </label>
        </div>

        <div className={styles.filters} role="group" aria-label="Müsaitlik filtresi">
          {(
            [
              ['', 'Tümü', counts.all],
              ['available', 'Şubede müsait', counts.available],
              ['unavailable', 'Şubede durdurulan', counts.unavailable],
              ['globally-inactive', 'Genel pasif', counts.inactive],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? styles.filterActive : styles.filter}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                table.setPageIndex(0);
              }}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>

        {loadingForBranch || state.status === 'loading' ? (
          <div className={styles.statePanel}>Ürün müsaitliği yükleniyor…</div>
        ) : state.status === 'error' ? (
          <div className={styles.statePanel}>
            <strong>Ürün müsaitliği açılamadı</strong>
            <span>{errorMessage(state.error)}</span>
            <button type="button" onClick={() => void load()}>
              Tekrar dene
            </button>
          </div>
        ) : state.status === 'empty' ? (
          <div className={styles.statePanel}>Katalogda henüz ürün bulunmuyor.</div>
        ) : canShowTable && visibleRows.length === 0 ? (
          <div className={styles.statePanel}>Bu arama veya filtreyle eşleşen ürün yok.</div>
        ) : canShowTable ? (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table} aria-label="Şube ürün müsaitliği">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th key={header.id} scope="col">
                          {header.column.getCanSort() ? (
                            <button type="button" onClick={header.column.getToggleSortingHandler()}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span aria-hidden="true">
                                {header.column.getIsSorted() === 'asc'
                                  ? ' ↑'
                                  : header.column.getIsSorted() === 'desc'
                                    ? ' ↓'
                                    : ' ↕'}
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
            </div>
            <div className={styles.tableFooter}>
              <span>{visibleRows.length} ürün bulundu</span>
              <div className={styles.pageControls}>
                <label>
                  Sayfa başına
                  <select
                    value={pagination.pageSize}
                    onChange={(event) => table.setPageSize(Number(event.target.value))}
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Önceki sayfa"
                >
                  ‹
                </button>
                <span>
                  {pagination.pageIndex + 1} / {table.getPageCount() || 1}
                </span>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Sonraki sayfa"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setEditor(null);
        }}
        onClose={() => {
          setEditor(null);
          triggerRef.current?.focus();
        }}
        aria-labelledby="availability-dialog-title"
      >
        {activeEditor && (
          <form onSubmit={(event) => void saveAvailability(event)}>
            <div className={styles.dialogHead}>
              <div>
                <span>Şube ürün ayarı</span>
                <h2 id="availability-dialog-title">{activeEditor.row.name}</h2>
                <p>{branchName}</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeEditor}
                disabled={busy}
                aria-label="Pencereyi kapat"
              >
                ×
              </button>
            </div>
            <div className={styles.dialogBody}>
              {activeEditor.row.isActive === false && (
                <div className={styles.inactiveNote}>
                  Bu ürün genel katalogda pasif. Şube ayarını açsanız bile müşterilere sunulmaz.
                </div>
              )}
              <fieldset className={styles.choiceGroup}>
                <legend>Bu şubedeki durum</legend>
                <label className={draftAvailable ? styles.choiceSelected : styles.choice}>
                  <input
                    type="radio"
                    name="availability"
                    checked={draftAvailable}
                    onChange={() => {
                      setDraftAvailable(true);
                      setDraftReason('');
                    }}
                  />
                  <span>
                    <strong>Müsait</strong>
                    <small>Ürün bu şubede satışa açık.</small>
                  </span>
                </label>
                <label className={!draftAvailable ? styles.choiceSelected : styles.choice}>
                  <input
                    type="radio"
                    name="availability"
                    checked={!draftAvailable}
                    onChange={() => setDraftAvailable(false)}
                  />
                  <span>
                    <strong>Durduruldu</strong>
                    <small>Ürün bu şubede müşteriye sunulmaz.</small>
                  </span>
                </label>
              </fieldset>
              {!draftAvailable && (
                <label className={styles.reasonField}>
                  <span>
                    Gerekçe <small>İsteğe bağlı</small>
                  </span>
                  <textarea
                    value={draftReason}
                    onChange={(event) => setDraftReason(event.target.value)}
                    maxLength={255}
                    rows={3}
                    placeholder="Örn. Malzeme geçici olarak tükendi"
                  />
                  <small>{draftReason.length} / 255</small>
                </label>
              )}
            </div>
            <div className={styles.dialogFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeEditor}
                disabled={busy}
              >
                Vazgeç
              </button>
              <button type="submit" className={styles.saveButton} disabled={busy || !hasChanges}>
                {busy ? 'Kaydediliyor…' : 'Değişikliği kaydet'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </main>
  );
}
