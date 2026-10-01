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
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { useOpsSync } from '../../components/ops/ops-sync';
import { createAdminClient } from '../../lib/api';
import { keepTabInsideDialog } from '../../lib/dialog-focus';
import { accountStatusLabel, isFinanceUuid } from '../../lib/finance-ops';
import {
  adminClubSnapshotSchema,
  adminCustomerSchema,
  adminCustomersSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './loyalty.module.css';

type Customer = z.infer<typeof adminCustomersSchema>['data'][number];
type CustomerDetail = z.infer<typeof adminCustomerSchema>['data'];
type Club = z.infer<typeof adminClubSnapshotSchema>['data'];
type Activity = NonNullable<Club['activity']>[number];
const EMPTY_CUSTOMERS: Customer[] = [];
const EMPTY_ACTIVITY: Activity[] = [];

function customerName(customer: Customer): string {
  return customer.displayName?.trim() || 'İsimsiz müşteri';
}
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
      .join('') || 'M'
  );
}
function points(value: string | null | undefined): string {
  if (value == null) return '—';
  try {
    return BigInt(value).toLocaleString('tr-TR');
  } catch {
    return value;
  }
}
function pointChange(value: string | undefined): string {
  if (!value) return '—';
  try {
    const amount = BigInt(value);
    return `${amount > 0n ? '+' : ''}${amount.toLocaleString('tr-TR')}`;
  } catch {
    return value;
  }
}
function dateTime(value: string | null | undefined): string {
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
function activityType(value: string | undefined): string {
  const labels: Record<string, string> = {
    EARNED: 'Kazanım',
    REDEEMED: 'Kullanım',
    RESTORED: 'İade',
    ADJUSTMENT: 'Düzeltme',
    ACTIVITY: 'Hareket',
  };
  return labels[value ?? ''] ?? value ?? 'Hareket';
}
function reasonLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    order_earn: 'Sipariş kazanımı',
    spin_reward: 'Çark ödülü',
    welcome_reward: 'Hoş geldin ödülü',
    redeemed: 'Siparişte kullanım',
    released: 'Ayrılan puan iadesi',
  };
  return value ? (labels[value] ?? value) : '—';
}
function welcomeLabel(value: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: 'Kullanılabilir',
    GRANTED: 'Tanımlandı',
    EXPIRED: 'Süresi doldu',
    REDEEMED: 'Kullanıldı',
    INELIGIBLE: 'Uygun değil',
  };
  return labels[value] ?? value;
}
function money(value: string | null | undefined): string {
  if (value == null) return '—';
  try {
    return formatTryMinor(value);
  } catch {
    return '—';
  }
}

function LoyaltyInner() {
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get('userId');
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [customersState, setCustomersState] = useState<LoadState<Customer[]>>({
    status: 'loading',
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tümü');
  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [columnMenu, setColumnMenu] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [club, setClub] = useState<LoadState<Club>>({ status: 'loading' });
  const [detailWarning, setDetailWarning] = useState<string | null>(null);
  const [activityQuery, setActivityQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('Tümü');
  const [activitySorting, setActivitySorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ]);
  const [activityPagination, setActivityPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  });
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const handledDeepLink = useRef<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setCustomersState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const response = await createAdminClient().request({
        path: 'admin/customers',
        schema: adminCustomersSchema,
      });
      setCustomersState(
        response.data.length ? { status: 'ready', data: response.data } : { status: 'empty' },
      );
      markSynced();
    } catch (cause) {
      setCustomersState({ status: 'error', error: cause });
      markStale();
    }
  }, [markStale, markSynced]);

  const loadClub = useCallback(
    async (id: string, name?: string) => {
      const request = ++requestId.current;
      setSelectedId(id);
      setSelectedName(name ?? null);
      setCustomerDetail(null);
      setClub({ status: 'loading' });
      setDetailWarning(null);
      setActivityQuery('');
      setActivityFilter('Tümü');
      setActivityPagination({ pageIndex: 0, pageSize: 8 });
      const client = createAdminClient();
      const [snapshot, customer] = await Promise.allSettled([
        client.request({ path: `admin/customers/${id}/club`, schema: adminClubSnapshotSchema }),
        client.request({ path: `admin/customers/${id}`, schema: adminCustomerSchema }),
      ]);
      if (request !== requestId.current) return;
      if (snapshot.status === 'fulfilled') {
        setClub({ status: 'ready', data: snapshot.value.data });
        markSynced();
      } else {
        setClub({ status: 'error', error: snapshot.reason });
        markStale();
      }
      if (customer.status === 'fulfilled') {
        setCustomerDetail(customer.value.data);
        setSelectedName(customer.value.data.displayName?.trim() || name || 'İsimsiz müşteri');
      } else {
        setDetailWarning('Müşteri profili alınamadı; Club verisi yine de görüntülenebilir.');
      }
    },
    [markStale, markSynced],
  );

  useEffect(() => {
    registerRefresh(() => {
      void loadCustomers();
      if (selectedId) void loadClub(selectedId, selectedName ?? undefined);
    });
    return () => registerRefresh(null);
  }, [loadCustomers, loadClub, registerRefresh, selectedId, selectedName]);
  useDeferredLoad(() => void loadCustomers(), [loadCustomers]);
  useEffect(() => {
    if (!deepLinkId || handledDeepLink.current === deepLinkId) return;
    handledDeepLink.current = deepLinkId;
    if (isFinanceUuid(deepLinkId)) void loadClub(deepLinkId);
    else setManualError('Bağlantıdaki müşteri numarası geçersiz.');
  }, [deepLinkId, loadClub]);
  useEffect(() => {
    if (!columnMenu) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target))
        setColumnMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnMenu(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [columnMenu]);
  useEffect(() => {
    if (!selectedId) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestId.current += 1;
        setSelectedId(null);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      keepTabInsideDialog(event, dialogRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedId]);

  const customers = customersState.status === 'ready' ? customersState.data : EMPTY_CUSTOMERS;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return customers.filter((customer) => {
      if (status !== 'Tümü' && customer.status !== status) return false;
      return (
        !needle ||
        [customer.displayName, customer.phone, customer.email, customer.userId].some((value) =>
          value?.toLocaleLowerCase('tr-TR').includes(needle),
        )
      );
    });
  }, [customers, query, status]);
  const statuses = useMemo(
    () => [
      ...new Set(customers.map((row) => row.status).filter((value): value is string => !!value)),
    ],
    [customers],
  );
  const openCustomer = useCallback(
    (customer: Customer, trigger?: HTMLElement) => {
      triggerRef.current =
        trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      void loadClub(customer.userId, customerName(customer));
    },
    [loadClub],
  );
  const closeDialog = () => {
    requestId.current += 1;
    setSelectedId(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = manualId.trim();
    if (!isFinanceUuid(id)) {
      setManualError('Geçerli bir müşteri numarası (UUID) girin.');
      return;
    }
    setManualError(null);
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void loadClub(id);
  }

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => customerName(row),
        header: 'Müşteri',
        sortingFn: (a, b) => customerName(a.original).localeCompare(customerName(b.original), 'tr'),
        cell: ({ row }) => (
          <button
            className={styles.identity}
            onClick={(event) => {
              event.stopPropagation();
              openCustomer(row.original, event.currentTarget);
            }}
          >
            <span className={styles.avatar}>{initials(customerName(row.original))}</span>
            <span>
              <strong>{customerName(row.original)}</strong>
              <small>{row.original.userId.slice(0, 8)}…</small>
            </span>
          </button>
        ),
      },
      {
        id: 'contact',
        accessorFn: (row) => row.phone ?? row.email ?? '',
        header: 'İletişim',
        cell: ({ row }) => (
          <span className={styles.contact}>{row.original.phone || row.original.email || '—'}</span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Hesap durumu',
        cell: ({ row }) => (
          <span
            className={`${styles.badge} ${row.original.status === 'ACTIVE' ? styles.active : row.original.status === 'PENDING_VERIFICATION' ? styles.waiting : styles.mutedBadge}`}
          >
            <i />
            {accountStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: 'created',
        accessorKey: 'createdAt',
        header: 'Kayıt tarihi',
        cell: ({ row }) => <span className={styles.date}>{dateTime(row.original.createdAt)}</span>,
      },
      {
        id: 'action',
        header: 'İşlem',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button
            className={styles.rowAction}
            onClick={(event) => {
              event.stopPropagation();
              openCustomer(row.original, event.currentTarget);
            }}
          >
            Club görünümü ↗
          </button>
        ),
      },
    ],
    [openCustomer],
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

  const activity =
    club.status === 'ready' ? (club.data.activity ?? EMPTY_ACTIVITY) : EMPTY_ACTIVITY;
  const activityTypes = useMemo(
    () => [
      ...new Set(activity.map((row) => row.entryType).filter((value): value is string => !!value)),
    ],
    [activity],
  );
  const activityRows = useMemo(() => {
    const needle = activityQuery.trim().toLocaleLowerCase('tr-TR');
    return activity.filter((row) => {
      if (activityFilter !== 'Tümü' && row.entryType !== activityFilter) return false;
      return (
        !needle ||
        [activityType(row.entryType), reasonLabel(row.reason), row.id].some((value) =>
          value.toLocaleLowerCase('tr-TR').includes(needle),
        )
      );
    });
  }, [activity, activityFilter, activityQuery]);
  const activityColumns = useMemo<ColumnDef<Activity>[]>(
    () => [
      {
        id: 'date',
        accessorKey: 'createdAt',
        header: 'Tarih / saat',
        cell: ({ row }) => <span className={styles.date}>{dateTime(row.original.createdAt)}</span>,
      },
      {
        id: 'type',
        accessorKey: 'entryType',
        header: 'Hareket',
        cell: ({ row }) => (
          <span className={styles.activityType}>{activityType(row.original.entryType)}</span>
        ),
      },
      {
        id: 'reason',
        accessorKey: 'reason',
        header: 'Açıklama',
        cell: ({ row }) => <span>{reasonLabel(row.original.reason)}</span>,
      },
      {
        id: 'points',
        accessorFn: (row) => {
          try {
            return BigInt(row.pointsDelta ?? '0');
          } catch {
            return 0n;
          }
        },
        header: 'Puan',
        cell: ({ row }) => (
          <strong
            className={`${styles.delta} ${(row.original.pointsDelta ?? '').startsWith('-') ? styles.negative : styles.positive}`}
          >
            {pointChange(row.original.pointsDelta)}
          </strong>
        ),
      },
    ],
    [],
  );
  const activityTable = useReactTable({
    data: activityRows,
    columns: activityColumns,
    state: { sorting: activitySorting, pagination: activityPagination },
    onSortingChange: setActivitySorting,
    onPaginationChange: setActivityPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const selectedTitle = selectedName || customerDetail?.displayName || 'Müşteri Club kaydı';

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            MÜŞTERİLER <span>/</span> SADAKAT
          </div>
          <h1>BURGER HOME CLUB</h1>
          <p>Müşteri puanlarını, kademesini ve son hareketlerini inceleyin.</p>
        </div>
        <span className={styles.readOnly}>Salt okunur görünüm</span>
      </header>
      <section className={styles.directory} aria-label="Club müşteri dizini">
        <div className={styles.directoryHeader}>
          <div>
            <h2>Müşteri dizini</h2>
            <p>Son 50 müşteri içinden seçin veya müşteri numarasıyla doğrudan açın.</p>
          </div>
          <button className={styles.refresh} onClick={() => void loadCustomers()}>
            ↻ Yenile
          </button>
        </div>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span aria-hidden>⌕</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                table.setPageIndex(0);
              }}
              placeholder="Ad, telefon, e-posta veya numara ara"
              aria-label="Müşteri ara"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Aramayı temizle">
                ×
              </button>
            )}
          </label>
          <div className={styles.columnMenu} ref={menuRef}>
            <button
              className={styles.toolButton}
              onClick={() => setColumnMenu(!columnMenu)}
              aria-expanded={columnMenu}
            >
              Sütunlar ▾
            </button>
            {columnMenu && (
              <div className={styles.columnPanel}>
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
        </div>
        <div className={styles.filters}>
          <span>Hesap</span>
          {['Tümü', ...statuses].map((value) => (
            <button
              key={value}
              className={status === value ? styles.filterSelected : styles.filter}
              onClick={() => {
                setStatus(value);
                table.setPageIndex(0);
              }}
            >
              {value === 'Tümü' ? value : accountStatusLabel(value)}
            </button>
          ))}
          <span className={styles.count}>{filtered.length} kayıt</span>
        </div>
        {customersState.status === 'loading' && (
          <div className={styles.state}>Müşteriler yükleniyor…</div>
        )}
        {customersState.status === 'error' && (
          <div className={styles.state}>
            <strong>Müşteri dizini yüklenemedi</strong>
            <span>{errorMessage(customersState.error)}</span>
            <button onClick={() => void loadCustomers()}>Tekrar dene</button>
            <small>Müşteri numarasıyla doğrudan açma kullanılabilir.</small>
          </div>
        )}
        {customersState.status === 'empty' && (
          <div className={styles.state}>
            <strong>Henüz müşteri yok</strong>
            <span>Müşteri kaydı oluştuğunda burada görünecek.</span>
          </div>
        )}
        {customersState.status === 'ready' && (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table} aria-label="Club müşteri tablosu">
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
                    <tr
                      key={row.id}
                      tabIndex={0}
                      onClick={(event) => openCustomer(row.original, event.currentTarget)}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          openCustomer(row.original, event.currentTarget);
                        }
                      }}
                      aria-label={`${customerName(row.original)} Club görünümünü aç`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <div className={styles.state}>Aramaya uygun müşteri bulunamadı.</div>
              )}
            </div>
            <footer className={styles.footer}>
              <span>
                {table.getRowModel().rows.length} / {filtered.length} müşteri
              </span>
              <div>
                <label>
                  Satır{' '}
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
      <form className={styles.directLookup} onSubmit={submitManual}>
        <div>
          <strong>Listede yok mu?</strong>
          <span>Son 50 kayıt dışındaki müşteriyi numarasıyla açın.</span>
        </div>
        <label>
          <span className={styles.srOnly}>Müşteri numarası</span>
          <input
            value={manualId}
            onChange={(event) => {
              setManualId(event.target.value);
              setManualError(null);
            }}
            placeholder="Müşteri UUID"
            aria-label="Müşteri numarası"
          />
        </label>
        <button type="submit">Club kaydını aç</button>
        {manualError && <p role="alert">{manualError}</p>}
      </form>

      {selectedId && (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-dialog-title"
            className={styles.dialog}
          >
            <header className={styles.dialogHeader}>
              <div className={styles.clubMark}>BH</div>
              <div>
                <span>BURGER HOME CLUB / MÜŞTERİ</span>
                <h2 id="club-dialog-title">{selectedTitle}</h2>
                <p>{selectedId}</p>
              </div>
              <button className={styles.close} onClick={closeDialog} aria-label="Pencereyi kapat">
                ×
              </button>
            </header>
            <div className={styles.dialogBody}>
              {detailWarning && <p className={styles.warning}>{detailWarning}</p>}
              {club.status === 'loading' && (
                <div className={styles.state}>Club bilgileri yükleniyor…</div>
              )}
              {club.status === 'error' && (
                <div className={styles.state}>
                  <strong>Club bilgileri alınamadı</strong>
                  <span>{errorMessage(club.error)}</span>
                  <button onClick={() => void loadClub(selectedId, selectedName ?? undefined)}>
                    Tekrar dene
                  </button>
                </div>
              )}
              {club.status === 'ready' && (
                <>
                  <div className={styles.clubHero}>
                    <div className={styles.balance}>
                      <span>Harcanabilir puan</span>
                      <strong>{points(club.data.points)}</strong>
                      <small>Güncel puan bakiyesi</small>
                    </div>
                    <div className={styles.tier}>
                      <span>Üyelik kademesi</span>
                      <strong>{club.data.currentTier.displayName}</strong>
                      <small>
                        Ömür boyu kazanılan {points(club.data.lifetimeEarnedPoints)} puan
                      </small>
                      <div
                        className={styles.progress}
                        role="progressbar"
                        aria-label="Sonraki kademeye ilerleme"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round((club.data.progressBps ?? 0) / 100)}
                      >
                        <i
                          style={{
                            width: `${Math.min(100, Math.max(0, (club.data.progressBps ?? 0) / 100))}%`,
                          }}
                        />
                      </div>
                      <small>
                        {club.data.nextTier
                          ? `${club.data.nextTier.displayName} için ${points(club.data.pointsToNextTier)} puan kaldı`
                          : 'En üst kademe'}
                      </small>
                    </div>
                  </div>
                  <p className={styles.explainer}>
                    Harcanabilir puan ile kademe ilerlemesi farklıdır. Kademe, ömür boyu kazanılan
                    puana göre belirlenir.
                  </p>
                  <div className={styles.welcome}>
                    <div>
                      <span>Hoş geldin avantajı</span>
                      <strong>{welcomeLabel(club.data.welcome.status)}</strong>
                      <small>
                        {club.data.welcome.promotionCode
                          ? `Kod: ${club.data.welcome.promotionCode}`
                          : 'Promosyon kodu yok'}
                        {club.data.welcome.expiresAt
                          ? ` · Son tarih: ${dateTime(club.data.welcome.expiresAt)}`
                          : ''}
                      </small>
                    </div>
                    {club.data.welcome.discountMinor != null && (
                      <span>{money(club.data.welcome.discountMinor)} indirim</span>
                    )}
                  </div>
                  <section className={styles.ledger} aria-label="Puan hareketleri">
                    <header>
                      <div>
                        <h3>Puan hareketleri</h3>
                        <p>Bu müşteri için son 20 kayıt</p>
                      </div>
                      <span>{activity.length} hareket</span>
                    </header>
                    {activity.length > 0 && (
                      <div className={styles.ledgerTools}>
                        <label className={styles.search}>
                          <span aria-hidden>⌕</span>
                          <input
                            value={activityQuery}
                            onChange={(event) => {
                              setActivityQuery(event.target.value);
                              activityTable.setPageIndex(0);
                            }}
                            placeholder="Hareket veya açıklama ara"
                            aria-label="Puan hareketi ara"
                          />
                        </label>
                        <select
                          value={activityFilter}
                          onChange={(event) => {
                            setActivityFilter(event.target.value);
                            activityTable.setPageIndex(0);
                          }}
                          aria-label="Hareket türü"
                        >
                          <option value="Tümü">Tüm hareketler</option>
                          {activityTypes.map((value) => (
                            <option key={value} value={value}>
                              {activityType(value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {activity.length === 0 ? (
                      <div className={styles.ledgerEmpty}>
                        Bu müşteriye ait puan hareketi bulunmuyor.
                      </div>
                    ) : (
                      <>
                        <div className={styles.tableScroll}>
                          <table
                            className={styles.table}
                            aria-label="Puan hareketleri veri tablosu"
                          >
                            <thead>
                              {activityTable.getHeaderGroups().map((group) => (
                                <tr key={group.id}>
                                  {group.headers.map((header) => (
                                    <th key={header.id}>
                                      <button
                                        className={styles.sortButton}
                                        disabled={!header.column.getCanSort()}
                                        onClick={header.column.getToggleSortingHandler()}
                                      >
                                        {flexRender(
                                          header.column.columnDef.header,
                                          header.getContext(),
                                        )}
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
                              {activityTable.getRowModel().rows.map((row) => (
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
                          {activityRows.length === 0 && (
                            <div className={styles.ledgerEmpty}>Filtreye uygun hareket yok.</div>
                          )}
                        </div>
                        <footer className={styles.footer}>
                          <span>
                            {activityTable.getRowModel().rows.length} / {activityRows.length}{' '}
                            hareket
                          </span>
                          <div>
                            <button
                              disabled={!activityTable.getCanPreviousPage()}
                              onClick={() => activityTable.previousPage()}
                              aria-label="Önceki hareket sayfası"
                            >
                              ‹
                            </button>
                            <span>
                              {activityTable.getState().pagination.pageIndex + 1} /{' '}
                              {activityTable.getPageCount() || 1}
                            </span>
                            <button
                              disabled={!activityTable.getCanNextPage()}
                              onClick={() => activityTable.nextPage()}
                              aria-label="Sonraki hareket sayfası"
                            >
                              ›
                            </button>
                          </div>
                        </footer>
                      </>
                    )}
                  </section>
                </>
              )}
            </div>
            <footer className={styles.dialogFooter}>
              <Link href={`/customers/${selectedId}`}>Müşteri profili ↗</Link>
              <button onClick={closeDialog}>Kapat</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default function LoyaltyPage() {
  return (
    <Suspense fallback={<div className={styles.page}>Sadakat sayfası yükleniyor…</div>}>
      <LoyaltyInner />
    </Suspense>
  );
}
