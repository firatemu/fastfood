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
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../components/async-boundary';
import { ConfirmDialog } from '../../components/ops/confirm-dialog';
import { OpsBoundary } from '../../components/ops/ops-boundary';
import { OpsIcon } from '../../components/ops/ops-icon';
import { useOpsSync } from '../../components/ops/ops-sync';
import { hasStaffPermission, useStaffAccess } from '../../components/ops/staff-access-context';
import { canAssignRole } from '../../lib/access-ops';
import { createAdminClient, getStaffUserId } from '../../lib/api';
import { accountStatusLabel, accountStatusTone } from '../../lib/finance-ops';
import { shortId } from '../../lib/ops-time';
import {
  adminBranchesSchema,
  adminPermissionsSchema,
  adminRoleAssignSchema,
  adminRolesSchema,
  adminUsersSchema,
  staffVerificationLinkSchema,
  staffUserMutationSchema,
} from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './users.module.css';

type User = z.infer<typeof adminUsersSchema>['data'][number];
type Role = z.infer<typeof adminRolesSchema>['data'][number];
type Branch = z.infer<typeof adminBranchesSchema>['data'][number];
type Permission = z.infer<typeof adminPermissionsSchema>['data'][number];

const emptyUsers: User[] = [];
const emptyRoles: Role[] = [];
const emptyBranches: Branch[] = [];
const emptyPermissions: Permission[] = [];
const pageSizes = [10, 20, 50];
const permissionPageLabels: Record<string, string> = {
  dashboard: 'Genel Bakış',
  orders: 'Siparişler',
  kitchen: 'Mutfak',
  couriers: 'Kurye ve teslimat',
  'catalog.products': 'Ürünler',
  'catalog.categories': 'Kategoriler',
  'catalog.modifiers': 'Modifiye grupları',
  'catalog.allergens': 'Alerjenler',
  'catalog.media': 'Medya',
  branches: 'Şubeler',
  'branches.service_areas': 'Servis alanları',
  'branches.availability': 'Ürün müsaitliği',
  customers: 'Müşteriler',
  loyalty: 'Sadakat',
  promotions: 'Promosyonlar',
  payments: 'Ödemeler',
  refunds: 'İadeler',
  reports: 'Raporlar',
  users: 'Kullanıcılar',
  roles: 'Roller',
  audit: 'Denetim kaydı',
  settings: 'Ayarlar',
};
const permissionActionLabels: Record<string, string> = {
  view: 'Görüntüle',
  create: 'Ekle',
  update: 'Güncelle',
  delete: 'Sil',
};
const specialPermissionLabels: Record<string, string> = {
  'catalog.products.read': 'Katalog verilerini oku',
  'catalog.products.write': 'Ürün/kategori içeriğini düzenle',
  'catalog.prices.write': 'Merkezi fiyatları düzenle',
  'catalog.media.write': 'Ürün medyalarını yönet',
  'branches.read': 'Şube bilgilerini görüntüle',
  'branches.write': 'Şube bilgilerini düzenle',
  'branches.service_areas.write': 'Servis alanlarını ve müsaitliği güncelle',
  'orders.read': 'Siparişleri görüntüle',
  'orders.update_status': 'Sipariş durumunu ilerlet',
  'orders.reassign_branch': 'Siparişi başka şubeye aktar',
  'payments.read': 'Ödemeleri görüntüle',
  'payments.refund': 'İade başlat',
  'loyalty.read': 'Sadakat bilgilerini görüntüle',
  'loyalty.settings.write': 'Sadakat ayarlarını değiştir',
  'customers.read': 'Müşteri bilgilerini görüntüle',
  'promotions.read': 'Promosyonları görüntüle',
  'promotions.write': 'Promosyonları düzenle',
  'reports.read': 'Raporları görüntüle',
  'couriers.read': 'Kurye bilgilerini görüntüle',
  'couriers.assign': 'Teslimat ata',
  'couriers.write': 'Kurye hesabını düzenle',
  'audit.read': 'Denetim kayıtlarını görüntüle',
  'users.read': 'Personel hesaplarını görüntüle',
  'users.write': 'Personel hesaplarını yönet',
  'users.branch_admin.assign': 'Şube yöneticisi ata veya devret',
  'settings.read': 'Sistem ayarlarını görüntüle',
  'settings.write': 'Sistem ayarlarını değiştir',
};
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Süper yönetici',
  BRANCH_ADMIN: 'Şube yöneticisi',
  BRANCH_USER: 'Şube personeli',
  COURIER: 'Kurye',
};
const actorTypeLabels: Record<string, string> = {
  STAFF: 'Personel',
  COURIER: 'Kurye',
  CUSTOMER: 'Müşteri',
};

function roleTitle(code: string): string {
  return roleLabels[code] ?? 'Diğer rol';
}

function actorTypeTitle(actorType: string | null | undefined): string {
  return actorType ? (actorTypeLabels[actorType] ?? 'Personel') : 'Personel';
}

function staffStatusTitle(status: string | null | undefined): string {
  if (!status) return 'Bilinmiyor';
  const label = accountStatusLabel(status);
  return label === status ? 'Bilinmiyor' : label;
}

function permissionTitle(permission: Permission): string {
  const special = specialPermissionLabels[permission.code];
  if (special) return special;
  if (permission.code.startsWith('admin.page.')) {
    const parts = permission.code.split('.');
    const action = parts.at(-1) ?? '';
    return permissionActionLabels[action] ?? 'Erişim';
  }
  return 'Özel işlem izni';
}

function initials(user: User) {
  const name = user.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.length > 1
      ? `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toLocaleUpperCase('tr-TR')
      : name.slice(0, 2).toLocaleUpperCase('tr-TR');
  }
  return (user.primaryIdentifier?.slice(0, 2) ?? 'US').toLocaleUpperCase('tr-TR');
}

function sortValue(value: string | null | undefined) {
  return (value ?? '').toLocaleLowerCase('tr-TR');
}

export default function UsersPage() {
  'use no memo';
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const access = useStaffAccess();
  const [state, setState] = useState<LoadState<User[]>>({ status: 'loading' });
  const [rolesState, setRolesState] = useState<LoadState<Role[]>>({ status: 'loading' });
  const [branchesState, setBranchesState] = useState<LoadState<Branch[]>>({ status: 'loading' });
  const [permissionsState, setPermissionsState] = useState<LoadState<Permission[]>>({
    status: 'loading',
  });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const generatedLinkDialogRef = useRef<HTMLDialogElement>(null);
  const generatedLinkCloseRef = useRef<HTMLButtonElement>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayName', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { kind: 'assign' }
    | { kind: 'revoke'; user: User; role: Role }
    | { kind: 'status'; user: User; status: 'ACTIVE' | 'DISABLED' }
    | { kind: 'branches'; user: User }
    | { kind: 'password-reset'; user: User }
    | null
  >(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserDraft, setCreateUserDraft] = useState({
    email: '',
    displayName: '',
    password: '',
    passwordConfirmation: '',
    roleIds: [] as string[],
    branchIds: [] as string[],
    permissionCodes: [] as string[],
  });
  const [generatedLink, setGeneratedLink] = useState<{ url: string; label: string } | null>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [staffPasswordDraft, setStaffPasswordDraft] = useState('');
  const [staffPasswordConfirmation, setStaffPasswordConfirmation] = useState('');
  const [branchDraft, setBranchDraft] = useState('');
  const [permissionDraft, setPermissionDraft] = useState<string[]>([]);
  const canCreateUser = hasStaffPermission(access, adminPagePermission('users', 'create'));
  const canManageUsers = hasStaffPermission(access, adminPagePermission('users', 'update'));

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    setRolesState({ status: 'loading' });
    setPermissionsState({ status: 'loading' });
    const client = createAdminClient();
    const [usersResult, rolesResult, branchesResult, permissionsResult] = await Promise.allSettled([
      client.request({ path: 'admin/users', schema: adminUsersSchema }),
      client.request({ path: 'admin/roles', schema: adminRolesSchema }),
      client.request({ path: 'admin/branches', schema: adminBranchesSchema }),
      client.request({ path: 'admin/permissions', schema: adminPermissionsSchema }),
    ]);

    if (usersResult.status === 'fulfilled') {
      const users = usersResult.value.data;
      setState(users.length ? { status: 'ready', data: users } : { status: 'empty' });
      setSelectedId((current) =>
        current && users.some((user) => user.id === current) ? current : null,
      );
    } else {
      setState({ status: 'error', error: usersResult.reason });
    }

    if (rolesResult.status === 'fulfilled') {
      const roles = rolesResult.value.data;
      setRolesState(roles.length ? { status: 'ready', data: roles } : { status: 'empty' });
      const grantableRoles = access.isSuperAdmin
        ? roles
        : roles.filter((role) => role.code === 'BRANCH_USER');
      setSelectedRoleId((current) =>
        grantableRoles.some((role) => role.id === current) ? current : grantableRoles[0]?.id || '',
      );
    } else {
      setRolesState({ status: 'error', error: rolesResult.reason });
    }

    if (branchesResult.status === 'fulfilled') {
      const branches = branchesResult.value.data.filter(
        (branch) =>
          (branch.isActive !== false && branch.status !== 'INACTIVE') ||
          (access.isSuperAdmin && !branch.administrator),
      );
      setBranchesState(branches.length ? { status: 'ready', data: branches } : { status: 'empty' });
    } else if (!access.isSuperAdmin && access.branchIds[0]) {
      setBranchesState({
        status: 'ready',
        data: [{ id: access.branchIds[0], name: 'Atanmış şube' }],
      });
    } else {
      setBranchesState({ status: 'error', error: branchesResult.reason });
    }

    if (permissionsResult.status === 'fulfilled') {
      const permissions = permissionsResult.value.data;
      setPermissionsState(
        permissions.length ? { status: 'ready', data: permissions } : { status: 'empty' },
      );
    } else {
      setPermissionsState({ status: 'error', error: permissionsResult.reason });
    }

    if (usersResult.status === 'fulfilled' && rolesResult.status === 'fulfilled') markSynced();
    else markStale();
  }, [access, markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);
  useDeferredLoad(() => void load(), [load]);

  const users = state.status === 'ready' ? state.data : emptyUsers;
  const roles = rolesState.status === 'ready' ? rolesState.data : emptyRoles;
  const branches = branchesState.status === 'ready' ? branchesState.data : emptyBranches;
  const permissions =
    permissionsState.status === 'ready' ? permissionsState.data : emptyPermissions;
  const grantableRoles = useMemo(
    () => (access.isSuperAdmin ? roles : roles.filter((role) => role.code === 'BRANCH_USER')),
    [access.isSuperAdmin, roles],
  );
  const selectedUser = users.find((user) => user.id === selectedId) ?? null;
  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const newUserRoleCodes = roles
    .filter((role) => createUserDraft.roleIds.includes(role.id))
    .map((role) => role.code);
  const newUserIsSuperAdmin = newUserRoleCodes.includes('SUPER_ADMIN');
  const newUserIsBranchAdmin = newUserRoleCodes.includes('BRANCH_ADMIN');
  const availableUserBranches = branches.filter((branch) =>
    newUserIsBranchAdmin ? access.isSuperAdmin && !branch.administrator : branch.isActive !== false,
  );
  const sessionUserId = getStaffUserId();
  const accessScopeLabel = access.isSuperAdmin
    ? 'Tüm şubeler'
    : (branches.find((branch) => branch.id === access.branchIds[0])?.name ?? 'Atanmış şube');
  const activeCount = users.filter((user) => user.status === 'ACTIVE').length;
  const disabledCount = users.filter((user) => user.status === 'DISABLED').length;
  const setupPendingCount = users.filter((user) => user.status === 'PENDING_VERIFICATION').length;

  useEffect(() => {
    if (!selectedUser) return;
    setDisplayNameDraft(selectedUser.displayName ?? '');
    setEmailDraft('');
    setBranchDraft(selectedUser.branchScopes?.[0]?.branchId ?? '');
    setPermissionDraft(selectedUser.permissionCodes ?? []);
    setStaffPasswordDraft('');
    setStaffPasswordConfirmation('');
  }, [selectedUser]);

  useEffect(() => {
    const dialog = detailDialogRef.current;
    if (!dialog) return;
    if (selectedUser && !dialog.open) {
      dialog.showModal();
      detailCloseRef.current?.focus();
    } else if (!selectedUser && dialog.open) {
      dialog.close();
    }
  }, [selectedUser]);

  useEffect(() => {
    const dialog = generatedLinkDialogRef.current;
    if (!dialog) return;
    if (generatedLink && !dialog.open) {
      dialog.showModal();
      generatedLinkCloseRef.current?.focus();
    } else if (!generatedLink && dialog.open) {
      dialog.close();
    }
  }, [generatedLink]);

  function closeDetailDialog() {
    if (detailDialogRef.current?.open) detailDialogRef.current.close();
    else setSelectedId(null);
  }

  function closeCreateUserForm() {
    if (busy) return;
    setCreateUserOpen(false);
    setFormError(null);
    setCreateUserDraft({
      email: '',
      displayName: '',
      password: '',
      passwordConfirmation: '',
      roleIds: [],
      branchIds: [],
      permissionCodes: [],
    });
  }

  function closeGeneratedLinkDialog() {
    if (generatedLinkDialogRef.current?.open) generatedLinkDialogRef.current.close();
    else setGeneratedLink(null);
  }

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'displayName',
        accessorFn: (user) => sortValue(user.displayName ?? user.primaryIdentifier),
        header: 'Personel',
        cell: ({ row }) => {
          const user = row.original;
          const title = user.displayName || user.primaryIdentifier || shortId(user.id);
          return (
            <button
              type="button"
              className={styles.personButton}
              aria-label={`${title} kullanıcısının ayrıntılarını aç`}
              aria-pressed={selectedId === user.id}
              onClick={() => {
                setSelectedId(user.id);
                setFormError(null);
                setFlash(null);
              }}
            >
              <span className={styles.avatar} aria-hidden="true">
                {initials(user)}
              </span>
              <span className={styles.personCopy}>
                <strong>{title}</strong>
                <small>{actorTypeTitle(user.actorType)}</small>
              </span>
            </button>
          );
        },
      },
      {
        id: 'identifier',
        accessorFn: (user) => sortValue(user.primaryIdentifier),
        header: 'Giriş kimliği',
        cell: ({ row }) => (
          <span className={styles.identifier}>{row.original.primaryIdentifier ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: (user) => user.status ?? 'UNKNOWN',
        header: 'Hesap durumu',
        cell: ({ row }) => {
          const status = row.original.status ?? 'UNKNOWN';
          return (
            <span
              className={`${styles.status} ${styles[`status_${accountStatusTone(status)}`] ?? ''}`}
            >
              <span className={styles.statusDot} aria-hidden="true" />
              {staffStatusTitle(status)}
            </span>
          );
        },
      },
      {
        id: 'roles',
        accessorFn: (user) => (user.roleCodes ?? []).join(', '),
        header: 'Atanmış roller',
        cell: ({ row }) => {
          const codes = row.original.roleCodes ?? [];
          return codes.length ? (
            <span className={styles.roleList}>
              {codes.slice(0, 2).map((code) => (
                <span className={styles.roleTag} key={code}>
                  {roleTitle(code)}
                </span>
              ))}
              {codes.length > 2 ? (
                <span className={styles.roleMore}>+{codes.length - 2}</span>
              ) : null}
            </span>
          ) : (
            <span className={styles.muted}>Rol atanmamış</span>
          );
        },
      },
      {
        id: 'id',
        accessorFn: (user) => user.id,
        header: 'Kullanıcı ID',
        cell: ({ row }) => <span className={styles.shortId}>{shortId(row.original.id)}</span>,
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => <span className={styles.srOnly}>Ayrıntı</span>,
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.rowAction}
            aria-label={`${row.original.displayName ?? row.original.primaryIdentifier ?? 'Kullanıcı'} ayrıntıları`}
            onClick={() => {
              setSelectedId(row.original.id);
              setFormError(null);
              setFlash(null);
            }}
          >
            <OpsIcon name="chevron_right" />
          </button>
        ),
      },
    ],
    [selectedId],
  );

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return users.filter((user) => {
      const status = user.status ?? 'UNKNOWN';
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (!needle) return true;
      return [
        user.displayName,
        user.primaryIdentifier,
        user.id,
        user.actorType,
        ...(user.roleCodes ?? []),
      ].some((value) => (value ?? '').toLocaleLowerCase('tr-TR').includes(needle));
    });
  }, [users, query, statusFilter]);

  const selectedPermissionCodes = useMemo(() => {
    const byCode = new Map(permissions.map((permission) => [permission.code, permission]));
    for (const code of selectedUser?.permissionCodes ?? []) {
      if (!byCode.has(code)) byCode.set(code, { code, description: null });
    }
    return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [permissions, selectedUser]);

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of selectedPermissionCodes) {
      const group = permission.code.startsWith('admin.page.')
        ? `admin.page.${permission.code.split('.').slice(2, -1).join('.')}`
        : 'special';
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()].map(([key, rows]) => {
      const slug = key.startsWith('admin.page.') ? key.slice('admin.page.'.length) : '';
      return {
        key,
        label: slug
          ? (permissionPageLabels[slug] ?? 'Diğer sayfa izinleri')
          : 'Özel işlem izinleri',
        rows,
      };
    });
  }, [selectedPermissionCodes]);

  const newUserPermissionGroups = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const group = permission.code.startsWith('admin.page.')
        ? `admin.page.${permission.code.split('.').slice(2, -1).join('.')}`
        : 'special';
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()].map(([key, rows]) => {
      const slug = key.startsWith('admin.page.') ? key.slice('admin.page.'.length) : '';
      return {
        key,
        label: slug
          ? (permissionPageLabels[slug] ?? 'Diğer sayfa izinleri')
          : 'Özel işlem izinleri',
        rows,
      };
    });
  }, [permissions]);

  const permissionDraftChanged = selectedUser
    ? !selectedUser.customPermissionsEnabled ||
      [...permissionDraft].sort().join('|') !==
        [...(selectedUser.permissionCodes ?? [])].sort().join('|')
    : false;

  // TanStack returns a stateful table instance that React Compiler intentionally skips memoizing.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  async function assignRole() {
    if (!selectedUser || !selectedRole) return;
    if (
      !canAssignRole({
        userId: selectedUser.id,
        roleId: selectedRole.id,
        existingRoleCodes: selectedUser.roleCodes,
        roleCode: selectedRole.code,
      })
    ) {
      setFormError('Bu rol kullanıcıya zaten atanmış veya seçim geçersiz.');
      return;
    }
    setBusy(true);
    setFormError(null);
    setFlash(null);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/users/${selectedUser.id}/roles`,
        body: { roleId: selectedRole.id },
        schema: adminRoleAssignSchema,
      });
      setFlash(`${selectedRole.code} rolü kullanıcıya atandı.`);
      setPendingAction(null);
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
      setPendingAction(null);
    } finally {
      setBusy(false);
    }
  }

  async function createUser() {
    if (createUserDraft.password.length < 12 || createUserDraft.password.length > 256) {
      setFormError('Şifre 12 ile 256 karakter arasında olmalıdır.');
      return;
    }
    if (createUserDraft.password !== createUserDraft.passwordConfirmation) {
      setFormError('Şifre ve şifre tekrarı aynı olmalıdır.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const { email, displayName, password, roleIds, branchIds, permissionCodes } = createUserDraft;
      await createAdminClient().request({
        method: 'POST',
        path: 'admin/users',
        body: {
          email,
          displayName,
          password,
          roleIds,
          branchIds,
          ...((newUserRoleCodes.includes('BRANCH_ADMIN') || newUserIsSuperAdmin) &&
          permissionCodes.length === 0
            ? {}
            : { permissionCodes }),
        },
        schema: staffUserMutationSchema,
      });
      setCreateUserOpen(false);
      setCreateUserDraft({
        email: '',
        displayName: '',
        password: '',
        passwordConfirmation: '',
        roleIds: [],
        branchIds: [],
        permissionCodes: [],
      });
      setFlash('Kullanıcı hesabı oluşturuldu. Şifreyi personele güvenli kanaldan iletin.');
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function setStaffPassword(user: User) {
    if (staffPasswordDraft.length < 12 || staffPasswordDraft.length > 256) {
      setFormError('Şifre 12 ile 256 karakter arasında olmalıdır.');
      return;
    }
    if (staffPasswordDraft !== staffPasswordConfirmation) {
      setFormError('Şifre ve şifre tekrarı aynı olmalıdır.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/users/${user.id}/password`,
        body: { password: staffPasswordDraft },
        schema: staffUserMutationSchema,
      });
      setStaffPasswordDraft('');
      setStaffPasswordConfirmation('');
      setFlash('Şifre güncellendi; açık oturumlar kapatıldı.');
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function updateName() {
    if (!selectedUser) return;
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/users/${selectedUser.id}`,
        body: { displayName: displayNameDraft },
        schema: staffUserMutationSchema,
      });
      setFlash('Personel adı güncellendi.');
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function requestEmailChange() {
    if (!selectedUser || !emailDraft.trim()) return;
    setBusy(true);
    setFormError(null);
    try {
      const result = await createAdminClient().request({
        method: 'POST',
        path: `admin/users/${selectedUser.id}/email-change`,
        body: { email: emailDraft },
        schema: staffVerificationLinkSchema,
      });
      const url = `${window.location.origin}/invite/confirm-email?token=${encodeURIComponent(result.data.token)}`;
      setGeneratedLink({ url, label: 'E-posta doğrulama bağlantısı' });
      setFlash(
        'E-posta değişikliği doğrulama bekliyor. Eski adres değişiklik tamamlanana kadar geçerli.',
      );
      setEmailDraft('');
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function updateAccountStatus(user: User, status: 'ACTIVE' | 'DISABLED') {
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/users/${user.id}/status`,
        body: { status },
        schema: staffUserMutationSchema,
      });
      setFlash(
        status === 'DISABLED'
          ? 'Hesap devre dışı bırakıldı; açık oturumları kapatıldı.'
          : 'Hesap yeniden etkinleştirildi.',
      );
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveBranchScopes(user: User) {
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/users/${user.id}/branches`,
        body: { branchIds: branchDraft ? [branchDraft] : [] },
        schema: staffUserMutationSchema,
      });
      setFlash('Şube kapsamı güncellendi.');
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function savePermissions(user: User, resetToRoleDefaults = false) {
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/users/${user.id}/permissions`,
        body: {
          permissionCodes: resetToRoleDefaults ? [] : permissionDraft,
          customPermissionsEnabled: !resetToRoleDefaults,
        },
        schema: staffUserMutationSchema,
      });
      setFlash(
        resetToRoleDefaults
          ? 'Kullanıcının rol varsayılan izinleri yeniden etkinleştirildi.'
          : 'Kullanıcıya özel sayfa ve işlem izinleri kaydedildi.',
      );
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function revokeRole(user: User, role: Role) {
    setBusy(true);
    setFormError(null);
    try {
      await createAdminClient().request({
        method: 'DELETE',
        path: `admin/users/${user.id}/roles/${role.id}`,
        schema: adminRoleAssignSchema,
      });
      setFlash(`${roleTitle(role.code)} rolü kaldırıldı.`);
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function confirmPendingAction() {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    if (action.kind === 'assign') void assignRole();
    if (action.kind === 'revoke') void revokeRole(action.user, action.role);
    if (action.kind === 'status') void updateAccountStatus(action.user, action.status);
    if (action.kind === 'branches') void saveBranchScopes(action.user);
    if (action.kind === 'password-reset') void setStaffPassword(action.user);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            <span>Erişim yönetimi</span>
            <OpsIcon name="chevron_right" />
            <span>Kullanıcılar</span>
          </div>
          <h1>Personel ve erişim</h1>
          <p>Şube kapsamını koruyun; her kişi için sayfa ve işlem izinlerini yönetin.</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.scopeBadge}>
            <OpsIcon name={access.isSuperAdmin ? 'public' : 'storefront'} />
            <span>{accessScopeLabel}</span>
          </span>
          <span className={styles.liveMark} aria-hidden="true" />
          <span>Canlı veri</span>
          {canCreateUser ? (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                setFormError(null);
                setCreateUserOpen(true);
              }}
            >
              <OpsIcon name="person_add" /> Kullanıcı ekle
            </button>
          ) : null}
          <button className={styles.refreshButton} type="button" onClick={() => void load()}>
            <OpsIcon name="refresh" /> Yenile
          </button>
        </div>
      </header>

      <section className={styles.overview} aria-label="Listelenen kullanıcı özeti">
        <div className={styles.overviewIntro}>
          <span className={styles.overviewIcon}>
            <OpsIcon name="group" />
          </span>
          <div>
            <strong>Şubeye bağlı personel</strong>
            <span>{access.isSuperAdmin ? 'Merkez kapsamı' : accessScopeLabel}</span>
          </div>
        </div>
        <div className={styles.metric}>
          <span>Listelenen hesap</span>
          <strong>{state.status === 'ready' ? users.length : '—'}</strong>
          <small>En fazla 50 kayıt gösterilir</small>
        </div>
        <div className={styles.metric}>
          <span>Aktif</span>
          <strong className={styles.metricGood}>
            {state.status === 'ready' ? activeCount : '—'}
          </strong>
          <small>Erişime açık</small>
        </div>
        <div className={styles.metric}>
          <span>Devre dışı</span>
          <strong>{state.status === 'ready' ? disabledCount : '—'}</strong>
          <small>Oturum açamaz</small>
        </div>
        <div className={styles.metric}>
          <span>Kurulum bekliyor</span>
          <strong>{state.status === 'ready' ? setupPendingCount : '—'}</strong>
          <small>Yönetici işlemi bekliyor</small>
        </div>
        <div className={styles.overviewFoot}>
          <OpsIcon name="shield_lock" />
          <span>Tek şube kapsamı · kişiye özel sayfa ve işlem izinleri</span>
        </div>
      </section>

      <div className={styles.workspace}>
        <section className={styles.listPanel} aria-label="Kullanıcı listesi">
          <div className={styles.panelHeader}>
            <div>
              <h2>Personel dizini</h2>
              <p>Hesapları arayın, sıralayın ve ayrıntılarını açın.</p>
            </div>
            <span className={styles.resultCount}>{filteredUsers.length} kayıt</span>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.search}>
              <OpsIcon name="search" />
              <span className={styles.srOnly}>Kullanıcı ara</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                placeholder="Ad, e-posta, rol veya kayıt kimliği ara"
              />
              {query ? (
                <button type="button" aria-label="Aramayı temizle" onClick={() => setQuery('')}>
                  <OpsIcon name="close" />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </label>
            <label className={styles.statusFilter}>
              <span>Durum</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                aria-label="Hesap durumuna göre filtrele"
              >
                <option value="ALL">Tüm durumlar</option>
                <option value="ACTIVE">Aktif</option>
                <option value="DISABLED">Devre dışı</option>
                <option value="LOCKED">Kilitli</option>
                <option value="PENDING_VERIFICATION">Kurulum bekliyor</option>
              </select>
              <OpsIcon name="expand_more" />
            </label>
          </div>

          <OpsBoundary
            state={state}
            emptyTitle="Henüz personel yok"
            emptyDescription="Kullanıcı kayıtları burada görünür."
            onRetry={() => void load()}
          >
            {() =>
              filteredUsers.length === 0 ? (
                <div className={styles.emptySearch}>
                  <span>
                    <OpsIcon name={query || statusFilter !== 'ALL' ? 'search_off' : 'group'} />
                  </span>
                  <strong>
                    {query || statusFilter !== 'ALL'
                      ? 'Eşleşen kullanıcı bulunamadı'
                      : 'Gösterilecek kullanıcı yok'}
                  </strong>
                  <p>
                    {query || statusFilter !== 'ALL'
                      ? 'Arama sözcüğünü veya durum filtresini değiştirin.'
                      : 'Personel hesapları API üzerinden yüklendiğinde listelenir.'}
                  </p>
                  {query || statusFilter !== 'ALL' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setStatusFilter('ALL');
                      }}
                    >
                      Filtreleri temizle
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          {table.getHeaderGroups().map((group) =>
                            group.headers.map((header) => (
                              <th key={header.id} scope="col">
                                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                  <button
                                    type="button"
                                    className={styles.sortButton}
                                    onClick={header.column.getToggleSortingHandler()}
                                    aria-label={`${String(header.column.columnDef.header)} sütununa göre sırala`}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                                    <span className={styles.sortMark} aria-hidden="true">
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
                            )),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className={
                              selectedId === row.original.id ? styles.selectedRow : undefined
                            }
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
                  <footer className={styles.tableFooter}>
                    <span>
                      {filteredUsers.length
                        ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredUsers.length)} / ${filteredUsers.length}`
                        : '0 kayıt'}
                    </span>
                    <div className={styles.paging}>
                      <label>
                        Sayfa başına
                        <select
                          aria-label="Sayfa başına kayıt sayısı"
                          value={pagination.pageSize}
                          onChange={(event) => table.setPageSize(Number(event.target.value))}
                        >
                          {pageSizes.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        aria-label="Önceki sayfa"
                        disabled={!table.getCanPreviousPage()}
                        onClick={() => table.previousPage()}
                      >
                        <OpsIcon name="chevron_left" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sonraki sayfa"
                        disabled={!table.getCanNextPage()}
                        onClick={() => table.nextPage()}
                      >
                        <OpsIcon name="chevron_right" />
                      </button>
                    </div>
                  </footer>
                </>
              )
            }
          </OpsBoundary>
          <div className={styles.contractNote}>
            <OpsIcon name="info" />
            <span>
              Yeni kullanıcı hesabı doğrudan oluşturulur. Şifreyi oluştururken belirleyin ve
              personele güvenli bir kanaldan iletin.
            </span>
          </div>
        </section>
      </div>

      <dialog
        ref={detailDialogRef}
        className={styles.detailDialog}
        aria-labelledby="user-detail-title"
        onClose={() => {
          setSelectedId(null);
          setFormError(null);
          setFlash(null);
          setStaffPasswordDraft('');
          setStaffPasswordConfirmation('');
        }}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            closeDetailDialog();
          }
        }}
      >
        {selectedUser ? (
          <>
            <div className={styles.detailTop}>
              <div className={styles.detailHeading}>
                <span className={styles.detailEyebrow}>PERSONEL YÖNETİMİ</span>
                <h2 id="user-detail-title">Hesap ayrıntısı</h2>
                <p>Hesap bilgilerini, erişim rollerini ve şube kapsamını yönetin.</p>
              </div>
              <button
                ref={detailCloseRef}
                type="button"
                className={styles.closeDetail}
                aria-label="Hesap ayrıntısını kapat"
                onClick={closeDetailDialog}
              >
                <OpsIcon name="close" />
              </button>
            </div>
            <div className={styles.detailDialogScroll}>
              <div className={styles.profileSummary}>
                <div className={styles.profileHead}>
                  <span className={`${styles.avatar} ${styles.avatarLarge}`} aria-hidden="true">
                    {initials(selectedUser)}
                  </span>
                  <div>
                    <h3>{selectedUser.displayName || 'İsimsiz personel'}</h3>
                    <p>{selectedUser.primaryIdentifier ?? 'Giriş kimliği yok'}</p>
                  </div>
                </div>
                <div className={styles.detailStatus}>
                  <span
                    className={`${styles.status} ${styles[`status_${accountStatusTone(selectedUser.status ?? 'UNKNOWN')}`] ?? ''}`}
                  >
                    <span className={styles.statusDot} aria-hidden="true" />
                    {staffStatusTitle(selectedUser.status)}
                  </span>
                  <span className={styles.actorTag}>{actorTypeTitle(selectedUser.actorType)}</span>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailColumn}>
                  <div className={styles.detailSection}>
                    <div className={styles.sectionTitle}>
                      <h3>Hesap bilgileri</h3>
                      <span>Kimlik ve iletişim</span>
                    </div>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>Giriş kimliği</dt>
                        <dd>{selectedUser.primaryIdentifier ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Kayıt kimliği</dt>
                        <dd className={styles.shortId}>{selectedUser.id}</dd>
                      </div>
                    </dl>
                    <label className={styles.fieldLabel} htmlFor="staff-display-name">
                      Ad soyad
                    </label>
                    <div className={styles.inlineEdit}>
                      <input
                        id="staff-display-name"
                        value={displayNameDraft}
                        maxLength={120}
                        onChange={(event) => setDisplayNameDraft(event.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.assignButton}
                        disabled={
                          busy ||
                          !canManageUsers ||
                          !displayNameDraft.trim() ||
                          displayNameDraft === (selectedUser.displayName ?? '')
                        }
                        onClick={() => void updateName()}
                      >
                        Kaydet
                      </button>
                    </div>
                    {selectedUser.status === 'ACTIVE' ? (
                      <>
                        <label className={styles.fieldLabel} htmlFor="staff-email-change">
                          Yeni e-posta
                        </label>
                        <div className={styles.inlineEdit}>
                          <input
                            id="staff-email-change"
                            type="email"
                            autoComplete="email"
                            value={emailDraft}
                            maxLength={255}
                            placeholder="yeni@ornek.com"
                            onChange={(event) => setEmailDraft(event.target.value)}
                          />
                          <button
                            type="button"
                            className={styles.secondaryAction}
                            disabled={busy || !canManageUsers || !emailDraft.trim()}
                            onClick={() => void requestEmailChange()}
                          >
                            Doğrula
                          </button>
                        </div>
                      </>
                    ) : null}
                    {canManageUsers ? (
                      <div className={styles.passwordResetPanel}>
                        <div>
                          <strong>Şifre yönetimi</strong>
                          <p>Şifre en az 12 karakter olmalı. Bu işlem açık oturumları kapatır.</p>
                        </div>
                        {sessionUserId === selectedUser.id ? (
                          <p className={styles.selfNotice}>
                            Kendi şifreniz bu ekrandan değiştirilemez.
                          </p>
                        ) : (
                          <>
                            <label className={styles.fieldLabel} htmlFor="staff-password-reset">
                              Yeni şifre
                            </label>
                            <input
                              id="staff-password-reset"
                              type="password"
                              autoComplete="new-password"
                              minLength={12}
                              maxLength={256}
                              value={staffPasswordDraft}
                              onChange={(event) => setStaffPasswordDraft(event.target.value)}
                            />
                            <label
                              className={styles.fieldLabel}
                              htmlFor="staff-password-reset-confirm"
                            >
                              Yeni şifreyi tekrar yazın
                            </label>
                            <input
                              id="staff-password-reset-confirm"
                              type="password"
                              autoComplete="new-password"
                              minLength={12}
                              maxLength={256}
                              value={staffPasswordConfirmation}
                              onChange={(event) => setStaffPasswordConfirmation(event.target.value)}
                            />
                            <button
                              type="button"
                              className={styles.secondaryAction}
                              disabled={
                                busy ||
                                !staffPasswordDraft ||
                                staffPasswordDraft.length < 12 ||
                                staffPasswordDraft !== staffPasswordConfirmation
                              }
                              onClick={() =>
                                setPendingAction({ kind: 'password-reset', user: selectedUser })
                              }
                            >
                              Şifreyi sıfırla
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.detailSection}>
                    <div className={styles.sectionTitle}>
                      <h3>Erişim rolleri</h3>
                      <span>{selectedUser.roleCodes?.length ?? 0}</span>
                    </div>
                    <div className={styles.detailRoles}>
                      {(selectedUser.roleCodes ?? []).length ? (
                        selectedUser.roleCodes?.map((code) => {
                          const role = roles.find((item) => item.code === code);
                          return (
                            <span className={styles.roleTag} key={code}>
                              <OpsIcon name="shield_person" />
                              {roleTitle(code)}
                              {role && sessionUserId !== selectedUser.id ? (
                                <button
                                  type="button"
                                  aria-label={`${roleTitle(code)} rolünü kaldır`}
                                  disabled={
                                    busy ||
                                    !canManageUsers ||
                                    code === 'BRANCH_ADMIN' ||
                                    (code === 'SUPER_ADMIN' && !access.isSuperAdmin)
                                  }
                                  onClick={() =>
                                    setPendingAction({ kind: 'revoke', user: selectedUser, role })
                                  }
                                >
                                  <OpsIcon name="close" />
                                </button>
                              ) : null}
                            </span>
                          );
                        })
                      ) : (
                        <p className={styles.noRoles}>Bu hesaba henüz rol atanmamış.</p>
                      )}
                    </div>
                    <label className={styles.fieldLabel} htmlFor="user-role-select">
                      Yeni rol ata
                    </label>
                    <div className={styles.assignControls}>
                      <select
                        id="user-role-select"
                        value={selectedRoleId}
                        onChange={(event) => setSelectedRoleId(event.target.value)}
                        disabled={!roles.length || busy}
                      >
                        {grantableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {roleTitle(role.code)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={styles.assignButton}
                        disabled={
                          busy ||
                          !canManageUsers ||
                          !selectedRole ||
                          !!selectedUser.roleCodes?.includes(selectedRole.code)
                        }
                        onClick={() => {
                          setFormError(null);
                          setPendingAction({ kind: 'assign' });
                        }}
                      >
                        <OpsIcon name="add_moderator" />
                        <span>Ata</span>
                      </button>
                    </div>
                    {rolesState.status === 'error' ? (
                      <p className={styles.inlineError}>
                        Rol listesi yüklenemedi. Sayfayı yenileyin.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className={styles.detailColumn}>
                  <div className={styles.detailSection}>
                    <div className={styles.sectionTitle}>
                      <h3>Sayfa ve işlem izinleri</h3>
                      <span>
                        {selectedUser.customPermissionsEnabled ? 'Kişiye özel' : 'Rol varsayılanı'}
                      </span>
                    </div>
                    {selectedUser.roleCodes?.includes('SUPER_ADMIN') ? (
                      <p className={styles.contractNote}>
                        Süper yönetici tüm sayfalara ve şubelere erişir; izin matrisiyle
                        sınırlandırılmaz.
                      </p>
                    ) : (
                      <>
                        <p className={styles.contractNote}>
                          Kişiye özel izinler seçildiğinde ortak rol paketinin yerini alır. Özel
                          işlem izinleri sayfa erişiminden ayrı değerlendirilir.
                        </p>
                        {permissionGroups.map((group) => (
                          <fieldset className={styles.permissionGroup} key={group.key}>
                            <legend>{group.label}</legend>
                            <div className={styles.permissionGrid}>
                              {group.rows.map((permission) => {
                                const checked = permissionDraft.includes(permission.code);
                                const canGrant =
                                  access.isSuperAdmin || access.permissions.has(permission.code);
                                return (
                                  <label className={styles.permissionOption} key={permission.code}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={
                                        busy ||
                                        !canManageUsers ||
                                        !canGrant ||
                                        (selectedUser.isBranchAdministrator && !access.isSuperAdmin)
                                      }
                                      onChange={(event) =>
                                        setPermissionDraft((current) =>
                                          event.target.checked
                                            ? [...new Set([...current, permission.code])]
                                            : current.filter((code) => code !== permission.code),
                                        )
                                      }
                                    />
                                    <span>{permissionTitle(permission)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                        ))}
                        {permissionsState.status === 'error' ? (
                          <p className={styles.inlineError}>İzin kataloğu yüklenemedi.</p>
                        ) : null}
                        <div className={styles.permissionActions}>
                          <button
                            type="button"
                            className={styles.assignButton}
                            disabled={
                              busy ||
                              !canManageUsers ||
                              !permissionDraftChanged ||
                              (selectedUser.isBranchAdministrator && !access.isSuperAdmin)
                            }
                            onClick={() => void savePermissions(selectedUser)}
                          >
                            İzinleri kaydet
                          </button>
                          {selectedUser.customPermissionsEnabled ? (
                            <button
                              type="button"
                              className={styles.secondaryAction}
                              disabled={
                                busy ||
                                !canManageUsers ||
                                (selectedUser.isBranchAdministrator && !access.isSuperAdmin)
                              }
                              onClick={() => void savePermissions(selectedUser, true)}
                            >
                              Rol varsayılanına dön
                            </button>
                          ) : null}
                        </div>
                        {!access.isSuperAdmin && selectedUser.isBranchAdministrator ? (
                          <p className={styles.contractNote}>
                            Şube yöneticisinin erişimlerini yalnızca süper yönetici değiştirebilir.
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className={styles.scopeNotice}>
                    <span>
                      <OpsIcon name="storefront" />
                    </span>
                    <div className={styles.scopeContent}>
                      <strong>Şube kapsamı</strong>
                      <p>Bu personelin işlem yapabileceği atanmış şubeler.</p>
                      {branchesState.status === 'error' ? (
                        <p className={styles.inlineError}>
                          Şube listesi yüklenemedi. Şube kapsamı düzenlenemiyor.
                        </p>
                      ) : null}
                      {selectedUser.roleCodes?.includes('SUPER_ADMIN') ? (
                        <small>Süper yönetici · tüm şubelerde sınırsız erişim</small>
                      ) : branches.length ? (
                        <>
                          <select
                            className={styles.branchSelect}
                            aria-label="Personel şube kapsamı"
                            value={branchDraft}
                            onChange={(event) => setBranchDraft(event.target.value)}
                            disabled={
                              busy ||
                              !canManageUsers ||
                              !access.isSuperAdmin ||
                              sessionUserId === selectedUser.id ||
                              selectedUser.isBranchAdministrator
                            }
                          >
                            <option value="">Şube seçin</option>
                            {branches
                              .filter((branch) => branch.isActive !== false)
                              .map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                  {branch.name}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            className={styles.secondaryAction}
                            disabled={
                              busy ||
                              sessionUserId === selectedUser.id ||
                              branchDraft === selectedUser.branchScopes?.[0]?.branchId ||
                              selectedUser.isBranchAdministrator ||
                              !branchDraft ||
                              !canManageUsers ||
                              !access.isSuperAdmin
                            }
                            onClick={() =>
                              setPendingAction({ kind: 'branches', user: selectedUser })
                            }
                          >
                            Şube kapsamını kaydet
                          </button>
                        </>
                      ) : (
                        <p>Atanmış erişilebilir şube bulunmuyor.</p>
                      )}
                      {(selectedUser.branchScopes ?? []).length ? (
                        <small>
                          {selectedUser.branchScopes?.map((scope) => scope.branchName).join(' · ')}
                        </small>
                      ) : (
                        <small>Şube ataması yok</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <footer className={styles.detailFooter}>
              <div className={styles.detailFeedback}>
                {sessionUserId === selectedUser.id ? (
                  <p className={styles.selfNotice}>
                    <OpsIcon name="warning" />
                    Kendi hesabınız devre dışı bırakılamaz. Rol değişikliği erişiminizi
                    etkileyebilir.
                  </p>
                ) : null}
                {formError ? (
                  <p className={styles.inlineError} role="alert">
                    {formError}
                  </p>
                ) : null}
                {flash ? (
                  <p className={styles.successMessage} role="status">
                    <OpsIcon name="check_circle" />
                    {flash}
                  </p>
                ) : null}
              </div>
              <div className={styles.detailFooterActions}>
                {canManageUsers &&
                (selectedUser.status === 'ACTIVE' || selectedUser.status === 'DISABLED') ? (
                  <button
                    type="button"
                    className={
                      selectedUser.status === 'ACTIVE'
                        ? styles.dangerAction
                        : styles.secondaryAction
                    }
                    disabled={
                      busy ||
                      (sessionUserId === selectedUser.id && selectedUser.status === 'ACTIVE') ||
                      (selectedUser.isBranchAdministrator && !access.isSuperAdmin)
                    }
                    onClick={() =>
                      setPendingAction({
                        kind: 'status',
                        user: selectedUser,
                        status: selectedUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                      })
                    }
                  >
                    <OpsIcon
                      name={selectedUser.status === 'ACTIVE' ? 'person_off' : 'person_check'}
                    />
                    {selectedUser.status === 'ACTIVE' ? 'Erişimi kapat' : 'Erişimi yeniden aç'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={closeDetailDialog}
                >
                  Kapat
                </button>
              </div>
            </footer>
          </>
        ) : null}
      </dialog>

      {createUserOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateUserForm();
          }}
        >
          <section
            className={styles.formModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <span>YENİ KULLANICI</span>
                <h2 id="create-user-title">Kullanıcı oluştur</h2>
              </div>
              <button
                type="button"
                aria-label="Kullanıcı oluşturma penceresini kapat"
                onClick={closeCreateUserForm}
              >
                <OpsIcon name="close" />
              </button>
            </div>
            <p className={styles.modalIntro}>
              Hesap etkin olarak açılır. Şifreyi güvenli kanaldan personele iletin; kullanıcı kendi
              şifresini değiştiremez.
            </p>
            <label className={styles.formField}>
              Ad soyad
              <input
                autoFocus
                value={createUserDraft.displayName}
                maxLength={120}
                onChange={(event) =>
                  setCreateUserDraft((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </label>
            <label className={styles.formField}>
              E-posta
              <input
                type="email"
                autoComplete="email"
                value={createUserDraft.email}
                maxLength={255}
                onChange={(event) =>
                  setCreateUserDraft((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label className={styles.formField}>
              Şifre
              <input
                type="password"
                autoComplete="new-password"
                value={createUserDraft.password}
                minLength={12}
                maxLength={256}
                onChange={(event) =>
                  setCreateUserDraft((current) => ({ ...current, password: event.target.value }))
                }
              />
              <small>En az 12 karakter. Kullanıcı bu şifreyi kendisi değiştiremez.</small>
            </label>
            <label className={styles.formField}>
              Şifre tekrarı
              <input
                type="password"
                autoComplete="new-password"
                value={createUserDraft.passwordConfirmation}
                minLength={12}
                maxLength={256}
                onChange={(event) =>
                  setCreateUserDraft((current) => ({
                    ...current,
                    passwordConfirmation: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.formField}>
              Rol
              <select
                value={createUserDraft.roleIds[0] ?? ''}
                onChange={(event) =>
                  setCreateUserDraft((current) => {
                    const role = grantableRoles.find((item) => item.id === event.target.value);
                    const selectedBranch = branches.find(
                      (branch) => branch.id === current.branchIds[0],
                    );
                    return {
                      ...current,
                      roleIds: event.target.value ? [event.target.value] : [],
                      branchIds:
                        role?.code === 'SUPER_ADMIN' ||
                        (role?.code === 'BRANCH_ADMIN' && Boolean(selectedBranch?.administrator)) ||
                        (role?.code !== 'BRANCH_ADMIN' && selectedBranch?.isActive === false)
                          ? []
                          : current.branchIds,
                    };
                  })
                }
              >
                <option value="">Rol seçin</option>
                {grantableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {roleTitle(role.code)}
                  </option>
                ))}
              </select>
              <small>
                Süper yönetici tüm sistemde, şube rolleri yalnızca atanmış şubede geçerlidir.
              </small>
            </label>
            {newUserIsSuperAdmin ? (
              <p className={styles.contractNote}>
                Süper yönetici için şube seçilmez; erişim tüm şubeleri kapsar.
              </p>
            ) : (
              <label className={styles.formField}>
                Şube
                <select
                  value={createUserDraft.branchIds[0] ?? ''}
                  onChange={(event) =>
                    setCreateUserDraft((current) => ({
                      ...current,
                      branchIds: event.target.value ? [event.target.value] : [],
                    }))
                  }
                >
                  <option value="">Şube seçin</option>
                  {availableUserBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.isActive === false ? ' · Yönetici kurulumu gerekli' : ''}
                    </option>
                  ))}
                </select>
                <small>Her personel yalnızca bir şubeye atanır.</small>
              </label>
            )}
            {!newUserIsSuperAdmin && newUserRoleCodes.includes('BRANCH_USER') ? (
              <div className={styles.permissionEditor}>
                <h3>Başlangıç sayfa izinleri</h3>
                <p>En az bir sayfa erişimi seçin. Her eylem ayrı izin olarak kaydedilir.</p>
                {newUserPermissionGroups.map((group) => (
                  <fieldset className={styles.permissionGroup} key={group.key}>
                    <legend>{group.label}</legend>
                    <div className={styles.permissionGrid}>
                      {group.rows.map((permission) => {
                        const checked = createUserDraft.permissionCodes.includes(permission.code);
                        const canGrant =
                          access.isSuperAdmin || access.permissions.has(permission.code);
                        return (
                          <label className={styles.permissionOption} key={permission.code}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canGrant || busy}
                              onChange={(event) =>
                                setCreateUserDraft((current) => ({
                                  ...current,
                                  permissionCodes: event.target.checked
                                    ? [...new Set([...current.permissionCodes, permission.code])]
                                    : current.permissionCodes.filter(
                                        (code) => code !== permission.code,
                                      ),
                                }))
                              }
                            />
                            <span>{permissionTitle(permission)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            ) : null}
            {formError ? (
              <p className={styles.inlineError} role="alert">
                {formError}
              </p>
            ) : null}
            {branchesState.status === 'error' ? (
              <p className={styles.inlineError} role="alert">
                Şubeler yüklenemedi; kullanıcı oluşturulamıyor.
              </p>
            ) : null}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={closeCreateUserForm}
                disabled={busy}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void createUser()}
                disabled={
                  busy ||
                  (!newUserIsSuperAdmin && branchesState.status !== 'ready') ||
                  !createUserDraft.displayName.trim() ||
                  !createUserDraft.email.trim() ||
                  createUserDraft.password.length < 12 ||
                  createUserDraft.password.length > 256 ||
                  createUserDraft.password !== createUserDraft.passwordConfirmation ||
                  !createUserDraft.roleIds.length ||
                  (!newUserIsSuperAdmin && !createUserDraft.branchIds.length) ||
                  (newUserRoleCodes.includes('BRANCH_USER') &&
                    !createUserDraft.permissionCodes.length)
                }
              >
                {busy ? 'Oluşturuluyor…' : 'Kullanıcı oluştur'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <dialog
        ref={generatedLinkDialogRef}
        className={styles.linkDialog}
        aria-labelledby="generated-link-title"
        onClose={() => setGeneratedLink(null)}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            closeGeneratedLinkDialog();
          }
        }}
      >
        {generatedLink ? (
          <>
            <div className={styles.modalHeader}>
              <div>
                <span>GÜVENLİ BAĞLANTI</span>
                <h2 id="generated-link-title">{generatedLink.label}</h2>
              </div>
              <button
                ref={generatedLinkCloseRef}
                type="button"
                aria-label="Bağlantı penceresini kapat"
                onClick={closeGeneratedLinkDialog}
              >
                <OpsIcon name="close" />
              </button>
            </div>
            <p className={styles.modalIntro}>
              Bu bağlantı 24 saat geçerlidir ve tek kullanımlıdır. Bağlantıyı güvenli bir kanaldan
              paylaşın.
            </p>
            <input
              className={styles.generatedUrl}
              aria-label={generatedLink.label}
              readOnly
              value={generatedLink.url}
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={closeGeneratedLinkDialog}
              >
                Kapat
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  void navigator.clipboard
                    .writeText(generatedLink.url)
                    .then(() => setFlash('Bağlantı panoya kopyalandı.'))
                    .catch(() =>
                      setFormError('Bağlantı kopyalanamadı; bağlantıyı seçip kopyalayın.'),
                    )
                }
              >
                <OpsIcon name="content_copy" /> Bağlantıyı kopyala
              </button>
            </div>
          </>
        ) : null}
      </dialog>

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.kind === 'assign'
            ? 'Rol atansın mı?'
            : pendingAction?.kind === 'revoke'
              ? 'Rol kaldırılsın mı?'
              : pendingAction?.kind === 'status'
                ? pendingAction.status === 'DISABLED'
                  ? 'Erişim kapatılsın mı?'
                  : 'Erişim yeniden açılsın mı?'
                : pendingAction?.kind === 'password-reset'
                  ? 'Şifre sıfırlansın mı?'
                  : 'Şube kapsamı güncellensin mi?'
        }
        body={
          pendingAction?.kind === 'assign' && selectedUser && selectedRole
            ? `${roleTitle(selectedRole.code)} rolü ${selectedUser.displayName || selectedUser.primaryIdentifier || shortId(selectedUser.id)} hesabına eklenecek.`
            : pendingAction?.kind === 'revoke'
              ? `${roleTitle(pendingAction.role.code)} rolü ${pendingAction.user.displayName || pendingAction.user.primaryIdentifier || shortId(pendingAction.user.id)} hesabından kaldırılacak.`
              : pendingAction?.kind === 'status'
                ? pendingAction.status === 'DISABLED'
                  ? `${pendingAction.user.displayName || pendingAction.user.primaryIdentifier || shortId(pendingAction.user.id)} hesabı kapatılacak ve açık oturumları iptal edilecek.`
                  : `${pendingAction.user.displayName || pendingAction.user.primaryIdentifier || shortId(pendingAction.user.id)} hesabı yeniden etkinleştirilecek.`
                : pendingAction?.kind === 'branches'
                  ? `${pendingAction.user.displayName || pendingAction.user.primaryIdentifier || shortId(pendingAction.user.id)} hesabının atanmış şubeleri güncellenecek.`
                  : pendingAction?.kind === 'password-reset'
                    ? `${pendingAction.user.displayName || pendingAction.user.primaryIdentifier || shortId(pendingAction.user.id)} hesabına yeni şifre atanacak ve açık oturumları kapatılacak.`
                    : 'Seçili kullanıcıya rol eklenecek.'
        }
        confirmLabel={
          pendingAction?.kind === 'assign'
            ? 'Rolü ata'
            : pendingAction?.kind === 'revoke'
              ? 'Rolü kaldır'
              : pendingAction?.kind === 'status' && pendingAction.status === 'DISABLED'
                ? 'Erişimi kapat'
                : pendingAction?.kind === 'status'
                  ? 'Erişimi aç'
                  : pendingAction?.kind === 'password-reset'
                    ? 'Şifreyi sıfırla'
                    : 'Kapsamı kaydet'
        }
        danger={
          pendingAction?.kind === 'revoke' ||
          (pendingAction?.kind === 'status' && pendingAction.status === 'DISABLED')
        }
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
