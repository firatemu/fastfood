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
  type VisibilityState,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { createAdminClient } from '../../lib/api';
import { accountStatusLabel, filterCustomers } from '../../lib/finance-ops';
import {
  adminClubSnapshotSchema,
  adminCustomerSchema,
  adminCustomersSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './customers.module.css';

type Customer = z.infer<typeof adminCustomersSchema>['data'][number];
type CustomerDetail = z.infer<typeof adminCustomerSchema>['data'];
type Club = z.infer<typeof adminClubSnapshotSchema>['data'];
type VerificationFilter = 'all' | 'phone' | 'email' | 'unverified';
type DetailTab = 'profile' | 'club';
const EMPTY_CUSTOMERS: Customer[] = [];
const PAGE_SIZES = [10, 20, 50];

function customerName(customer: Customer): string {
  return customer.displayName?.trim() || 'İsimsiz müşteri';
}

function initials(customer: Customer): string {
  const words = customer.displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return words.length
    ? words
        .slice(0, 2)
        .map((word) => word[0]?.toLocaleUpperCase('tr-TR'))
        .join('')
    : 'M';
}

function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function pointsLabel(value: string | undefined): string {
  if (!value) return '—';
  try {
    return BigInt(value).toLocaleString('tr-TR');
  } catch {
    return value;
  }
}

function statusClass(status: string | undefined): string | undefined {
  if (status === 'ACTIVE') return styles.statusActive;
  if (status === 'PENDING_VERIFICATION') return styles.statusPending;
  if (status === 'DISABLED' || status === 'SUSPENDED') return styles.statusDisabled;
  return styles.statusOther;
}

export default function CustomersPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Customer[]>>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [verification, setVerification] = useState<VerificationFilter>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [clubError, setClubError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('profile');
  const dialogRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const detailRequest = useRef(0);

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const result = await createAdminClient().request({
        path: 'admin/customers',
        schema: adminCustomersSchema,
      });
      setState(result.data.length ? { status: 'ready', data: result.data } : { status: 'empty' });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);
  useDeferredLoad(() => void load(), [load]);

  useEffect(() => {
    if (!columnMenuOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target))
        setColumnMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [columnMenuOpen]);

  useEffect(() => {
    if (!selected) return;
    dialogRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        detailRequest.current += 1;
        setSelected(null);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [selected]);

  const customers = state.status === 'ready' ? state.data : EMPTY_CUSTOMERS;
  const filtered = useMemo(() => {
    const byTextAndStatus = filterCustomers(customers, {
      q: query,
      status: status === 'all' ? '' : status,
    });
    return byTextAndStatus.filter((customer) => {
      if (verification === 'phone') return customer.phoneVerified === true;
      if (verification === 'email') return customer.emailVerified === true;
      if (verification === 'unverified')
        return customer.phoneVerified !== true && customer.emailVerified !== true;
      return true;
    });
  }, [customers, query, status, verification]);

  const openDetail = useCallback(async (customer: Customer) => {
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
    const request = ++detailRequest.current;
    setSelected(customer);
    setDetail(null);
    setClub(null);
    setDetailError(null);
    setClubError(null);
    setTab('profile');
    const client = createAdminClient();
    const [profile, snapshot] = await Promise.allSettled([
      client.request({ path: `admin/customers/${customer.userId}`, schema: adminCustomerSchema }),
      client.request({
        path: `admin/customers/${customer.userId}/club`,
        schema: adminClubSnapshotSchema,
      }),
    ]);
    if (request !== detailRequest.current) return;
    if (profile.status === 'fulfilled') setDetail(profile.value.data);
    else setDetailError(errorMessage(profile.reason));
    if (snapshot.status === 'fulfilled') setClub(snapshot.value.data);
    else setClubError(errorMessage(snapshot.reason));
  }, []);

  const retryClub = useCallback(async () => {
    if (!selected) return;
    const request = detailRequest.current;
    setClubError(null);
    try {
      const result = await createAdminClient().request({
        path: `admin/customers/${selected.userId}/club`,
        schema: adminClubSnapshotSchema,
      });
      if (request === detailRequest.current) setClub(result.data);
    } catch (error) {
      if (request === detailRequest.current) setClubError(errorMessage(error));
    }
  }, [selected]);

  function closeDetail() {
    detailRequest.current += 1;
    setSelected(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.displayName ?? '',
        header: 'Müşteri',
        enableHiding: false,
        sortingFn: (a, b) => customerName(a.original).localeCompare(customerName(b.original), 'tr'),
        cell: ({ row }) => (
          <button
            className={styles.identityButton}
            type="button"
            onClick={() => void openDetail(row.original)}
          >
            <span className={styles.identityMark}>{initials(row.original)}</span>
            <span className={styles.identityText}>
              <strong>{customerName(row.original)}</strong>
              <small>{row.original.userId.slice(0, 8)}</small>
            </span>
          </button>
        ),
      },
      {
        id: 'phone',
        accessorFn: (row) => row.phone ?? '',
        header: 'Telefon',
        cell: ({ row }) => (
          <span className={styles.contactCell}>
            <strong>{row.original.phone || '—'}</strong>
            <small className={row.original.phoneVerified ? styles.verified : undefined}>
              {row.original.phone
                ? row.original.phoneVerified
                  ? 'Doğrulandı'
                  : 'Doğrulanmadı'
                : 'Telefon yok'}
            </small>
          </span>
        ),
      },
      {
        id: 'email',
        accessorFn: (row) => row.email ?? '',
        header: 'E-posta',
        cell: ({ row }) => (
          <span className={styles.contactCell}>
            <strong title={row.original.email ?? undefined}>{row.original.email || '—'}</strong>
            <small className={row.original.emailVerified ? styles.verified : undefined}>
              {row.original.email
                ? row.original.emailVerified
                  ? 'Doğrulandı'
                  : 'Doğrulanmadı'
                : 'E-posta yok'}
            </small>
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => row.status ?? '',
        header: 'Hesap',
        cell: ({ row }) => (
          <span className={statusClass(row.original.status)}>
            <i />
            {accountStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: 'createdAt',
        accessorFn: (row) => row.createdAt ?? '',
        header: 'Kayıt tarihi',
        cell: ({ row }) => (
          <time className={styles.date} dateTime={row.original.createdAt ?? undefined}>
            {formatDate(row.original.createdAt)}
          </time>
        ),
      },
      {
        id: 'actions',
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
    state: { sorting, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const progress = Math.max(0, Math.min(100, (club?.progressBps ?? 0) / 100));

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            İLİŞKİLER <span>/</span> MÜŞTERİLER
          </div>
          <h1>Müşteriler</h1>
          <p>Hesap durumunu, iletişim doğrulamasını ve Club geçmişini inceleyin.</p>
        </div>
        <span className={styles.readOnlyMark}>
          <OpsIcon name="visibility" /> Görüntüleme yetkisi
        </span>
      </header>
      <section className={styles.gridPanel} aria-label="Müşteri dizini">
        <div className={styles.gridHeader}>
          <div>
            <span className={styles.eyebrow}>MÜŞTERİ DİZİNİ</span>
            <h2>Son kayıtlar</h2>
            <p>
              {state.status === 'ready'
                ? `${customers.length} kayıt görüntüleniyor`
                : 'Müşteri profilleri'}
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
                placeholder="Ad, telefon, e-posta veya ID ara"
                aria-label="Müşteri ara"
              />
              {query ? (
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
              ) : null}
            </label>
            <div className={styles.columnMenu} ref={menuRef}>
              <button
                className={styles.toolButton}
                type="button"
                aria-expanded={columnMenuOpen}
                onClick={() => setColumnMenuOpen((open) => !open)}
              >
                <OpsIcon name="view_column" /> Sütunlar
              </button>
              {columnMenuOpen ? (
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
              ) : null}
            </div>
            <button
              className={styles.toolButton}
              type="button"
              onClick={() => void load()}
              aria-label="Müşterileri yenile"
            >
              <OpsIcon name="refresh" />
            </button>
          </div>
        </div>
        <div className={styles.filters}>
          <div className={styles.segmented} aria-label="Hesap durumu filtresi">
            {(
              [
                ['all', 'Tümü'],
                ['ACTIVE', 'Aktif'],
                ['PENDING_VERIFICATION', 'Doğrulama bekliyor'],
                ['DISABLED', 'Devre dışı'],
                ['SUSPENDED', 'Askıda'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={status === value ? styles.filterActive : styles.filterButton}
                type="button"
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value);
                  table.setPageIndex(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span className={styles.filterDivider} />
          <label className={styles.verificationSelect}>
            Doğrulama{' '}
            <select
              value={verification}
              onChange={(event) => {
                setVerification(event.target.value as VerificationFilter);
                table.setPageIndex(0);
              }}
            >
              <option value="all">Tümü</option>
              <option value="phone">Telefon doğrulandı</option>
              <option value="email">E-posta doğrulandı</option>
              <option value="unverified">Hiçbiri doğrulanmadı</option>
            </select>
          </label>
          <span className={styles.scopeHint}>
            Arama ve filtreler yalnızca getirilen en yeni 50 kayıtta çalışır.
          </span>
        </div>
        {state.status === 'loading' ? (
          <div className={styles.statePanel} role="status">
            <OpsIcon name="progress_activity" />
            <strong>Müşteriler yükleniyor</strong>
            <span>Güncel profiller getiriliyor.</span>
          </div>
        ) : state.status === 'error' ? (
          <div className={styles.statePanel} role="alert">
            <OpsIcon name="error" />
            <strong>Müşteriler alınamadı</strong>
            <span>{errorMessage(state.error)}</span>
            <button type="button" onClick={() => void load()}>
              Tekrar dene
            </button>
          </div>
        ) : state.status === 'empty' ? (
          <div className={styles.statePanel}>
            <OpsIcon name="person_off" />
            <strong>Henüz müşteri kaydı yok</strong>
            <span>Müşteriler kayıt olduğunda burada görünecek.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.statePanel}>
            <OpsIcon name="filter_alt_off" />
            <strong>Sonuç bulunamadı</strong>
            <span>Getirilen kayıtlarda eşleşme yok. Aramayı veya filtreleri değiştirin.</span>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatus('all');
                setVerification('all');
                table.setPageIndex(0);
              }}
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table} aria-label="Müşteriler veri tablosu">
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
                            aria-label={`${String(header.column.columnDef.header)} sütununa göre sırala`}
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
        {state.status === 'ready' && filtered.length > 0 ? (
          <footer className={styles.gridFooter}>
            <span>
              {pagination.pageIndex * pagination.pageSize + 1}–
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filtered.length)} /{' '}
              {filtered.length} müşteri
            </span>
            <div className={styles.pagination}>
              <label>
                Satır{' '}
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
                <OpsIcon name="chevron_left" />
              </button>
              <span>
                {pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Sonraki sayfa"
              >
                <OpsIcon name="chevron_right" />
              </button>
            </div>
          </footer>
        ) : null}
      </section>
      {selected ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <section
            className={styles.dialog}
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-dialog-title"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not([disabled]), a[href]',
                ),
              ).filter((element) => element.tabIndex >= 0);
              const first = focusable[0],
                last = focusable[focusable.length - 1];
              if (
                event.shiftKey &&
                (document.activeElement === first || document.activeElement === event.currentTarget)
              ) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <header className={styles.dialogHeader}>
              <span className={styles.dialogMark}>{initials(selected)}</span>
              <div>
                <span className={styles.eyebrow}>
                  MÜŞTERİ PROFİLİ / {selected.userId.slice(0, 8)}
                </span>
                <h2 id="customer-dialog-title">{customerName(selected)}</h2>
                <p>Hesap ve Club bilgilerini görüntüleyin.</p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={closeDetail}
                aria-label="Pencereyi kapat"
              >
                ×
              </button>
            </header>
            <div
              className={styles.dialogTabs}
              role="tablist"
              aria-label="Müşteri bölümleri"
              onKeyDown={(event) => {
                const next: DetailTab | null =
                  event.key === 'ArrowRight' || event.key === 'ArrowLeft'
                    ? tab === 'profile'
                      ? 'club'
                      : 'profile'
                    : event.key === 'Home'
                      ? 'profile'
                      : event.key === 'End'
                        ? 'club'
                        : null;
                if (!next) return;
                event.preventDefault();
                setTab(next);
                window.requestAnimationFrame(() =>
                  document.getElementById(`customer-tab-${next}`)?.focus(),
                );
              }}
            >
              <button
                id="customer-tab-profile"
                type="button"
                role="tab"
                aria-selected={tab === 'profile'}
                aria-controls="customer-dialog-panel"
                tabIndex={tab === 'profile' ? 0 : -1}
                className={tab === 'profile' ? styles.dialogTabActive : styles.dialogTab}
                onClick={() => setTab('profile')}
              >
                <OpsIcon name="badge" /> Profil
              </button>
              <button
                id="customer-tab-club"
                type="button"
                role="tab"
                aria-selected={tab === 'club'}
                aria-controls="customer-dialog-panel"
                tabIndex={tab === 'club' ? 0 : -1}
                className={tab === 'club' ? styles.dialogTabActive : styles.dialogTab}
                onClick={() => setTab('club')}
              >
                <OpsIcon name="loyalty" /> Burger Home Club
              </button>
            </div>
            <div
              className={styles.dialogBody}
              id="customer-dialog-panel"
              role="tabpanel"
              aria-labelledby={`customer-tab-${tab}`}
            >
              {tab === 'profile' ? (
                <div>
                  <div className={styles.sectionHeading}>
                    <span className={styles.eyebrow}>HESAP KAYDI</span>
                    <h3>Kimlik ve iletişim</h3>
                    <p>Müşterinin kayıtlı profil ve doğrulama durumu.</p>
                  </div>
                  {detailError ? (
                    <div className={styles.dialogState} role="alert">
                      <strong>Profil alınamadı</strong>
                      <span>{detailError}</span>
                      <button type="button" onClick={() => void openDetail(selected)}>
                        Tekrar dene
                      </button>
                    </div>
                  ) : detail ? (
                    <>
                      <div className={styles.profileGrid}>
                        <div className={styles.infoCard}>
                          <span>Hesap durumu</span>
                          <strong>
                            <span className={statusClass(detail.status)}>
                              <i />
                              {accountStatusLabel(detail.status)}
                            </span>
                          </strong>
                        </div>
                        <div className={styles.infoCard}>
                          <span>Kayıt tarihi · İstanbul saati</span>
                          <strong>{formatDate(detail.createdAt, true)}</strong>
                        </div>
                        <div className={styles.infoCard}>
                          <span>Telefon</span>
                          <strong>{detail.phone || 'Kayıtlı değil'}</strong>
                          <small className={detail.phoneVerified ? styles.yes : styles.no}>
                            {detail.phone
                              ? detail.phoneVerified
                                ? 'Doğrulandı'
                                : 'Doğrulanmadı'
                              : '—'}
                          </small>
                        </div>
                        <div className={styles.infoCard}>
                          <span>E-posta</span>
                          <strong>{detail.email || 'Kayıtlı değil'}</strong>
                          <small className={detail.emailVerified ? styles.yes : styles.no}>
                            {detail.email
                              ? detail.emailVerified
                                ? 'Doğrulandı'
                                : 'Doğrulanmadı'
                              : '—'}
                          </small>
                        </div>
                        <div className={styles.infoCard}>
                          <span>Görünen ad</span>
                          <strong>{customerName(detail)}</strong>
                        </div>
                        <div className={styles.infoCard}>
                          <span>Harcanabilir puan</span>
                          <strong>{pointsLabel(detail.pointsBalance)}</strong>
                          <small>Club bakiyesinden alınır</small>
                        </div>
                        <div className={`${styles.infoCard} ${styles.profileWide}`}>
                          <span>Müşteri kimliği</span>
                          <strong className={styles.mono}>{detail.userId}</strong>
                        </div>
                      </div>
                      <p className={styles.profileFootnote}>
                        Bu görünüm müşteri kaydını değiştirmez. Puan hareketleri Club sekmesinde
                        gösterilir.
                      </p>
                    </>
                  ) : (
                    <div className={styles.dialogState} role="status">
                      <strong>Profil yükleniyor</strong>
                      <span>Müşteri kaydı getiriliyor.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className={styles.sectionHeading}>
                    <span className={styles.eyebrow}>BURGER HOME CLUB</span>
                    <h3>Puan ve kademe</h3>
                    <p>Harcanabilir bakiye, kademe ilerlemesi ve son 20 puan hareketi.</p>
                  </div>
                  {clubError ? (
                    <div className={styles.dialogState} role="alert">
                      <strong>Club bilgileri alınamadı</strong>
                      <span>{clubError}</span>
                      <button type="button" onClick={() => void retryClub()}>
                        Tekrar dene
                      </button>
                    </div>
                  ) : club ? (
                    <>
                      <div className={styles.clubSummary}>
                        <div>
                          <span>Harcanabilir puan</span>
                          <strong>{pointsLabel(club.points)}</strong>
                        </div>
                        <div>
                          <span>Ömür boyu kazanım</span>
                          <strong>{pointsLabel(club.lifetimeEarnedPoints)}</strong>
                        </div>
                        <div>
                          <span>Geçerli kademe</span>
                          <strong className={styles.tierName}>
                            {club.currentTier.displayName}
                          </strong>
                        </div>
                      </div>
                      <div className={styles.tierProgress}>
                        <div>
                          <strong>{club.currentTier.displayName}</strong>
                          <span>
                            {club.nextTier
                              ? `Sonraki: ${club.nextTier.displayName}`
                              : 'En üst kademe'}
                          </span>
                        </div>
                        <span className={styles.progressTrack}>
                          <i style={{ width: `${progress}%` }} />
                        </span>
                        <small>
                          {club.nextTier && club.pointsToNextTier
                            ? `Sonraki kademeye ${pointsLabel(club.pointsToNextTier)} puan`
                            : 'Kademe ilerlemesi tamamlandı'}
                        </small>
                      </div>
                      <div className={styles.activityHead}>
                        <h4>Puan hareketleri</h4>
                        <span>Son {club.activity?.length ?? 0} kayıt</span>
                      </div>
                      {club.activity?.length ? (
                        <div className={styles.activityList}>
                          {club.activity.map((entry) => (
                            <div className={styles.activityRow} key={entry.id}>
                              <div>
                                <strong>{entry.entryType || 'Puan hareketi'}</strong>
                                <small>{entry.reason || 'Açıklama yok'}</small>
                              </div>
                              <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                              <span
                                className={
                                  entry.pointsDelta?.startsWith('-') ? styles.negative : undefined
                                }
                              >
                                {entry.pointsDelta && !entry.pointsDelta.startsWith('-') ? '+' : ''}
                                {pointsLabel(entry.pointsDelta)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.dialogState}>
                          <strong>Henüz puan hareketi yok</strong>
                          <span>Yeni hareketler burada görünecek.</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.dialogState} role="status">
                      <strong>Club bilgileri yükleniyor</strong>
                      <span>Puan kaydı getiriliyor.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <footer className={styles.dialogFooter}>
              <span>{selected.userId.slice(0, 8)}</span>
              <div>
                <button className={styles.secondaryButton} type="button" onClick={closeDetail}>
                  Kapat
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
