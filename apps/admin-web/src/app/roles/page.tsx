'use client';

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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { hasStaffPermission, useStaffAccess } from '../../components/ops/staff-access-context';
import { canAssignRole } from '../../lib/access-ops';
import { createAdminClient } from '../../lib/api';
import { keepTabInsideDialog } from '../../lib/dialog-focus';
import {
  adminPermissionsSchema,
  adminRoleAssignSchema,
  adminRolesSchema,
  adminUsersSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';
import base from '../promotions/promotions.module.css';

import {
  ACCESS_PAGE_MATRIX,
  permissionArea,
  permissionKind,
  permissionName,
  roleDescription,
  roleName,
} from './role-copy';
import styles from './roles.module.css';

type Role = z.infer<typeof adminRolesSchema>['data'][number];
type Perm = z.infer<typeof adminPermissionsSchema>['data'][number];
type Staff = z.infer<typeof adminUsersSchema>['data'][number];
type Row = {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  count: number | null;
  role?: Role;
  perm?: Perm;
};
type Detail = { kind: 'role'; role: Role } | { kind: 'permission'; permission: Perm } | null;
const emptyRoles: Role[] = [];
const emptyPermissions: Perm[] = [];
const emptyStaff: Staff[] = [];

export default function RolesPage() {
  const access = useStaffAccess();
  const canUpdateRoles = hasStaffPermission(access, adminPagePermission('roles', 'update'));
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [roles, setRoles] = useState<LoadState<Role[]>>({ status: 'loading' });
  const [permissions, setPermissions] = useState<LoadState<Perm[]>>({ status: 'loading' });
  const [staff, setStaff] = useState<LoadState<Staff[]>>({ status: 'loading' });
  const [tab, setTab] = useState<'roles' | 'permissions'>('permissions');
  const [matrixRoleId, setMatrixRoleId] = useState('');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('Tümü');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [detail, setDetail] = useState<Detail>(null);
  const [staffId, setStaffId] = useState('');
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const confirmRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const client = createAdminClient();
    const [roleResult, permissionResult, staffResult] = await Promise.allSettled([
      client.request({ path: 'admin/roles', schema: adminRolesSchema }),
      client.request({ path: 'admin/permissions', schema: adminPermissionsSchema }),
      client.request({ path: 'admin/users', schema: adminUsersSchema }),
    ]);
    setRoles(
      roleResult.status === 'fulfilled'
        ? roleResult.value.data.length
          ? { status: 'ready', data: roleResult.value.data }
          : { status: 'empty' }
        : { status: 'error', error: roleResult.reason },
    );
    if (roleResult.status === 'fulfilled') {
      setMatrixRoleId((current) =>
        roleResult.value.data.some((role) => role.id === current)
          ? current
          : (roleResult.value.data.find((role) => role.code === 'BRANCH_ADMIN')?.id ??
            roleResult.value.data[0]?.id ??
            ''),
      );
    }
    setPermissions(
      permissionResult.status === 'fulfilled'
        ? permissionResult.value.data.length
          ? { status: 'ready', data: permissionResult.value.data }
          : { status: 'empty' }
        : { status: 'error', error: permissionResult.reason },
    );
    setStaff(
      staffResult.status === 'fulfilled'
        ? staffResult.value.data.length
          ? { status: 'ready', data: staffResult.value.data }
          : { status: 'empty' }
        : { status: 'error', error: staffResult.reason },
    );
    if (roleResult.status === 'fulfilled' && permissionResult.status === 'fulfilled') markSynced();
    else markStale();
  }, [markStale, markSynced]);
  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);
  useDeferredLoad(() => void load(), [load]);

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
    if (!detail) return;
    dialogRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (confirmAssign) keepTabInsideDialog(event, confirmRef.current);
      else keepTabInsideDialog(event, dialogRef.current);
      if (event.key !== 'Escape' || busy) return;
      if (confirmAssign) setConfirmAssign(false);
      else {
        setDetail(null);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [detail, busy, confirmAssign]);
  useEffect(() => {
    if (!detail) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [detail]);
  useEffect(() => {
    if (confirmAssign) confirmRef.current?.focus();
  }, [confirmAssign]);

  const roleRows = roles.status === 'ready' ? roles.data : emptyRoles;
  const permissionRows = permissions.status === 'ready' ? permissions.data : emptyPermissions;
  const staffRows = staff.status === 'ready' ? staff.data : emptyStaff;
  const matrixRole = roleRows.find((role) => role.id === matrixRoleId) ?? null;
  const systemRoles = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'BRANCH_USER']
    .map((code) => roleRows.find((role) => role.code === code))
    .filter((role): role is Role => Boolean(role));
  const mappingComplete =
    roles.status === 'ready' && roleRows.every((role) => role.permissionCodes != null);
  const allRows = useMemo<Row[]>(
    () =>
      tab === 'roles'
        ? roleRows.map((role) => ({
            id: role.id,
            name: roleName(role),
            code: role.code,
            description: roleDescription(role),
            category: 'Rol',
            count: role.permissionCodes?.length ?? null,
            role,
          }))
        : permissionRows.map((perm) => ({
            id: perm.id ?? perm.code,
            name: permissionName(perm.code),
            code: perm.code,
            description: permissionKind(perm.code),
            category: permissionArea(perm.code),
            count: mappingComplete
              ? roleRows.filter((role) => role.permissionCodes?.includes(perm.code)).length
              : null,
            perm,
          })),
    [tab, roleRows, permissionRows, mappingComplete],
  );
  const areas = useMemo(
    () =>
      [...new Set(permissionRows.map((perm) => permissionArea(perm.code)))].sort((a, b) =>
        a.localeCompare(b, 'tr'),
      ),
    [permissionRows],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return allRows.filter(
      (row) =>
        (tab === 'roles' || area === 'Tümü' || row.category === area) &&
        (!needle ||
          [row.name, row.code, row.description, row.category].some((value) =>
            value.toLocaleLowerCase('tr-TR').includes(needle),
          )),
    );
  }, [allRows, query, area, tab]);
  const activeState = tab === 'roles' ? roles : permissions;

  const openDetail = useCallback((row: Row) => {
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
    setFormError(null);
    setStaffId('');
    setConfirmAssign(false);
    if (row.role) setDetail({ kind: 'role', role: row.role });
    else if (row.perm) setDetail({ kind: 'permission', permission: row.perm });
  }, []);
  const openRoleDetail = useCallback((role: Role) => {
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
    setFormError(null);
    setStaffId('');
    setConfirmAssign(false);
    setDetail({ kind: 'role', role });
  }, []);
  function closeDetail() {
    if (busy) return;
    setDetail(null);
    setConfirmAssign(false);
    setFormError(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }
  async function assign() {
    if (detail?.kind !== 'role') return;
    if (detail.role.permissionCodes == null) {
      setFormError('Rolün izinleri yüklenmeden erişim ataması yapılamaz.');
      setConfirmAssign(false);
      return;
    }
    const person = staffRows.find((row) => row.id === staffId);
    if (
      !person ||
      !canAssignRole({
        userId: person.id,
        roleId: detail.role.id,
        existingRoleCodes: person.roleCodes,
        roleCode: detail.role.code,
      })
    ) {
      setFormError('Geçerli ve henüz atanmamış bir personel seçin.');
      setConfirmAssign(false);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/users/${person.id}/roles`,
        body: { roleId: detail.role.id },
        schema: adminRoleAssignSchema,
      });
      setFlash(
        `${person.displayName || person.primaryIdentifier || 'Personel'} için ${roleName(detail.role)} rolü atandı.`,
      );
      setConfirmAssign(false);
      setStaffId('');
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
      setConfirmAssign(false);
    } finally {
      setBusy(false);
    }
  }

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: tab === 'roles' ? 'Rol' : 'İzin',
        cell: ({ row }) => (
          <button
            className={base.nameButton}
            type="button"
            onClick={() => openDetail(row.original)}
          >
            <span className={base.nameMark}>
              <OpsIcon name={tab === 'roles' ? 'shield_person' : 'key'} />
            </span>
            <span>
              <strong>{row.original.name}</strong>
              <small>{row.original.code}</small>
            </span>
          </button>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: tab === 'roles' ? 'Tür' : 'Alan',
        cell: ({ row }) => <span className={styles.area}>{row.original.category}</span>,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: tab === 'roles' ? 'Açıklama' : 'İşlem türü',
        cell: ({ row }) => <span className={styles.description}>{row.original.description}</span>,
      },
      {
        id: 'count',
        accessorFn: (row) => row.count ?? -1,
        header: tab === 'roles' ? 'İzin' : 'Rol',
        cell: ({ row }) => (
          <span className={styles.count}>
            {row.original.count === null ? 'Bilinmiyor' : row.original.count}
          </span>
        ),
      },
      {
        id: 'action',
        header: 'İşlem',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button className={base.rowAction} type="button" onClick={() => openDetail(row.original)}>
            İncele <OpsIcon name="arrow_outward" />
          </button>
        ),
      },
    ],
    [tab, openDetail],
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
  const role = detail?.kind === 'role' ? detail.role : null;
  const permission = detail?.kind === 'permission' ? detail.permission : null;
  const associated = role ? staffRows.filter((row) => row.roleCodes?.includes(role.code)) : [];
  const selectedPerson = staffRows.find((row) => row.id === staffId);
  const availableStaff = role ? staffRows.filter((row) => !row.roleCodes?.includes(role.code)) : [];
  const linkedRoles = permission
    ? roleRows.filter((row) => row.permissionCodes?.includes(permission.code))
    : [];

  return (
    <main className={`${base.page} ${styles.rolesPage}`}>
      <header className={`${base.pageHeader} ${styles.rolesHeader}`}>
        <div>
          <div className={`${base.breadcrumb} ${styles.rolesBreadcrumb}`}>
            YÖNETİM <span>/</span> ERİŞİM KONTROLÜ
          </div>
          <h1>Roller ve izinler</h1>
          <p>Şube sınırlarını, sayfa erişimlerini ve işlem izinlerini tek yerde inceleyin.</p>
        </div>
        <span className={styles.catalogMark}>
          <OpsIcon name="verified_user" /> Tanımlı rol kataloğu
        </span>
      </header>
      {flash && (
        <div className={base.flash} role="status">
          <OpsIcon name="check_circle" />
          {flash}
          <button type="button" aria-label="Bildirimi kapat" onClick={() => setFlash(null)}>
            ×
          </button>
        </div>
      )}
      <section className={styles.accessModel} aria-labelledby="access-model-title">
        <div className={styles.modelIntro}>
          <span className={styles.modelGlyph} aria-hidden="true">
            <OpsIcon name="shield_lock" />
          </span>
          <div className={styles.modelCopy}>
            <span className={styles.modelKicker}>Şube bazlı erişim</span>
            <h2 id="access-model-title">Erişim, görev ve şube sınırına göre verilir.</h2>
            <p>
              Rol temel kapsamı belirler. Menüdeki her sayfa ve desteklenen işlem, kişi bazında
              ayrıca açılıp kapatılabilir.
            </p>
          </div>
          <div className={styles.modelStats} aria-label="Yetki kataloğu özeti">
            <div>
              <strong>{roleRows.length || '—'}</strong>
              <span>Rol</span>
            </div>
            <div>
              <strong>{ACCESS_PAGE_MATRIX.length}</strong>
              <span>Yönetim sayfası</span>
            </div>
            <div>
              <strong>{permissionRows.length || '—'}</strong>
              <span>İzin kodu</span>
            </div>
          </div>
        </div>

        <div className={styles.roleCards} aria-label="Sistem rolleri">
          {systemRoles.map((item) => {
            const selected = matrixRoleId === item.id;
            const peopleCount = staffRows.filter((person) =>
              person.roleCodes?.includes(item.code),
            ).length;
            const scopeLabel =
              item.code === 'SUPER_ADMIN'
                ? 'Tüm şubeler'
                : item.code === 'BRANCH_ADMIN'
                  ? 'Şube başına tek yönetici'
                  : 'Tek şube';
            return (
              <article
                className={`${styles.roleCard} ${selected ? styles.roleCardSelected : ''}`}
                key={item.id}
              >
                <button
                  className={styles.roleCardMain}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMatrixRoleId(item.id)}
                >
                  <span className={styles.roleCardIcon} aria-hidden="true">
                    <OpsIcon
                      name={
                        item.code === 'SUPER_ADMIN'
                          ? 'public'
                          : item.code === 'BRANCH_ADMIN'
                            ? 'storefront'
                            : 'badge'
                      }
                    />
                  </span>
                  <span className={styles.roleCardText}>
                    <strong>{roleName(item)}</strong>
                    <small>{scopeLabel}</small>
                  </span>
                  <span className={styles.roleCardCount}>
                    {staff.status === 'ready' ? peopleCount : '—'}
                    <small>personel</small>
                  </span>
                  <span className={styles.roleCardDescription}>{roleDescription(item)}</span>
                </button>
                <button
                  className={styles.roleCardOpen}
                  type="button"
                  onClick={() => openRoleDetail(item)}
                >
                  Ayrıntı ve atama <OpsIcon name="arrow_outward" />
                </button>
              </article>
            );
          })}
        </div>

        <section className={styles.matrixPanel} aria-labelledby="permission-matrix-title">
          <div className={styles.matrixHeader}>
            <div>
              <span className={styles.modelKicker}>Rolün başlangıç erişimi</span>
              <h3 id="permission-matrix-title">Sayfa ve işlem matrisi</h3>
              <p>Bir rol seçin; o rol için tanımlanmış menü ve işlem izinlerini görün.</p>
            </div>
            <label className={styles.matrixSelect}>
              <span>İncelenen rol</span>
              <select
                value={matrixRoleId}
                onChange={(event) => setMatrixRoleId(event.target.value)}
                disabled={!systemRoles.length}
              >
                {systemRoles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {roleName(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.matrixScroll}>
            <table className={styles.matrixTable} aria-label="Rol sayfa ve işlem izinleri">
              <thead>
                <tr>
                  <th scope="col">Yönetim sayfası</th>
                  {(['view', 'create', 'update', 'delete'] as const).map((action) => (
                    <th scope="col" key={action}>
                      {action === 'view'
                        ? 'Görüntüle'
                        : action === 'create'
                          ? 'Ekle'
                          : action === 'update'
                            ? 'Güncelle'
                            : 'Sil'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACCESS_PAGE_MATRIX.map((page) => (
                  <tr key={page.key}>
                    <th scope="row">{page.name}</th>
                    {(['view', 'create', 'update', 'delete'] as const).map((action) => {
                      const grant = page.actions.find((item) => item.action === action);
                      if (!grant) {
                        return (
                          <td key={action}>
                            <span className={styles.matrixUnsupported} aria-label="Desteklenmiyor">
                              —
                            </span>
                          </td>
                        );
                      }
                      const isAllowed = matrixRole?.permissionCodes?.includes(grant.code) ?? false;
                      const unknown = matrixRole?.permissionCodes == null;
                      return (
                        <td key={action}>
                          <span
                            className={`${styles.matrixGrant} ${unknown ? styles.matrixUnknown : isAllowed ? styles.matrixAllowed : styles.matrixDenied}`}
                            aria-label={unknown ? 'Bilinmiyor' : isAllowed ? 'İzinli' : 'İzin yok'}
                          >
                            {unknown ? '…' : isAllowed ? '✓' : '–'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.matrixNote}>
            <OpsIcon name="info" />
            Bu matris rolün temel izinlerini gösterir. Kişiye özel izinler Kullanıcılar sayfasında
            düzenlenir; şube sınırları sunucu tarafında uygulanır.
          </p>
        </section>
      </section>
      <section className={base.gridPanel} aria-label="Rol ve izin kataloğu">
        <div className={base.gridHeader}>
          <div>
            <span className={base.eyebrow}>ERİŞİM YÖNETİMİ</span>
            <h2>{tab === 'roles' ? 'Roller' : 'İzin kataloğu'}</h2>
            <p>
              {activeState.status === 'ready'
                ? `${allRows.length} kayıt görüntüleniyor`
                : 'Yetki kayıtları'}
            </p>
          </div>
          <div className={base.gridTools}>
            <label className={base.search}>
              <OpsIcon name="search" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder={tab === 'roles' ? 'Rol adı veya kod ara' : 'İzin veya alan ara'}
                aria-label={tab === 'roles' ? 'Rol ara' : 'İzin ara'}
              />
              {query && (
                <button type="button" aria-label="Aramayı temizle" onClick={() => setQuery('')}>
                  ×
                </button>
              )}
            </label>
            <div className={base.columnMenu} ref={menuRef}>
              <button
                className={base.toolButton}
                type="button"
                aria-expanded={columnsOpen}
                onClick={() => setColumnsOpen((open) => !open)}
              >
                <OpsIcon name="view_column" /> Sütunlar
              </button>
              {columnsOpen && (
                <div className={base.columnMenuPanel}>
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
              className={base.toolButton}
              type="button"
              onClick={() => void load()}
              aria-label="Yetki kayıtlarını yenile"
            >
              <OpsIcon name="refresh" />
            </button>
          </div>
        </div>
        <div className={base.filters}>
          <div className={base.segmented} aria-label="Katalog bölümü">
            <button
              className={tab === 'roles' ? base.filterActive : base.filterButton}
              type="button"
              aria-pressed={tab === 'roles'}
              onClick={() => {
                setTab('roles');
                setSorting([{ id: 'name', desc: false }]);
                table.setPageIndex(0);
              }}
            >
              Roller
            </button>
            <button
              className={tab === 'permissions' ? base.filterActive : base.filterButton}
              type="button"
              aria-pressed={tab === 'permissions'}
              onClick={() => {
                setTab('permissions');
                setSorting([{ id: 'name', desc: false }]);
                table.setPageIndex(0);
              }}
            >
              İzin kataloğu
            </button>
          </div>
          {tab === 'permissions' && (
            <>
              <span className={base.filterDivider} />
              <label className={base.selectLabel}>
                Alan{' '}
                <select
                  value={area}
                  onChange={(event) => {
                    setArea(event.target.value);
                    table.setPageIndex(0);
                  }}
                >
                  <option>Tümü</option>
                  {areas.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <span className={styles.scopeNote}>
            Sistem rolleri atanır; yeni rol tanımı bu ekranda kapalıdır.
          </span>
        </div>
        {activeState.status === 'loading' ? (
          <div className={base.statePanel} role="status">
            <OpsIcon name="progress_activity" />
            <strong>Katalog yükleniyor</strong>
          </div>
        ) : activeState.status === 'error' ? (
          <div className={base.statePanel} role="alert">
            <OpsIcon name="error" />
            <strong>Katalog alınamadı</strong>
            <span>{errorMessage(activeState.error)}</span>
            <button type="button" onClick={() => void load()}>
              Tekrar dene
            </button>
          </div>
        ) : activeState.status === 'empty' ? (
          <div className={base.statePanel}>
            <OpsIcon name="shield" />
            <strong>Henüz kayıt yok</strong>
          </div>
        ) : !filtered.length ? (
          <div className={base.statePanel}>
            <OpsIcon name="filter_alt_off" />
            <strong>Sonuç bulunamadı</strong>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setArea('Tümü');
              }}
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div className={base.tableScroll}>
            <table
              className={base.table}
              aria-label={tab === 'roles' ? 'Roller veri tablosu' : 'İzinler veri tablosu'}
            >
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id} scope="col">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className={base.sortButton}
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
        <div className={base.gridFooter}>
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
      {detail && (
        <div
          className={base.overlay}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <section
            className={base.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-dialog-title"
            tabIndex={-1}
            ref={dialogRef}
          >
            <div className={base.dialogHeader}>
              <div>
                <span className={base.eyebrow}>{role ? 'ROL AYRINTISI' : 'İZİN AYRINTISI'}</span>
                <h2 id="role-dialog-title">
                  {role ? roleName(role) : permission ? permissionName(permission.code) : ''}
                </h2>
                <p>
                  {role ? roleDescription(role) : permission ? permissionArea(permission.code) : ''}
                </p>
              </div>
              <button
                className={base.closeButton}
                type="button"
                onClick={closeDetail}
                aria-label="Pencereyi kapat"
              >
                <OpsIcon name="close" />
              </button>
            </div>
            <div className={base.dialogBody}>
              {role ? (
                <>
                  <div className={styles.hero}>
                    <div>
                      <span className={base.eyebrow}>ROL KODU</span>
                      <strong>{role.code}</strong>
                      <small>
                        {role.permissionCodes === null || role.permissionCodes === undefined
                          ? 'İzin eşleşmesi alınamadı'
                          : `${role.permissionCodes.length} izin tanımlı`}
                      </small>
                    </div>
                    <OpsIcon name="admin_panel_settings" />
                  </div>
                  <div className={base.sectionTitle}>
                    <span>01</span>
                    <div>
                      <strong>Tanımlı izinler</strong>
                      <small>Bu role bağlı gerçek erişimler</small>
                    </div>
                  </div>
                  {role.permissionCodes == null ? (
                    <p className={base.note}>Bu ortamda rol ve izin eşleşmesi sağlanmıyor.</p>
                  ) : role.permissionCodes.length ? (
                    <div className={styles.permissionList}>
                      {role.permissionCodes.map((code) => (
                        <div key={code}>
                          <span>
                            <strong>{permissionName(code)}</strong>
                            <small>{code}</small>
                          </span>
                          <em>{permissionArea(code)}</em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={base.note}>Bu role izin bağlanmamış.</p>
                  )}
                  <div className={base.sectionTitle}>
                    <span>02</span>
                    <div>
                      <strong>Personel atamaları</strong>
                      <small>Listelenen son 50 personel içindeki eşleşmeler</small>
                    </div>
                  </div>
                  {staff.status === 'error' ? (
                    <p className={base.formError}>
                      Personel alınamadı: {errorMessage(staff.error)}
                    </p>
                  ) : associated.length ? (
                    <div className={styles.staffList}>
                      {associated.map((person) => (
                        <div key={person.id}>
                          <strong>
                            {person.displayName || person.primaryIdentifier || 'İsimsiz personel'}
                          </strong>
                          <small>{person.primaryIdentifier ?? person.id}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={base.note}>
                      Getirilen personel kayıtlarında bu rolü taşıyan biri yok.
                    </p>
                  )}
                  <div className={base.sectionTitle}>
                    <span>03</span>
                    <div>
                      <strong>Rol ata</strong>
                      <small>Mevcut bir personele bu rolün erişimlerini verin</small>
                    </div>
                  </div>
                  <div className={styles.assignRow}>
                    <label className={base.field}>
                      Personel seçin
                      <select
                        value={staffId}
                        onChange={(event) => setStaffId(event.target.value)}
                        disabled={!canUpdateRoles || staff.status !== 'ready'}
                      >
                        <option value="">Personel seçin</option>
                        {availableStaff.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.displayName || person.primaryIdentifier || person.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className={base.primaryButton}
                      type="button"
                      disabled={!canUpdateRoles || !staffId || busy || role.permissionCodes == null}
                      onClick={() => setConfirmAssign(true)}
                    >
                      Rol ata
                    </button>
                  </div>
                  <p className={base.note}>
                    <OpsIcon name="info" /> Rol ataması erişim yetkisi verir. Atamayı kullanıcı
                    yönetimi sayfasından kaldırabilirsiniz.
                  </p>
                  {role.permissionCodes == null && (
                    <p className={base.note}>İzin eşleşmesi yüklenince atama açılır.</p>
                  )}
                </>
              ) : permission ? (
                <>
                  <div className={styles.hero}>
                    <div>
                      <span className={base.eyebrow}>İZİN KODU</span>
                      <strong>{permission.code}</strong>
                      <small>{permissionKind(permission.code)}</small>
                    </div>
                    <OpsIcon name="key" />
                  </div>
                  <div className={base.detailGrid}>
                    <div>
                      <span>İzin adı</span>
                      <strong>{permissionName(permission.code)}</strong>
                    </div>
                    <div>
                      <span>Alan</span>
                      <strong>{permissionArea(permission.code)}</strong>
                    </div>
                    <div>
                      <span>İşlem türü</span>
                      <strong>{permissionKind(permission.code)}</strong>
                    </div>
                    <div>
                      <span>Bağlı rol sayısı</span>
                      <strong>{mappingComplete ? linkedRoles.length : 'Bilinmiyor'}</strong>
                    </div>
                  </div>
                  <div className={base.sectionTitle}>
                    <span>↗</span>
                    <div>
                      <strong>Bu izni taşıyan roller</strong>
                      <small>Rol–izin eşleşmelerine göre</small>
                    </div>
                  </div>
                  {!mappingComplete ? (
                    <p className={base.note}>Rol ve izin eşleşmesi bu ortamda alınamadı.</p>
                  ) : linkedRoles.length ? (
                    <div className={base.branchTags}>
                      {linkedRoles.map((item) => (
                        <span key={item.id}>{roleName(item)}</span>
                      ))}
                    </div>
                  ) : (
                    <p className={base.note}>Getirilen rollerde bu izin eşleşmedi.</p>
                  )}
                </>
              ) : null}
              {formError && (
                <p className={base.formError} role="alert">
                  {formError}
                </p>
              )}
            </div>
            <div className={base.dialogFooter}>
              <button
                className={base.secondaryButton}
                type="button"
                onClick={closeDetail}
                disabled={busy}
              >
                Kapat
              </button>
            </div>
          </section>
        </div>
      )}
      {confirmAssign && role && selectedPerson && (
        <div className={base.confirmOverlay}>
          <section
            className={base.confirm}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="role-confirm-title"
            aria-describedby="role-confirm-body"
            tabIndex={-1}
            ref={confirmRef}
          >
            <span className={styles.confirmIcon}>
              <OpsIcon name="security" />
            </span>
            <h2 id="role-confirm-title">Erişim rolü ata</h2>
            <p id="role-confirm-body">
              <strong>
                {selectedPerson.displayName ||
                  selectedPerson.primaryIdentifier ||
                  selectedPerson.id}
              </strong>{' '}
              adlı personele <strong>{roleName(role)}</strong> rolünü atamak üzeresiniz. Bu rolün
              tüm tanımlı izinleri personele verilir.
            </p>
            <div>
              <button
                className={base.secondaryButton}
                type="button"
                disabled={busy}
                onClick={() => setConfirmAssign(false)}
              >
                Vazgeç
              </button>
              <button
                className={base.primaryButton}
                type="button"
                disabled={busy || !canUpdateRoles}
                onClick={() => void assign()}
              >
                {busy ? 'Atanıyor…' : 'Erişimi onayla'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
