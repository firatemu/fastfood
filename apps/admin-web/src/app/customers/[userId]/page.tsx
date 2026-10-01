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
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { createAdminClient } from '../../../lib/api';
import { accountStatusLabel } from '../../../lib/finance-ops';
import { adminClubSnapshotSchema, adminCustomerSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './customer-detail.module.css';

type Customer = z.infer<typeof adminCustomerSchema>['data'];
type Club = z.infer<typeof adminClubSnapshotSchema>['data'];
type Activity = NonNullable<Club['activity']>[number];

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

function points(value: string | null | undefined): string {
  if (value == null) return '—';
  try {
    return BigInt(value).toLocaleString('tr-TR');
  } catch {
    return '—';
  }
}

function pointChange(value: string | undefined): string {
  if (!value) return '—';
  try {
    const amount = BigInt(value);
    return (amount > 0n ? '+' : '') + amount.toLocaleString('tr-TR');
  } catch {
    return '—';
  }
}

function sortablePoints(value: string | undefined): bigint {
  try {
    return BigInt(value ?? '0');
  } catch {
    return 0n;
  }
}

function activityType(value: string | undefined): string {
  const labels: Record<string, string> = {
    EARNED: 'Kazanım',
    REDEEMED: 'Kullanım',
    RESTORED: 'İade',
    ADJUSTMENT: 'Düzeltme',
    ACTIVITY: 'Hareket',
  };
  return labels[value ?? ''] ?? 'Hareket';
}

function reasonLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    order_earn: 'Sipariş kazanımı',
    spin_reward: 'Çark ödülü',
    welcome_reward: 'Hoş geldin ödülü',
    redeemed: 'Siparişte kullanım',
    released: 'Ayrılan puan iadesi',
    adjustment: 'Bakiye düzeltmesi',
  };
  return value ? (labels[value] ?? 'Diğer işlem') : '—';
}

function welcomeLabel(value: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: 'Kullanılabilir',
    GRANTED: 'Tanımlandı',
    EXPIRED: 'Süresi doldu',
    REDEEMED: 'Kullanıldı',
    INELIGIBLE: 'Uygun değil',
  };
  return labels[value] ?? 'Durum bilinmiyor';
}

export default function CustomerDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Customer>>({ status: 'loading' });
  const [clubState, setClubState] = useState<LoadState<Club>>({ status: 'loading' });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 6 });

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    setClubState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    const client = createAdminClient();
    const [customerResult, clubResult] = await Promise.allSettled([
      client.request({ path: 'admin/customers/' + userId, schema: adminCustomerSchema }),
      client.request({
        path: 'admin/customers/' + userId + '/club',
        schema: adminClubSnapshotSchema,
      }),
    ]);
    if (customerResult.status === 'fulfilled') {
      setState({ status: 'ready', data: customerResult.value.data });
    } else {
      setState({ status: 'error', error: customerResult.reason });
    }
    if (clubResult.status === 'fulfilled') {
      setClubState({ status: 'ready', data: clubResult.value.data });
    } else {
      setClubState({ status: 'error', error: clubResult.reason });
    }
    if (customerResult.status === 'fulfilled' && clubResult.status === 'fulfilled') markSynced();
    else markStale();
  }, [markStale, markSynced, userId]);

  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);
  useDeferredLoad(() => void load(), [load]);

  const activity =
    clubState.status === 'ready' ? (clubState.data.activity ?? EMPTY_ACTIVITY) : EMPTY_ACTIVITY;
  const columns = useMemo<ColumnDef<Activity>[]>(
    () => [
      {
        id: 'date',
        accessorFn: (row) => row.createdAt ?? '',
        header: 'Tarih',
        cell: ({ row }) => <span className={styles.date}>{dateTime(row.original.createdAt)}</span>,
      },
      {
        id: 'type',
        accessorFn: (row) => activityType(row.entryType),
        header: 'Hareket',
        cell: ({ row }) => (
          <span className={styles.activityType}>{activityType(row.original.entryType)}</span>
        ),
      },
      {
        id: 'reason',
        accessorFn: (row) => reasonLabel(row.reason),
        header: 'Açıklama',
        cell: ({ row }) => <span>{reasonLabel(row.original.reason)}</span>,
      },
      {
        id: 'points',
        accessorFn: (row) => sortablePoints(row.pointsDelta),
        header: 'Puan',
        cell: ({ row }) => (
          <strong
            className={
              row.original.pointsDelta?.startsWith('-') ? styles.negative : styles.positive
            }
          >
            {pointChange(row.original.pointsDelta)}
          </strong>
        ),
      },
    ],
    [],
  );
  const table = useReactTable({
    data: activity,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <Link href="/customers" className={styles.backLink}>
            ← Müşteri listesi
          </Link>
          <h1>Müşteri profili</h1>
          <p>Hesap ve sadakat bilgileri</p>
        </div>
      </header>

      {state.status === 'loading' && (
        <div className={styles.statePanel}>Müşteri bilgileri yükleniyor…</div>
      )}
      {state.status === 'error' && (
        <div className={styles.statePanel}>
          <strong>Müşteri bilgileri açılamadı</strong>
          <span>{errorMessage(state.error)}</span>
          <button type="button" onClick={() => void load()}>
            Tekrar dene
          </button>
        </div>
      )}
      {state.status === 'ready' &&
        (() => {
          const customer = state.data;
          const name = customerName(customer);
          const club = clubState.status === 'ready' ? clubState.data : null;
          const progress = Math.max(0, Math.min(100, (club?.progressBps ?? 0) / 100));
          return (
            <>
              <section className={styles.profile} aria-label="Müşteri özeti">
                <div className={styles.avatar} aria-hidden="true">
                  {initials(name)}
                </div>
                <div className={styles.profileIdentity}>
                  <div className={styles.identityLine}>
                    <h2>{name}</h2>
                    <span
                      className={
                        customer.status === 'ACTIVE' ? styles.statusActive : styles.statusMuted
                      }
                    >
                      {accountStatusLabel(customer.status)}
                    </span>
                  </div>
                  <p>{customer.email || customer.phone || 'İletişim bilgisi eklenmedi'}</p>
                  <span className={styles.memberSince}>
                    Üyelik tarihi: {dateTime(customer.createdAt)}
                  </span>
                </div>
                <div className={styles.profileSide}>
                  <span>Hesap yönetimi</span>
                  <strong>Müşteriye ait</strong>
                </div>
              </section>

              <div className={styles.readOnlyNote}>
                <span aria-hidden="true">ⓘ</span> Profil ve iletişim bilgileri yalnızca müşteri
                tarafından kendi hesabından güncellenir.
              </div>

              <div className={styles.detailGrid}>
                <section className={styles.section} aria-labelledby="contact-heading">
                  <div className={styles.sectionHeader}>
                    <h3 id="contact-heading">İletişim bilgileri</h3>
                    <span>Hesap kaydı</span>
                  </div>
                  <div className={styles.infoRows}>
                    <div className={styles.infoRow}>
                      <span>Telefon</span>
                      <strong>{customer.phone || 'Eklenmedi'}</strong>
                      <span
                        className={customer.phoneVerified ? styles.verified : styles.unverified}
                      >
                        {customer.phone
                          ? customer.phoneVerified
                            ? 'Doğrulandı'
                            : 'Doğrulanmadı'
                          : 'Bilgi yok'}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span>E-posta</span>
                      <strong>{customer.email || 'Eklenmedi'}</strong>
                      <span
                        className={customer.emailVerified ? styles.verified : styles.unverified}
                      >
                        {customer.email
                          ? customer.emailVerified
                            ? 'Doğrulandı'
                            : 'Doğrulanmadı'
                          : 'Bilgi yok'}
                      </span>
                    </div>
                  </div>
                </section>
                <section className={styles.section} aria-labelledby="account-heading">
                  <div className={styles.sectionHeader}>
                    <h3 id="account-heading">Hesap durumu</h3>
                    <span>Salt okunur</span>
                  </div>
                  <div className={styles.accountRows}>
                    <div>
                      <span>Durum</span>
                      <strong>{accountStatusLabel(customer.status)}</strong>
                    </div>
                    <div>
                      <span>Üyelik tarihi</span>
                      <strong>{dateTime(customer.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Harcanabilir puan</span>
                      <strong>{points(club?.points ?? customer.pointsBalance)} puan</strong>
                    </div>
                  </div>
                </section>
              </div>

              <section className={styles.clubSection} aria-labelledby="club-heading">
                <div className={styles.sectionHeader}>
                  <div>
                    <span className={styles.overline}>Burger Home Club</span>
                    <h3 id="club-heading">Sadakat özeti</h3>
                  </div>
                  <span>Güncel hesap bilgisi</span>
                </div>
                {clubState.status === 'loading' && (
                  <div className={styles.clubState}>Club bilgileri yükleniyor…</div>
                )}
                {clubState.status === 'error' && (
                  <div className={styles.clubState}>
                    <strong>Club bilgileri görüntülenemiyor</strong>
                    <span>{errorMessage(clubState.error)}</span>
                    <button type="button" onClick={() => void load()}>
                      Tekrar dene
                    </button>
                  </div>
                )}
                {club && (
                  <>
                    <div className={styles.clubOverview}>
                      <div className={styles.balanceBlock}>
                        <span>Harcanabilir puan</span>
                        <strong>{points(club.points)}</strong>
                        <small>puan</small>
                      </div>
                      <div className={styles.tierBlock}>
                        <div className={styles.tierTop}>
                          <span>Mevcut kademe</span>
                          <strong>{club.currentTier.displayName}</strong>
                        </div>
                        <div
                          className={styles.progressTrack}
                          role="progressbar"
                          aria-label="Sonraki kademeye ilerleme"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(progress)}
                        >
                          <span style={{ width: progress + '%' }} />
                        </div>
                        <p>
                          {club.nextTier
                            ? club.nextTier.displayName +
                              ' kademesine ' +
                              points(club.pointsToNextTier) +
                              ' puan kaldı'
                            : 'En yüksek kademeye ulaştı'}
                        </p>
                      </div>
                      <div className={styles.welcomeBlock}>
                        <span>Hoş geldin avantajı</span>
                        <strong>{welcomeLabel(club.welcome.status)}</strong>
                        {club.welcome.expiresAt && (
                          <small>Son tarih: {dateTime(club.welcome.expiresAt)}</small>
                        )}
                      </div>
                    </div>
                    <div className={styles.clubMeta}>
                      <span>Toplam kazanılan puan</span>
                      <strong>{points(club.lifetimeEarnedPoints)}</strong>
                    </div>
                  </>
                )}
              </section>

              {club && (
                <section className={styles.activitySection} aria-labelledby="activity-heading">
                  <div className={styles.sectionHeader}>
                    <div>
                      <span className={styles.overline}>Club hareketleri</span>
                      <h3 id="activity-heading">Puan geçmişi</h3>
                    </div>
                    <span>Son {activity.length} hareket</span>
                  </div>
                  {activity.length ? (
                    <>
                      <div className={styles.tableScroll}>
                        <table className={styles.table} aria-label="Puan hareketleri">
                          <thead>
                            {table.getHeaderGroups().map((group) => (
                              <tr key={group.id}>
                                {group.headers.map((header) => (
                                  <th key={header.id}>
                                    <button
                                      type="button"
                                      onClick={header.column.getToggleSortingHandler()}
                                    >
                                      {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                      <span aria-hidden="true">
                                        {header.column.getIsSorted() === 'asc'
                                          ? ' ↑'
                                          : header.column.getIsSorted() === 'desc'
                                            ? ' ↓'
                                            : ' ↕'}
                                      </span>
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
                      </div>
                      <div className={styles.tableFooter}>
                        <span>
                          {table.getRowModel().rows.length} / {activity.length} hareket
                        </span>
                        <div>
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
                  ) : (
                    <div className={styles.emptyActivity}>Henüz puan hareketi bulunmuyor.</div>
                  )}
                </section>
              )}
            </>
          );
        })()}
    </main>
  );
}
