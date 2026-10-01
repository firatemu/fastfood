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
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { createAdminClient } from '../../lib/api';
import { keepTabInsideDialog } from '../../lib/dialog-focus';
import { PROMOTION_KINDS, percentToBps, promotionKindLabel } from '../../lib/finance-ops';
import {
  adminBranchesSchema,
  adminPromotionSchema,
  adminPromotionsSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';
import styles from './promotions.module.css';

type Promo = z.infer<typeof adminPromotionsSchema>['data'][number];
type Branch = z.infer<typeof adminBranchesSchema>['data'][number];
type Kind = (typeof PROMOTION_KINDS)[number]['value'];
type Dialog = { kind: 'create' } | { kind: 'detail'; promo: Promo } | null;
type Draft = {
  name: string;
  code: string;
  kind: Kind;
  amount: string;
  percent: string;
  minimum: string;
  from: string;
  to: string;
  total: string;
  perCustomer: string;
  firstOrderOnly: boolean;
  combinable: boolean;
  branchIds: string[];
};
const emptyPromos: Promo[] = [];
const emptyBranches: Branch[] = [];
const draftInitial = (): Draft => ({
  name: '',
  code: '',
  kind: 'FIXED_CART_MINOR',
  amount: '',
  percent: '',
  minimum: '',
  from: '',
  to: '',
  total: '',
  perCustomer: '',
  firstOrderOnly: false,
  combinable: false,
  branchIds: [],
});

function toMinor(value: string): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return (BigInt(whole ?? '0') * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
}
function money(value: string | null | undefined): string {
  if (value == null) return '—';
  try {
    return formatTryMinor(BigInt(value));
  } catch {
    return '—';
  }
}
function discount(p: Promo): string {
  if (p.kind === 'FIXED_CART_MINOR') return money(p.discountMinor);
  if (p.kind === 'PERCENT_CART')
    return p.discountPercentBps == null
      ? '—'
      : `%${(p.discountPercentBps / 100).toLocaleString('tr-TR')}`;
  return 'Teslimat ücreti';
}
function dateLabel(value: string | null | undefined): string {
  if (!value) return 'Süresiz';
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
function positiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}
function periodOf(p: Promo): 'Geçerli' | 'Planlandı' | 'Süresi doldu' {
  const now = Date.now();
  if (p.validFrom && Date.parse(p.validFrom) > now) return 'Planlandı';
  if (p.validTo && Date.parse(p.validTo) < now) return 'Süresi doldu';
  return 'Geçerli';
}

export default function PromotionsPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Promo[]>>({ status: 'loading' });
  const [branches, setBranches] = useState<LoadState<Branch[]>>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tümü');
  const [kindFilter, setKindFilter] = useState('Tümü');
  const [periodFilter, setPeriodFilter] = useState('Tümü');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draft, setDraft] = useState<Draft>(draftInitial);
  const [detail, setDetail] = useState<Promo | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const confirmRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const detailRequest = useRef(0);

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const result = await createAdminClient().request({
        path: 'admin/promotions',
        schema: adminPromotionsSchema,
      });
      setState(result.data.length ? { status: 'ready', data: result.data } : { status: 'empty' });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced]);
  const loadBranches = useCallback(async () => {
    try {
      const result = await createAdminClient().request({
        path: 'admin/branches',
        schema: adminBranchesSchema,
      });
      setBranches(
        result.data.length ? { status: 'ready', data: result.data } : { status: 'empty' },
      );
    } catch (error) {
      setBranches({ status: 'error', error });
    }
  }, []);
  useEffect(() => {
    registerRefresh(() => {
      void load();
      void loadBranches();
    });
    return () => registerRefresh(null);
  }, [load, loadBranches, registerRefresh]);
  useDeferredLoad(() => {
    void load();
    void loadBranches();
  }, [load, loadBranches]);
  useEffect(() => {
    if (!columnsOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target))
        setColumnsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnsOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [columnsOpen]);
  useEffect(() => {
    if (!dialog) return;
    dialogRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (!confirmOff) keepTabInsideDialog(event, dialogRef.current);
      if (event.key === 'Escape' && !busy && !confirmOff) {
        detailRequest.current += 1;
        setDialog(null);
        setFormError(null);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [dialog, busy, confirmOff]);
  useEffect(() => {
    if (!confirmOff) return;
    confirmRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      keepTabInsideDialog(event, confirmRef.current);
      if (event.key === 'Escape' && !busy) setConfirmOff(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [confirmOff, busy]);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [dialog]);

  const promos = state.status === 'ready' ? state.data : emptyPromos;
  const branchRows = branches.status === 'ready' ? branches.data : emptyBranches;
  const branchNames = useMemo(
    () => new Map(branchRows.map((branch) => [branch.id, branch.name])),
    [branchRows],
  );
  const filtered = useMemo(
    () =>
      promos.filter((p) => {
        if (status === 'Aktif' && p.isActive === false) return false;
        if (status === 'Pasif' && p.isActive !== false) return false;
        if (kindFilter !== 'Tümü' && p.kind !== kindFilter) return false;
        if (periodFilter !== 'Tümü' && periodOf(p) !== periodFilter) return false;
        const needle = query.trim().toLocaleLowerCase('tr-TR');
        return (
          !needle ||
          [p.name ?? '', p.code ?? ''].some((value) =>
            value.toLocaleLowerCase('tr-TR').includes(needle),
          )
        );
      }),
    [promos, query, status, kindFilter, periodFilter],
  );

  function rememberTrigger() {
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
  }
  function openCreate() {
    rememberTrigger();
    setDraft(draftInitial());
    setFormError(null);
    setDialog({ kind: 'create' });
  }
  const openDetail = useCallback(async (promo: Promo) => {
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
    const request = ++detailRequest.current;
    setDetail(promo);
    setDetailError(null);
    setFormError(null);
    setDialog({ kind: 'detail', promo });
    try {
      const result = await createAdminClient().request({
        path: `admin/promotions/${promo.id}`,
        schema: adminPromotionSchema,
      });
      if (request === detailRequest.current) setDetail(result.data);
    } catch (error) {
      if (request === detailRequest.current) setDetailError(errorMessage(error));
    }
  }, []);
  function closeDialog() {
    if (busy) return;
    detailRequest.current += 1;
    setDialog(null);
    setConfirmOff(false);
    setFormError(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }
  function createBody(): Record<string, unknown> | string {
    const name = draft.name.trim();
    if (!name || name.length > 128) return 'Promosyon adı 1–128 karakter olmalı.';
    const code = draft.code.trim().toUpperCase();
    if (code.length > 64) return 'Kod en fazla 64 karakter olabilir.';
    const body: Record<string, unknown> = {
      name,
      kind: draft.kind,
      firstOrderOnly: draft.firstOrderOnly,
      combinable: draft.combinable,
    };
    if (code) body.code = code;
    if (draft.kind === 'FIXED_CART_MINOR') {
      const amount = toMinor(draft.amount);
      if (!amount || BigInt(amount) <= 0n) return 'Pozitif bir indirim tutarı girin.';
      body.discountMinor = amount;
    }
    if (draft.kind === 'PERCENT_CART') {
      const bps = percentToBps(draft.percent);
      if (bps === null || bps <= 0) return 'İndirim yüzdesi 0 ile 100 arasında olmalı.';
      body.discountPercentBps = bps;
    }
    if (draft.minimum.trim()) {
      const minimum = toMinor(draft.minimum);
      if (minimum === null) return 'Asgari sepet tutarını ₺ biçiminde girin.';
      body.minMerchandiseMinor = minimum;
    }
    if (draft.from && draft.to && draft.to <= draft.from)
      return 'Bitiş tarihi başlangıçtan sonra olmalı.';
    if (draft.from) body.validFrom = new Date(draft.from).toISOString();
    if (draft.to) body.validTo = new Date(draft.to).toISOString();
    if (draft.total.trim()) {
      const limit = positiveInteger(draft.total);
      if (limit === null) return 'Toplam kullanım sınırı pozitif tam sayı olmalı.';
      body.usageLimitTotal = limit;
    }
    if (draft.perCustomer.trim()) {
      const limit = positiveInteger(draft.perCustomer);
      if (limit === null) return 'Müşteri başına sınır pozitif tam sayı olmalı.';
      body.usageLimitPerCustomer = limit;
    }
    if (draft.branchIds.length) body.branchIds = draft.branchIds;
    return body;
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = createBody();
    if (typeof body === 'string') {
      setFormError(body);
      return;
    }
    setBusy(true);
    setFormError(null);
    setFlash(null);
    try {
      const result = await createAdminClient().request({
        method: 'POST',
        path: 'admin/promotions',
        body,
        schema: adminPromotionSchema,
      });
      setFlash(`“${result.data.name ?? draft.name}” oluşturuldu.`);
      setDialog(null);
      setDraft(draftInitial());
      window.requestAnimationFrame(() => triggerRef.current?.focus());
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function changeActive(promo: Promo, isActive: boolean) {
    setBusy(true);
    setFormError(null);
    setFlash(null);
    try {
      const result = await createAdminClient().request({
        method: 'PATCH',
        path: `admin/promotions/${promo.id}`,
        body: { isActive },
        schema: adminPromotionSchema,
      });
      setDetail(result.data);
      setConfirmOff(false);
      setFlash(
        `“${promo.name ?? promo.code ?? 'Promosyon'}” ${isActive ? 'etkinleştirildi' : 'pasifleştirildi'}.`,
      );
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
      setConfirmOff(false);
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo<ColumnDef<Promo>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (p) => p.name ?? '',
        header: 'Promosyon',
        cell: ({ row }) => (
          <button
            className={styles.nameButton}
            type="button"
            onClick={() => void openDetail(row.original)}
          >
            <span className={styles.nameMark}>
              <OpsIcon name="local_offer" />
            </span>
            <span>
              <strong>{row.original.name ?? 'Adsız promosyon'}</strong>
              <small>{row.original.code ?? 'Kod tanımlı değil'}</small>
            </span>
          </button>
        ),
      },
      {
        id: 'kind',
        accessorFn: (p) => p.kind ?? '',
        header: 'İndirim türü',
        cell: ({ row }) => promotionKindLabel(row.original.kind),
      },
      {
        id: 'discount',
        accessorFn: (p) =>
          p.kind === 'PERCENT_CART' ? (p.discountPercentBps ?? 0) : Number(p.discountMinor ?? '0'),
        header: 'Değer',
        cell: ({ row }) => <strong className={styles.value}>{discount(row.original)}</strong>,
      },
      {
        id: 'period',
        accessorFn: (p) => p.validTo ?? '',
        header: 'Bitiş',
        cell: ({ row }) => (
          <span className={styles.periodCell}>{dateLabel(row.original.validTo)}</span>
        ),
      },
      {
        id: 'scope',
        accessorFn: (p) => p.branchIds?.length ?? 0,
        header: 'Kapsam',
        cell: ({ row }) =>
          row.original.branchIds?.length ? `${row.original.branchIds.length} şube` : 'Tüm şubeler',
      },
      {
        id: 'active',
        accessorFn: (p) => (p.isActive === false ? 0 : 1),
        header: 'Durum',
        cell: ({ row }) => (
          <span className={row.original.isActive === false ? styles.inactive : styles.active}>
            <i />
            {row.original.isActive === false ? 'Pasif' : 'Aktif'}
          </span>
        ),
      },
      {
        id: 'action',
        header: 'İşlem',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button
            className={styles.rowAction}
            type="button"
            onClick={() => void openDetail(row.original)}
          >
            İncele <OpsIcon name="arrow_outward" />
          </button>
        ),
      },
    ],
    [openDetail],
  );
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination, columnVisibility: visibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const current = dialog?.kind === 'detail' ? (detail ?? dialog.promo) : null;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            PAZARLAMA <span>/</span> PROMOSYONLAR
          </div>
          <h1>Promosyonlar</h1>
          <p>İndirimleri, kullanım koşullarını ve şube kapsamını yönetin.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          <OpsIcon name="add" /> Yeni promosyon
        </button>
      </header>
      {flash && (
        <div className={styles.flash} role="status">
          <OpsIcon name="check_circle" />
          {flash}
          <button type="button" onClick={() => setFlash(null)} aria-label="Bildirimi kapat">
            ×
          </button>
        </div>
      )}
      <section className={styles.gridPanel} aria-label="Promosyon dizini">
        <div className={styles.gridHeader}>
          <div>
            <span className={styles.eyebrow}>KAMPANYA KATALOĞU</span>
            <h2>Tanımlı promosyonlar</h2>
            <p>
              {state.status === 'ready'
                ? `${promos.length} promosyon listeleniyor`
                : 'Güncel promosyon kayıtları'}
            </p>
          </div>
          <div className={styles.gridTools}>
            <label className={styles.search}>
              <OpsIcon name="search" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder="Ad veya kod ara"
                aria-label="Promosyon ara"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    table.setPageIndex(0);
                  }}
                  aria-label="Aramayı temizle"
                >
                  ×
                </button>
              )}
            </label>
            <div className={styles.columnMenu} ref={menuRef}>
              <button
                className={styles.toolButton}
                type="button"
                aria-expanded={columnsOpen}
                onClick={() => setColumnsOpen((open) => !open)}
              >
                <OpsIcon name="view_column" /> Sütunlar
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
                        {String(column.columnDef.header)}
                      </label>
                    ))}
                </div>
              )}
            </div>
            <button
              className={styles.toolButton}
              type="button"
              onClick={() => void load()}
              aria-label="Promosyonları yenile"
            >
              <OpsIcon name="refresh" />
            </button>
          </div>
        </div>
        <div className={styles.filters}>
          <div className={styles.segmented} aria-label="Durum filtresi">
            {['Tümü', 'Aktif', 'Pasif'].map((value) => (
              <button
                key={value}
                type="button"
                className={status === value ? styles.filterActive : styles.filterButton}
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value);
                  table.setPageIndex(0);
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <span className={styles.filterDivider} />
          <label className={styles.selectLabel}>
            Tür{' '}
            <select
              value={kindFilter}
              onChange={(event) => {
                setKindFilter(event.target.value);
                table.setPageIndex(0);
              }}
            >
              <option value="Tümü">Tümü</option>
              {PROMOTION_KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.selectLabel}>
            Dönem{' '}
            <select
              value={periodFilter}
              onChange={(event) => {
                setPeriodFilter(event.target.value);
                table.setPageIndex(0);
              }}
            >
              <option value="Tümü">Tümü</option>
              <option>Geçerli</option>
              <option>Planlandı</option>
              <option>Süresi doldu</option>
            </select>
          </label>
        </div>
        {state.status === 'loading' ? (
          <div className={styles.statePanel} role="status">
            <OpsIcon name="progress_activity" />
            <strong>Promosyonlar yükleniyor</strong>
          </div>
        ) : state.status === 'error' ? (
          <div className={styles.statePanel} role="alert">
            <OpsIcon name="error" />
            <strong>Promosyonlar alınamadı</strong>
            <span>{errorMessage(state.error)}</span>
            <button type="button" onClick={() => void load()}>
              Tekrar dene
            </button>
          </div>
        ) : state.status === 'empty' ? (
          <div className={styles.statePanel}>
            <OpsIcon name="local_offer" />
            <strong>Henüz promosyon yok</strong>
            <span>Yeni bir promosyon oluşturarak başlayın.</span>
          </div>
        ) : !filtered.length ? (
          <div className={styles.statePanel}>
            <OpsIcon name="filter_alt_off" />
            <strong>Sonuç bulunamadı</strong>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatus('Tümü');
                setKindFilter('Tümü');
                setPeriodFilter('Tümü');
              }}
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table} aria-label="Promosyonlar veri tablosu">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id} scope="col">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className={styles.sortButton}
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span>
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
        )}
        <div className={styles.gridFooter}>
          <span>
            {filtered.length} sonuç ·{' '}
            {filtered.length ? pagination.pageIndex * pagination.pageSize + 1 : 0}–
            {Math.min(filtered.length, (pagination.pageIndex + 1) * pagination.pageSize)}{' '}
            gösteriliyor
          </span>
          <div>
            <label>
              Sayfa başına{' '}
              <select
                value={pagination.pageSize}
                onChange={(event) => table.setPageSize(Number(event.target.value))}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label="Önceki sayfa"
            >
              ‹
            </button>
            <span>
              {table.getPageCount() ? pagination.pageIndex + 1 : 0} / {table.getPageCount()}
            </span>
            <button
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label="Sonraki sayfa"
            >
              ›
            </button>
          </div>
        </div>
      </section>
      {dialog && (
        <div
          className={styles.overlay}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-dialog-title"
            tabIndex={-1}
            ref={dialogRef}
          >
            <div className={styles.dialogHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {dialog.kind === 'create' ? 'YENİ KAYIT' : 'PROMOSYON AYRINTISI'}
                </span>
                <h2 id="promotion-dialog-title">
                  {dialog.kind === 'create' ? 'Promosyon oluştur' : (current?.name ?? 'Promosyon')}
                </h2>
                <p>
                  {dialog.kind === 'create'
                    ? 'İndirim ve uygunluk koşullarını tanımlayın.'
                    : 'Kayıtlı koşulları ve geçerlilik bilgilerini inceleyin.'}
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={closeDialog}
                aria-label="Pencereyi kapat"
              >
                <OpsIcon name="close" />
              </button>
            </div>
            {dialog.kind === 'create' ? (
              <form onSubmit={(event) => void create(event)}>
                <div className={styles.dialogBody}>
                  <div className={styles.sectionTitle}>
                    <span>01</span>
                    <div>
                      <strong>Temel bilgiler</strong>
                      <small>Promosyon adı, kodu ve indirim biçimi</small>
                    </div>
                  </div>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      Promosyon adı <em>*</em>
                      <input
                        required
                        maxLength={128}
                        value={draft.name}
                        onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
                        placeholder="Örn. Hafta sonu indirimi"
                      />
                    </label>
                    <label className={styles.field}>
                      Kod <small>İsteğe bağlı</small>
                      <input
                        maxLength={64}
                        value={draft.code}
                        onChange={(event) => setDraft((d) => ({ ...d, code: event.target.value }))}
                        placeholder="Örn. HAFTASONU"
                      />
                    </label>
                    <label className={styles.field}>
                      İndirim türü
                      <select
                        value={draft.kind}
                        onChange={(event) =>
                          setDraft((d) => ({ ...d, kind: event.target.value as Kind }))
                        }
                      >
                        {PROMOTION_KINDS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {draft.kind === 'FIXED_CART_MINOR' && (
                      <label className={styles.field}>
                        İndirim tutarı <small>₺</small>
                        <input
                          value={draft.amount}
                          onChange={(event) =>
                            setDraft((d) => ({ ...d, amount: event.target.value }))
                          }
                          inputMode="decimal"
                          placeholder="25,00"
                        />
                      </label>
                    )}
                    {draft.kind === 'PERCENT_CART' && (
                      <label className={styles.field}>
                        İndirim oranı <small>%</small>
                        <input
                          value={draft.percent}
                          onChange={(event) =>
                            setDraft((d) => ({ ...d, percent: event.target.value }))
                          }
                          inputMode="decimal"
                          placeholder="10"
                        />
                      </label>
                    )}
                  </div>
                  <div className={styles.sectionTitle}>
                    <span>02</span>
                    <div>
                      <strong>Uygulama koşulları</strong>
                      <small>Sepet, tarih ve kullanım sınırları</small>
                    </div>
                  </div>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      Asgari sepet <small>₺ · isteğe bağlı</small>
                      <input
                        value={draft.minimum}
                        onChange={(event) =>
                          setDraft((d) => ({ ...d, minimum: event.target.value }))
                        }
                        inputMode="decimal"
                        placeholder="150,00"
                      />
                    </label>
                    <div />
                    <label className={styles.field}>
                      Başlangıç tarihi
                      <input
                        type="datetime-local"
                        value={draft.from}
                        onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value }))}
                      />
                    </label>
                    <label className={styles.field}>
                      Bitiş tarihi
                      <input
                        type="datetime-local"
                        value={draft.to}
                        onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value }))}
                      />
                    </label>
                    <label className={styles.field}>
                      Toplam kullanım sınırı
                      <input
                        value={draft.total}
                        onChange={(event) => setDraft((d) => ({ ...d, total: event.target.value }))}
                        inputMode="numeric"
                        placeholder="Sınırsız"
                      />
                    </label>
                    <label className={styles.field}>
                      Müşteri başına sınır
                      <input
                        value={draft.perCustomer}
                        onChange={(event) =>
                          setDraft((d) => ({ ...d, perCustomer: event.target.value }))
                        }
                        inputMode="numeric"
                        placeholder="Sınırsız"
                      />
                    </label>
                  </div>
                  <div className={styles.checkGrid}>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.firstOrderOnly}
                        onChange={(event) =>
                          setDraft((d) => ({ ...d, firstOrderOnly: event.target.checked }))
                        }
                      />
                      <span>
                        <strong>Yalnızca ilk sipariş</strong>
                        <small>İlk sipariş koşulu uygulanır</small>
                      </span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.combinable}
                        onChange={(event) =>
                          setDraft((d) => ({ ...d, combinable: event.target.checked }))
                        }
                      />
                      <span>
                        <strong>Birleştirilebilir</strong>
                        <small>Diğer indirimlerle birlikte kullanılabilir</small>
                      </span>
                    </label>
                  </div>
                  <div className={styles.sectionTitle}>
                    <span>03</span>
                    <div>
                      <strong>Şube kapsamı</strong>
                      <small>Seçim yapılmazsa tüm şubelerde geçerli</small>
                    </div>
                  </div>
                  {branches.status === 'ready' ? (
                    <div className={styles.branchGrid}>
                      {branchRows.map((branch) => (
                        <label key={branch.id} className={styles.branchChoice}>
                          <input
                            type="checkbox"
                            checked={draft.branchIds.includes(branch.id)}
                            onChange={(event) =>
                              setDraft((d) => ({
                                ...d,
                                branchIds: event.target.checked
                                  ? [...d.branchIds, branch.id]
                                  : d.branchIds.filter((id) => id !== branch.id),
                              }))
                            }
                          />
                          <span>
                            <strong>{branch.name}</strong>
                            <small>{branch.code ?? 'Şube'}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.note}>
                      {branches.status === 'error'
                        ? `Şubeler alınamadı: ${errorMessage(branches.error)}. Kapsam seçilmezse tüm şubeler geçerli olur.`
                        : branches.status === 'empty'
                          ? 'Şube kaydı bulunamadı.'
                          : 'Şubeler yükleniyor…'}
                    </p>
                  )}
                  <p className={styles.note}>
                    <OpsIcon name="info" /> Koşullar mevcut API ile sonradan düzenlenemez; yalnızca
                    aktiflik değiştirilebilir. Yeni promosyon müşteri vitrininde otomatik
                    listelenmez.
                  </p>
                  {formError && (
                    <p className={styles.formError} role="alert">
                      {formError}
                    </p>
                  )}
                </div>
                <div className={styles.dialogFooter}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={closeDialog}
                    disabled={busy}
                  >
                    Vazgeç
                  </button>
                  <button className={styles.primaryButton} type="submit" disabled={busy}>
                    {busy ? 'Kaydediliyor…' : 'Promosyon oluştur'}
                  </button>
                </div>
              </form>
            ) : (
              current && (
                <>
                  <div className={styles.dialogBody}>
                    {detailError && (
                      <p className={styles.formError} role="alert">
                        Ayrıntı yenilenemedi: {detailError}
                      </p>
                    )}
                    <div className={styles.detailLead}>
                      <div>
                        <span className={styles.eyebrow}>İNDİRİM</span>
                        <strong>{discount(current)}</strong>
                        <small>{promotionKindLabel(current.kind)}</small>
                      </div>
                      <span
                        className={current.isActive === false ? styles.inactive : styles.active}
                      >
                        <i />
                        {current.isActive === false ? 'Pasif' : 'Aktif'}
                      </span>
                    </div>
                    <div className={styles.detailGrid}>
                      <div>
                        <span>Kod</span>
                        <strong className={styles.mono}>{current.code ?? 'Tanımlı değil'}</strong>
                      </div>
                      <div>
                        <span>Asgari sepet</span>
                        <strong>{money(current.minMerchandiseMinor)}</strong>
                      </div>
                      <div>
                        <span>Başlangıç</span>
                        <strong>{dateLabel(current.validFrom)}</strong>
                      </div>
                      <div>
                        <span>Bitiş</span>
                        <strong>{dateLabel(current.validTo)}</strong>
                      </div>
                      <div>
                        <span>Toplam kullanım sınırı</span>
                        <strong>{current.usageLimitTotal ?? 'Sınırsız'}</strong>
                      </div>
                      <div>
                        <span>Müşteri başına sınır</span>
                        <strong>{current.usageLimitPerCustomer ?? 'Sınırsız'}</strong>
                      </div>
                      <div>
                        <span>İlk sipariş</span>
                        <strong>{current.firstOrderOnly ? 'Evet' : 'Hayır'}</strong>
                      </div>
                      <div>
                        <span>Birleştirilebilir</span>
                        <strong>{current.combinable ? 'Evet' : 'Hayır'}</strong>
                      </div>
                      <div>
                        <span>Müşteri vitrininde</span>
                        <strong>{current.listedOnStorefront ? 'Listeli' : 'Listelenmiyor'}</strong>
                      </div>
                      <div>
                        <span>Geçerlilik dönemi</span>
                        <strong>{periodOf(current)}</strong>
                      </div>
                    </div>
                    <div className={styles.sectionTitle}>
                      <span>↗</span>
                      <div>
                        <strong>Şube kapsamı</strong>
                        <small>
                          {current.branchIds?.length
                            ? `${current.branchIds.length} şubeyle sınırlı`
                            : 'Tüm şubelerde geçerli'}
                        </small>
                      </div>
                    </div>
                    {current.branchIds?.length ? (
                      <div className={styles.branchTags}>
                        {current.branchIds.map((id) => (
                          <span key={id}>{branchNames.get(id) ?? id}</span>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.note}>Şube kısıtı tanımlanmamış.</p>
                    )}
                    <p className={styles.note}>
                      <OpsIcon name="info" /> Uygunluk ve indirim tutarı sipariş sırasında sunucu
                      tarafından hesaplanır.
                    </p>
                    {formError && (
                      <p className={styles.formError} role="alert">
                        {formError}
                      </p>
                    )}
                  </div>
                  <div className={styles.dialogFooter}>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={closeDialog}
                      disabled={busy}
                    >
                      Kapat
                    </button>
                    {current.isActive === false ? (
                      <button
                        className={styles.primaryButton}
                        type="button"
                        disabled={busy}
                        onClick={() => void changeActive(current, true)}
                      >
                        {busy ? 'İşleniyor…' : 'Etkinleştir'}
                      </button>
                    ) : (
                      <button
                        className={styles.dangerButton}
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmOff(true)}
                      >
                        Pasifleştir
                      </button>
                    )}
                  </div>
                </>
              )
            )}
          </section>
        </div>
      )}
      {confirmOff && current && (
        <div className={styles.confirmOverlay}>
          <section
            className={styles.confirm}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="promotion-confirm-title"
            aria-describedby="promotion-confirm-body"
            tabIndex={-1}
            ref={confirmRef}
          >
            <span className={styles.dangerIcon}>
              <OpsIcon name="warning" />
            </span>
            <h2 id="promotion-confirm-title">Promosyonu pasifleştir</h2>
            <p id="promotion-confirm-body">
              “{current.name ?? current.code}” yeni siparişlerde kullanılamayacak. Daha sonra
              yeniden etkinleştirebilirsiniz.
            </p>
            <div>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={busy}
                onClick={() => setConfirmOff(false)}
              >
                Vazgeç
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                disabled={busy}
                onClick={() => void changeActive(current, false)}
              >
                {busy ? 'İşleniyor…' : 'Pasifleştir'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
