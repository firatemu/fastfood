'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { adminPagePermission } from '@fastfood/domain-types';
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
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { useBranchContext } from '../../components/ops/branch-context';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { hasStaffPermission, useStaffAccess } from '../../components/ops/staff-access-context';
import { createAdminClient } from '../../lib/api';
import {
  isE164Phone,
  isHhMm,
  isValidLatitude,
  isValidLongitude,
  parseCoordinate,
  parsePolygonGeoJson,
  weekdayLabel,
} from '../../lib/fulfillment-ops';
import {
  adminBranchSchema,
  adminBranchesSchema,
  branchCreateSchema,
  operatingHoursSchema,
  serviceAreasSchema,
  unknownDataSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './branches.module.css';

type Branch = z.infer<typeof adminBranchesSchema>['data'][number];
type Hour = z.infer<typeof operatingHoursSchema>['data'][number];
type Area = z.infer<typeof serviceAreasSchema>['data'][number];
type Dialog = { kind: 'create' } | { kind: 'edit'; branch: Branch } | null;
type Tab = 'profile' | 'hours' | 'coverage';
type Draft = {
  code: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  minOrder: string;
  deliveryFee: string;
  accepting: boolean;
};
const PAGE_SIZES = [10, 20, 50];
const EMPTY_BRANCHES: Branch[] = [];

function compareMinor(left: string | undefined, right: string | undefined): number {
  const a = BigInt(left ?? '0');
  const b = BigInt(right ?? '0');
  return a < b ? -1 : a > b ? 1 : 0;
}

function acceptsOrders(branch: { isActive?: boolean; isAcceptingOrders?: boolean }): boolean {
  return branch.isActive !== false && branch.isAcceptingOrders !== false;
}

function minorToMajor(value: string | undefined): string {
  try {
    const minor = BigInt(value ?? '0');
    return `${minor / 100n},${(minor % 100n).toString().padStart(2, '0')}`;
  } catch {
    return '0,00';
  }
}

function majorToMinor(value: string): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return (BigInt(whole ?? '0') * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
}

function freshDraft(): Draft {
  return {
    code: '',
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    minOrder: '0,00',
    deliveryFee: '0,00',
    accepting: true,
  };
}
function draftOf(branch: Branch): Draft {
  return {
    code: branch.code ?? '',
    name: branch.name,
    address: branch.addressLine ?? '',
    latitude: String(branch.latitude ?? ''),
    longitude: String(branch.longitude ?? ''),
    phone: branch.phone ?? '',
    minOrder: minorToMajor(branch.minOrderMinor),
    deliveryFee: minorToMajor(branch.deliveryFeeMinor),
    accepting: branch.isAcceptingOrders !== false,
  };
}
function completeHours(rows: Hour[]): Hour[] {
  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));
  return Array.from(
    { length: 7 },
    (_, dayOfWeek) =>
      byDay.get(dayOfWeek) ?? { dayOfWeek, opensAt: '09:00', closesAt: '23:00', isClosed: false },
  );
}

export default function BranchesPage() {
  const branchContext = useBranchContext();
  const access = useStaffAccess();
  const canCreateBranch = hasStaffPermission(access, adminPagePermission('branch-list', 'create'));
  const canUpdateBranch = hasStaffPermission(access, adminPagePermission('branch-list', 'update'));
  const canCreateServiceArea = hasStaffPermission(
    access,
    adminPagePermission('service-areas', 'create'),
  );
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Branch[]>>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'paused'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [tab, setTab] = useState<Tab>('profile');
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [detail, setDetail] = useState<Branch | null>(null);
  const [hours, setHours] = useState<Hour[] | null>(null);
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaPriority, setAreaPriority] = useState('0');
  const [areaPolygon, setAreaPolygon] = useState('');
  const [confirmPause, setConfirmPause] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const response = await createAdminClient().request({
        path: 'admin/branches',
        schema: adminBranchesSchema,
      });
      setState(
        response.data.length ? { status: 'ready', data: response.data } : { status: 'empty' },
      );
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
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        requestId.current += 1;
        setDialog(null);
        setConfirmPause(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', escape);
    };
  }, [dialog, busy]);

  const branches = state.status === 'ready' ? state.data : EMPTY_BRANCHES;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return branches.filter((branch) => {
      if (statusFilter === 'open' && !acceptsOrders(branch)) return false;
      if (statusFilter === 'paused' && acceptsOrders(branch)) return false;
      if (modeFilter === 'delivery' && branch.deliveryEnabled === false) return false;
      if (modeFilter === 'pickup' && branch.pickupEnabled === false) return false;
      return (
        !needle ||
        [branch.name, branch.code ?? '', branch.addressLine ?? '', branch.phone ?? ''].some(
          (value) => value.toLocaleLowerCase('tr-TR').includes(needle),
        )
      );
    });
  }, [branches, query, statusFilter, modeFilter]);

  const openCreate = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
    setDraft(freshDraft());
    setTab('profile');
    setFormError(null);
    setConfirmPause(false);
    setDialog({ kind: 'create' });
  }, []);
  const openEdit = useCallback(async (branch: Branch) => {
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
    const currentRequest = ++requestId.current;
    setDraft(draftOf(branch));
    setDetail(null);
    setHours(null);
    setAreas(null);
    setDetailError(null);
    setHoursError(null);
    setAreasError(null);
    setFormError(null);
    setConfirmPause(false);
    setAreaFormOpen(false);
    setTab('profile');
    setDialog({ kind: 'edit', branch });
    const client = createAdminClient();
    const [profile, schedule, coverage] = await Promise.allSettled([
      client.request({ path: `admin/branches/${branch.id}`, schema: adminBranchSchema }),
      client.request({
        path: `admin/branches/${branch.id}/operating-hours`,
        schema: operatingHoursSchema,
      }),
      client.request({
        path: `admin/branches/${branch.id}/service-areas`,
        schema: serviceAreasSchema,
      }),
    ]);
    if (currentRequest !== requestId.current) return;
    if (profile.status === 'fulfilled') {
      setDetail(profile.value.data);
      setDraft(draftOf(profile.value.data));
    } else setDetailError(errorMessage(profile.reason));
    if (schedule.status === 'fulfilled') setHours(completeHours(schedule.value.data));
    else setHoursError(errorMessage(schedule.reason));
    if (coverage.status === 'fulfilled') setAreas(coverage.value.data);
    else setAreasError(errorMessage(coverage.reason));
  }, []);
  function closeDialog() {
    if (busy) return;
    requestId.current += 1;
    setDialog(null);
    setConfirmPause(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function saveProfile(confirmed = false) {
    if (!dialog) return;
    if (dialog.kind === 'create' ? !canCreateBranch : !canUpdateBranch) return;
    const name = draft.name.trim(),
      addressLine = draft.address.trim(),
      phone = draft.phone.trim();
    const minOrderMinor = majorToMinor(draft.minOrder),
      deliveryFeeMinor = majorToMinor(draft.deliveryFee);
    if (!name || name.length > 128 || !addressLine || addressLine.length > 255) {
      setFormError('Şube adı ve adresi zorunlu; uzunluklarını kontrol edin.');
      return;
    }
    if (minOrderMinor === null || deliveryFeeMinor === null) {
      setFormError('Tutarları ₺ cinsinden, en fazla iki ondalık basamakla girin.');
      return;
    }
    if (phone && !isE164Phone(phone)) {
      setFormError('Telefonu ülke koduyla girin (örnek: +905551112233).');
      return;
    }
    const latitude = parseCoordinate(draft.latitude),
      longitude = parseCoordinate(draft.longitude);
    if (dialog.kind === 'create') {
      if (!draft.code.trim() || draft.code.trim().length > 32) {
        setFormError('Şube kodu 1–32 karakter olmalı.');
        return;
      }
      if (
        !draft.latitude.trim() ||
        !draft.longitude.trim() ||
        latitude === null ||
        longitude === null ||
        !isValidLatitude(latitude) ||
        !isValidLongitude(longitude)
      ) {
        setFormError('Geçerli enlem (-90 ile 90) ve boylam (-180 ile 180) girin.');
        return;
      }
    }
    if (
      dialog.kind === 'edit' &&
      detail?.isAcceptingOrders !== false &&
      !draft.accepting &&
      !confirmed
    ) {
      setConfirmPause(true);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const creating = dialog.kind === 'create';
      await createAdminClient().request({
        method: creating ? 'POST' : 'PATCH',
        path: creating ? 'admin/branches' : `admin/branches/${dialog.branch.id}`,
        body: creating
          ? {
              code: draft.code.trim(),
              name,
              addressLine,
              latitude,
              longitude,
              ...(phone ? { phone } : {}),
              minOrderMinor,
              deliveryFeeMinor,
            }
          : {
              name,
              addressLine,
              phone: phone || null,
              isAcceptingOrders: draft.accepting,
              minOrderMinor,
              deliveryFeeMinor,
            },
        schema: creating ? branchCreateSchema : adminBranchSchema,
      });
      await load();
      setNotice(creating ? 'Yeni şube oluşturuldu.' : 'Şube bilgileri güncellendi.');
      requestId.current += 1;
      setDialog(null);
      setConfirmPause(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveProfile();
  }
  async function saveHours() {
    if (dialog?.kind !== 'edit' || !hours) return;
    if (!canUpdateBranch) return;
    if (hours.some((hour) => !isHhMm(hour.opensAt) || !isHhMm(hour.closesAt))) {
      setFormError('Geçerli başlangıç ve bitiş saatleri girin.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'PUT',
        path: `admin/branches/${dialog.branch.id}/operating-hours`,
        body: {
          hours: hours.map(({ dayOfWeek, opensAt, closesAt, isClosed }) => ({
            dayOfWeek,
            opensAt,
            closesAt,
            isClosed,
          })),
        },
        schema: operatingHoursSchema,
      });
      setNotice(`${dialog.branch.name} çalışma saatleri kaydedildi.`);
      requestId.current += 1;
      setDialog(null);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function addArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog?.kind !== 'edit') return;
    if (!canCreateServiceArea) return;
    const polygon = parsePolygonGeoJson(areaPolygon),
      priority = Number(areaPriority);
    if (!areaName.trim() || areaName.trim().length > 128 || !polygon) {
      setFormError('Alan adı ve Polygon/MultiPolygon biçiminde GeoJSON gerekli.');
      return;
    }
    if (!Number.isInteger(priority) || priority < 0) {
      setFormError('Öncelik sıfır veya daha büyük tam sayı olmalı.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const client = createAdminClient();
      await client.request({
        method: 'POST',
        path: `admin/branches/${dialog.branch.id}/service-areas`,
        body: { name: areaName.trim(), polygonGeoJson: polygon, priority },
        schema: unknownDataSchema,
      });
      const result = await client.request({
        path: `admin/branches/${dialog.branch.id}/service-areas`,
        schema: serviceAreasSchema,
      });
      setAreas(result.data);
      setAreaName('');
      setAreaFormOpen(false);
      setNotice('Hizmet bölgesi eklendi.');
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function changeHour(dayOfWeek: number, patch: Partial<Hour>) {
    setHours(
      (current) =>
        current?.map((hour) => (hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour)) ??
        null,
    );
  }

  const columns = useMemo<ColumnDef<Branch>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: 'Şube',
        enableHiding: false,
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, 'tr'),
        cell: ({ row }) => (
          <button
            className={styles.branchLink}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void openEdit(row.original);
            }}
          >
            <span className={styles.branchMark}>
              <OpsIcon name="storefront" />
            </span>
            <span className={styles.branchIdentity}>
              <strong>{row.original.name}</strong>
              <small>
                {row.original.code ?? 'Kod yok'}
                {row.original.isActive === false ? ' · PASİF KAYIT' : ''}
              </small>
            </span>
          </button>
        ),
      },
      {
        id: 'address',
        accessorFn: (row) => row.addressLine ?? '',
        header: 'Konum',
        cell: ({ row }) => (
          <span className={styles.address} title={row.original.addressLine}>
            {row.original.addressLine || '—'}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => (acceptsOrders(row) ? 1 : 0),
        header: 'Sipariş alımı',
        cell: ({ row }) => (
          <span className={acceptsOrders(row.original) ? styles.statusOpen : styles.statusPaused}>
            <i />
            {row.original.isActive === false
              ? 'Kayıt pasif'
              : acceptsOrders(row.original)
                ? 'Açık'
                : 'Duraklatıldı'}
          </span>
        ),
      },
      {
        id: 'administrator',
        accessorFn: (row) => row.administrator?.displayName ?? row.administrator?.status ?? '',
        header: 'Şube yöneticisi',
        cell: ({ row }) => {
          const administrator = row.original.administrator;
          return (
            <span
              className={
                administrator?.status === 'ACTIVE' ? styles.statusOpen : styles.statusPaused
              }
            >
              <i />
              {administrator
                ? `${administrator.displayName || 'Ad belirtilmemiş'}${administrator.status === 'ACTIVE' ? '' : ' · Davet bekliyor'}`
                : 'Atanmadı · Kullanıcılardan davet edin'}
            </span>
          );
        },
      },
      {
        id: 'channels',
        accessorFn: (row) =>
          `${row.deliveryEnabled !== false ? 1 : 0}${row.pickupEnabled !== false ? 1 : 0}`,
        header: 'Kanallar',
        cell: ({ row }) => (
          <span className={styles.channels}>
            <span
              className={row.original.deliveryEnabled === false ? styles.channelOff : undefined}
            >
              Teslimat
            </span>
            <span className={row.original.pickupEnabled === false ? styles.channelOff : undefined}>
              Gel-al
            </span>
          </span>
        ),
      },
      {
        id: 'minOrder',
        accessorFn: (row) => row.minOrderMinor ?? '0',
        header: 'Min. sipariş',
        sortingFn: (a, b) => compareMinor(a.original.minOrderMinor, b.original.minOrderMinor),
        cell: ({ row }) => (
          <span className={styles.money}>{formatTryMinor(row.original.minOrderMinor ?? '0')}</span>
        ),
      },
      {
        id: 'deliveryFee',
        accessorFn: (row) => row.deliveryFeeMinor ?? '0',
        header: 'Teslimat ücreti',
        sortingFn: (a, b) => compareMinor(a.original.deliveryFeeMinor, b.original.deliveryFeeMinor),
        cell: ({ row }) => (
          <span className={styles.money}>
            {formatTryMinor(row.original.deliveryFeeMinor ?? '0')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'İşlem',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <button
            className={styles.rowAction}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void openEdit(row.original);
            }}
          >
            Düzenle <OpsIcon name="arrow_outward" />
          </button>
        ),
      },
    ],
    [openEdit],
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
  const selected = dialog?.kind === 'edit' ? (detail ?? dialog.branch) : null;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            OPERASYON <span>/</span> ŞUBELER
          </div>
          <h1>Şubeler</h1>
          <p>Konum, sipariş alımı ve hizmet kapsamını tek yerden yönetin.</p>
        </div>
        {canCreateBranch ? (
          <button className={styles.primaryButton} type="button" onClick={openCreate}>
            <OpsIcon name="add" /> Yeni şube
          </button>
        ) : null}
      </header>
      {notice ? (
        <div className={styles.notice} role="status">
          <OpsIcon name="check_circle" />
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Bildirimi kapat">
            ×
          </button>
        </div>
      ) : null}
      <section className={styles.gridPanel} aria-label="Şube yönetimi">
        <div className={styles.gridHeader}>
          <div>
            <span className={styles.eyebrow}>ŞUBE PORTFÖYÜ</span>
            <h2>Şube kayıtları</h2>
            <p>{branches.length} şube kayıtlı</p>
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
                placeholder="Şube, kod veya adres ara"
                aria-label="Şubelerde ara"
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
              aria-label="Şubeleri yenile"
            >
              <OpsIcon name="refresh" />
            </button>
          </div>
        </div>
        <div className={styles.filters}>
          <div className={styles.segmented} aria-label="Sipariş alımı filtresi">
            {(
              [
                ['all', 'Tümü', branches.length],
                ['open', 'Sipariş alıyor', branches.filter(acceptsOrders).length],
                [
                  'paused',
                  'Sipariş almıyor',
                  branches.filter((branch) => !acceptsOrders(branch)).length,
                ],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? styles.filterActive : styles.filterButton}
                aria-pressed={statusFilter === value}
                onClick={() => {
                  setStatusFilter(value);
                  table.setPageIndex(0);
                }}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <span className={styles.filterDivider} />
          <label className={styles.modeSelect}>
            Kanal{' '}
            <select
              value={modeFilter}
              onChange={(event) => {
                setModeFilter(event.target.value as typeof modeFilter);
                table.setPageIndex(0);
              }}
            >
              <option value="all">Tüm kanallar</option>
              <option value="delivery">Teslimat</option>
              <option value="pickup">Gel-al</option>
            </select>
          </label>
        </div>
        {state.status === 'loading' ? (
          <div className={styles.statePanel} role="status">
            <OpsIcon name="progress_activity" />
            <strong>Şubeler yükleniyor</strong>
            <span>Güncel kayıtlar getiriliyor.</span>
          </div>
        ) : state.status === 'error' ? (
          <div className={styles.statePanel} role="alert">
            <OpsIcon name="error" />
            <strong>Şubeler alınamadı</strong>
            <span>{errorMessage(state.error)}</span>
            <button type="button" onClick={() => void load()}>
              Tekrar dene
            </button>
          </div>
        ) : state.status === 'empty' ? (
          <div className={styles.statePanel}>
            <OpsIcon name="storefront" />
            <strong>Henüz şube yok</strong>
            <span>İlk şubeyi oluşturarak operasyonu başlatın.</span>
            {canCreateBranch ? (
              <button type="button" onClick={openCreate}>
                Şube oluştur
              </button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.statePanel}>
            <OpsIcon name="filter_alt_off" />
            <strong>Sonuç bulunamadı</strong>
            <span>Aramayı veya filtreleri değiştirin.</span>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
                setModeFilter('all');
                table.setPageIndex(0);
              }}
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table} aria-label="Şubeler veri tablosu">
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
                  <tr
                    key={row.id}
                    className={`${styles.clickableRow} ${row.original.isActive === false ? styles.inactiveRow : ''}`}
                    tabIndex={0}
                    aria-label={`${row.original.name} şubesini düzenle`}
                    onClick={() => void openEdit(row.original)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === 'Enter' || event.key === ' ')
                      ) {
                        event.preventDefault();
                        void openEdit(row.original);
                      }
                    }}
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
          </div>
        )}
        {state.status === 'ready' && filtered.length > 0 ? (
          <footer className={styles.gridFooter}>
            <span>
              {pagination.pageIndex * pagination.pageSize + 1}–
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filtered.length)} /{' '}
              {filtered.length} şube
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
      {dialog ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className={styles.dialog}
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-dialog-title"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
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
              <span className={styles.dialogGlyph}>
                <OpsIcon name={dialog.kind === 'create' ? 'add_business' : 'storefront'} />
              </span>
              <div>
                <span className={styles.eyebrow}>
                  {dialog.kind === 'create'
                    ? 'YENİ OPERASYON NOKTASI'
                    : `ŞUBE / ${selected?.code ?? ''}`}
                </span>
                <h2 id="branch-dialog-title">
                  {dialog.kind === 'create' ? 'Yeni şube oluştur' : selected?.name}
                </h2>
                <p>
                  {dialog.kind === 'create'
                    ? 'Şubenin kimliğini, konumunu ve ücretlerini tanımlayın.'
                    : 'Şube ayarları, çalışma saatleri ve hizmet bölgesi.'}
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={closeDialog}
                disabled={busy}
                aria-label="Pencereyi kapat"
              >
                ×
              </button>
            </header>
            {dialog.kind === 'edit' ? (
              <div
                className={styles.dialogTabs}
                role="tablist"
                aria-label="Şube bölümleri"
                onKeyDown={(event) => {
                  const tabs: Tab[] = ['profile', 'hours', 'coverage'];
                  const index = tabs.indexOf(tab);
                  const next =
                    event.key === 'ArrowRight'
                      ? tabs[(index + 1) % tabs.length]
                      : event.key === 'ArrowLeft'
                        ? tabs[(index + tabs.length - 1) % tabs.length]
                        : event.key === 'Home'
                          ? tabs[0]
                          : event.key === 'End'
                            ? tabs[2]
                            : null;
                  if (!next) return;
                  event.preventDefault();
                  setTab(next);
                  setFormError(null);
                  window.requestAnimationFrame(() =>
                    document.getElementById(`branch-tab-${next}`)?.focus(),
                  );
                }}
              >
                {(
                  [
                    ['profile', 'edit_note', 'Bilgiler'],
                    ['hours', 'schedule', 'Çalışma saatleri'],
                    ['coverage', 'near_me', 'Hizmet kapsamı'],
                  ] as const
                ).map(([value, icon, label]) => (
                  <button
                    id={`branch-tab-${value}`}
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    aria-controls="branch-dialog-panel"
                    tabIndex={tab === value ? 0 : -1}
                    className={tab === value ? styles.dialogTabActive : styles.dialogTab}
                    onClick={() => {
                      setTab(value);
                      setFormError(null);
                    }}
                  >
                    <OpsIcon name={icon} /> {label}
                  </button>
                ))}
              </div>
            ) : null}
            <div
              className={styles.dialogBody}
              id="branch-dialog-panel"
              role={dialog.kind === 'edit' ? 'tabpanel' : undefined}
              aria-labelledby={dialog.kind === 'edit' ? `branch-tab-${tab}` : undefined}
            >
              {formError ? (
                <div className={styles.formError} role="alert">
                  <OpsIcon name="error" /> {formError}
                </div>
              ) : null}
              {dialog.kind === 'edit' && tab === 'profile' && !detail && !detailError ? (
                <div className={styles.relationEmpty} role="status">
                  Güncel şube bilgileri yükleniyor…
                </div>
              ) : dialog.kind === 'create' || tab === 'profile' ? (
                <form id="branch-profile-form" onSubmit={submitProfile}>
                  <div className={styles.sectionHeading}>
                    <span>ŞUBE PROFİLİ</span>
                    <h3>{dialog.kind === 'create' ? 'Temel bilgiler' : 'Şube bilgileri'}</h3>
                    <p>Kimlik, iletişim ve sipariş ücretleri.</p>
                  </div>
                  {detailError ? (
                    <p className={styles.inlineWarning}>
                      Güncel şube bilgileri alınamadı: {detailError}. Kaydetmeden önce yeniden açın.
                    </p>
                  ) : null}
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>
                        Şube adı <b>*</b>
                      </span>
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        maxLength={128}
                        required
                        placeholder="Örn. Kadıköy Merkez"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        Şube kodu <b>*</b>
                        {dialog.kind === 'edit' ? <small>Değiştirilemez</small> : null}
                      </span>
                      <input
                        value={draft.code}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, code: event.target.value }))
                        }
                        maxLength={32}
                        readOnly={dialog.kind === 'edit'}
                        required
                        placeholder="KADIKOY-01"
                      />
                    </label>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>
                        Adres <b>*</b>
                      </span>
                      <textarea
                        value={draft.address}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, address: event.target.value }))
                        }
                        maxLength={255}
                        rows={2}
                        required
                        placeholder="Açık adres"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        Enlem <b>*</b>
                        {dialog.kind === 'edit' ? <small>Değiştirilemez</small> : null}
                      </span>
                      <input
                        value={draft.latitude}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, latitude: event.target.value }))
                        }
                        inputMode="decimal"
                        readOnly={dialog.kind === 'edit'}
                        required={dialog.kind === 'create'}
                        placeholder="41.0082"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        Boylam <b>*</b>
                        {dialog.kind === 'edit' ? <small>Değiştirilemez</small> : null}
                      </span>
                      <input
                        value={draft.longitude}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, longitude: event.target.value }))
                        }
                        inputMode="decimal"
                        readOnly={dialog.kind === 'edit'}
                        required={dialog.kind === 'create'}
                        placeholder="28.9784"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        Telefon <small>İsteğe bağlı · +90…</small>
                      </span>
                      <input
                        value={draft.phone}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, phone: event.target.value }))
                        }
                        type="tel"
                        placeholder="+905551112233"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        Min. sipariş <small>₺</small>
                      </span>
                      <input
                        value={draft.minOrder}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, minOrder: event.target.value }))
                        }
                        inputMode="decimal"
                        placeholder="0,00"
                        required
                      />
                      <small>
                        {majorToMinor(draft.minOrder) !== null
                          ? formatTryMinor(majorToMinor(draft.minOrder) ?? '0')
                          : 'Geçerli tutar girin'}
                      </small>
                    </label>
                    <label className={styles.field}>
                      <span>
                        Teslimat ücreti <small>₺</small>
                      </span>
                      <input
                        value={draft.deliveryFee}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, deliveryFee: event.target.value }))
                        }
                        inputMode="decimal"
                        placeholder="0,00"
                        required
                      />
                      <small>
                        {majorToMinor(draft.deliveryFee) !== null
                          ? formatTryMinor(majorToMinor(draft.deliveryFee) ?? '0')
                          : 'Geçerli tutar girin'}
                      </small>
                    </label>
                  </div>
                  {dialog.kind === 'edit' ? (
                    <label className={styles.statusControl}>
                      <span className={styles.statusControlIcon}>
                        <OpsIcon name="receipt_long" />
                      </span>
                      <span>
                        <strong>Sipariş alımı</strong>
                        <small>
                          {selected?.isActive === false
                            ? 'Kayıt pasif; sipariş alımı kullanılamıyor'
                            : draft.accepting
                              ? 'Şube sipariş kabul ediyor'
                              : 'Şube sipariş kabul etmiyor'}
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={draft.accepting}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, accepting: event.target.checked }));
                          setConfirmPause(false);
                        }}
                      />
                    </label>
                  ) : null}
                  {confirmPause && canUpdateBranch ? (
                    <div className={styles.confirmBox}>
                      <OpsIcon name="warning" />
                      <div>
                        <strong>Sipariş alımını durdur</strong>
                        <p>Bu şube yeni sipariş kabul etmeyecek. Mevcut siparişler etkilenmez.</p>
                      </div>
                      <button type="button" onClick={() => void saveProfile(true)} disabled={busy}>
                        Evet, kaydet
                      </button>
                    </div>
                  ) : null}
                </form>
              ) : tab === 'hours' ? (
                <div>
                  <div className={styles.sectionHeading}>
                    <span>OPERASYON TAKVİMİ</span>
                    <h3>Haftalık çalışma saatleri</h3>
                    <p>Kapalı günleri işaretleyin; açık günlerde saat aralığını belirleyin.</p>
                  </div>
                  {hours ? (
                    <div className={styles.hoursList}>
                      {hours.map((hour) => (
                        <div className={styles.hourRow} key={hour.dayOfWeek}>
                          <strong>{weekdayLabel(hour.dayOfWeek)}</strong>
                          <label className={styles.closedSwitch}>
                            <input
                              type="checkbox"
                              checked={hour.isClosed}
                              onChange={(event) =>
                                changeHour(hour.dayOfWeek, { isClosed: event.target.checked })
                              }
                            />{' '}
                            Kapalı
                          </label>
                          <label>
                            Açılış{' '}
                            <input
                              type="time"
                              value={hour.opensAt}
                              disabled={hour.isClosed}
                              onChange={(event) =>
                                changeHour(hour.dayOfWeek, { opensAt: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            Kapanış{' '}
                            <input
                              type="time"
                              value={hour.closesAt}
                              disabled={hour.isClosed}
                              onChange={(event) =>
                                changeHour(hour.dayOfWeek, { closesAt: event.target.value })
                              }
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.relationEmpty}>
                      {hoursError
                        ? `Saatler alınamadı: ${hoursError}. Pencereyi kapatıp yeniden deneyin.`
                        : 'Çalışma saatleri yükleniyor…'}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className={styles.sectionHeading}>
                    <span>HİZMET KAPSAMI</span>
                    <h3>Şube bağlantıları</h3>
                    <p>Hizmet bölgeleri ve sipariş kanalları bu şubeye bağlıdır.</p>
                  </div>
                  <div className={styles.readonlyGrid}>
                    <div>
                      <span>Aktiflik</span>
                      <strong>{selected?.isActive === false ? 'Pasif' : 'Aktif'}</strong>
                    </div>
                    <div>
                      <span>Şube yöneticisi</span>
                      <strong>
                        {selected?.administrator
                          ? `${selected.administrator.displayName || 'Ad belirtilmemiş'} · ${selected.administrator.status === 'ACTIVE' ? 'Aktif' : 'Davet bekliyor'}`
                          : 'Atanmadı · Kullanıcılardan davet edin'}
                      </strong>
                    </div>
                    <div>
                      <span>Teslimat</span>
                      <strong>{selected?.deliveryEnabled === false ? 'Kapalı' : 'Açık'}</strong>
                    </div>
                    <div>
                      <span>Gel-al</span>
                      <strong>{selected?.pickupEnabled === false ? 'Kapalı' : 'Açık'}</strong>
                    </div>
                    <div>
                      <span>Tahmini teslimat</span>
                      <strong>
                        {selected?.estimatedDeliveryMinutesMin !== undefined &&
                        selected?.estimatedDeliveryMinutesMax !== undefined &&
                        selected.estimatedDeliveryMinutesMax > 0
                          ? `${selected.estimatedDeliveryMinutesMin}–${selected.estimatedDeliveryMinutesMax} dk`
                          : 'Tanımlı değil'}
                      </strong>
                    </div>
                  </div>
                  <div className={styles.relationHeader}>
                    <div>
                      <h4>Hizmet bölgeleri</h4>
                      <p>Seçili şubeye tanımlı aktif alanlar</p>
                    </div>
                    {canCreateServiceArea ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAreaFormOpen((open) => !open);
                          setFormError(null);
                        }}
                      >
                        <OpsIcon name={areaFormOpen ? 'close' : 'add'} />
                        {areaFormOpen ? 'Vazgeç' : 'Alan ekle'}
                      </button>
                    ) : null}
                  </div>
                  {areaFormOpen && canCreateServiceArea ? (
                    <form className={styles.areaForm} onSubmit={(event) => void addArea(event)}>
                      <label className={styles.field}>
                        Alan adı
                        <input
                          value={areaName}
                          onChange={(event) => setAreaName(event.target.value)}
                          maxLength={128}
                          required
                        />
                      </label>
                      <label className={styles.field}>
                        Öncelik
                        <input
                          value={areaPriority}
                          onChange={(event) => setAreaPriority(event.target.value)}
                          inputMode="numeric"
                          required
                        />
                      </label>
                      <label className={`${styles.field} ${styles.fieldWide}`}>
                        Polygon / MultiPolygon GeoJSON
                        <textarea
                          value={areaPolygon}
                          onChange={(event) => setAreaPolygon(event.target.value)}
                          rows={5}
                          required
                          placeholder='{"type":"Polygon","coordinates":[[[28.96,41],[28.98,41],[28.98,41.02],[28.96,41]]]} '
                        />
                      </label>
                      <button className={styles.primaryButton} type="submit" disabled={busy}>
                        Hizmet bölgesini ekle
                      </button>
                    </form>
                  ) : null}
                  {areas ? (
                    <div className={styles.areaList}>
                      {areas.length ? (
                        areas.map((area) => (
                          <div key={area.id}>
                            <span className={styles.areaMark}>
                              <OpsIcon name="near_me" />
                            </span>
                            <strong>{area.name || 'Adsız alan'}</strong>
                            <small>Öncelik {area.priority ?? 0}</small>
                          </div>
                        ))
                      ) : (
                        <div className={styles.relationEmpty}>
                          Bu şubede hizmet bölgesi tanımlı değil.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.relationEmpty}>
                      {areasError
                        ? `Bölgeler alınamadı: ${areasError}. Pencereyi kapatıp yeniden deneyin.`
                        : 'Hizmet bölgeleri yükleniyor…'}
                    </div>
                  )}
                  {dialog.kind === 'edit' ? (
                    <div className={styles.relationLinks}>
                      <Link href={`/branches/${dialog.branch.id}`}>
                        <OpsIcon name="open_in_new" /> Ayrıntılı şube görünümü
                      </Link>
                      <Link
                        href="/branches/availability"
                        onClick={() => branchContext.setBranchId(dialog.branch.id)}
                      >
                        <OpsIcon name="toggle_on" /> Ürün müsaitliği
                      </Link>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <footer className={styles.dialogFooter}>
              <span>{dialog.kind === 'create' ? 'YENİ ŞUBE' : (selected?.code ?? 'ŞUBE')}</span>
              <div>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={closeDialog}
                  disabled={busy}
                >
                  Kapat
                </button>
                {(
                  dialog.kind === 'create' ? canCreateBranch : tab === 'profile' && canUpdateBranch
                ) ? (
                  <button
                    className={styles.primaryButton}
                    type="submit"
                    form="branch-profile-form"
                    disabled={busy || Boolean(detailError) || (dialog.kind === 'edit' && !detail)}
                  >
                    {busy
                      ? 'Kaydediliyor…'
                      : dialog.kind === 'create'
                        ? 'Şubeyi oluştur'
                        : 'Değişiklikleri kaydet'}
                  </button>
                ) : tab === 'hours' && canUpdateBranch ? (
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => void saveHours()}
                    disabled={busy || !hours}
                  >
                    {busy ? 'Kaydediliyor…' : 'Saatleri kaydet'}
                  </button>
                ) : null}
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
