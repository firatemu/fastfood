export type A5ResourceScope = 'GLOBAL_ANALYTICS' | 'USER_SCOPED' | 'ROLE_SCOPED' | 'SYSTEM_GLOBAL';

export function a5ResourceScope(pathname: string): A5ResourceScope | null {
  if (pathname === '/reports') return 'GLOBAL_ANALYTICS';
  if (pathname === '/users') return 'USER_SCOPED';
  if (pathname === '/roles') return 'ROLE_SCOPED';
  if (pathname === '/audit' || pathname === '/settings') return 'SYSTEM_GLOBAL';
  return null;
}

export function a5ScopeTag(pathname: string): string | null {
  const scope = a5ResourceScope(pathname);
  if (scope === 'GLOBAL_ANALYTICS') return 'Küresel raporlar';
  if (scope === 'USER_SCOPED' || scope === 'ROLE_SCOPED') return 'Erişim yönetimi';
  if (scope === 'SYSTEM_GLOBAL') return 'Sistem ayarları';
  return null;
}

export const REPORT_TABS = [
  { id: 'sales', label: 'Satış', path: 'admin/reports/sales' },
  { id: 'branches', label: 'Şubeler', path: 'admin/reports/branches' },
  { id: 'products', label: 'Ürünler', path: 'admin/reports/products' },
  { id: 'couriers', label: 'Kuryeler', path: 'admin/reports/couriers' },
] as const;

export type ReportTabId = (typeof REPORT_TABS)[number]['id'];

export type SalesReportRow = {
  day?: string;
  orderCount?: number;
  grossMinor?: string;
  refundedMinor?: string;
  netMinor?: string;
};

function parseMinor(value: string | undefined): bigint {
  try {
    return BigInt(value || '0');
  } catch {
    return 0n;
  }
}

/** Totals from the sales report payload itself — not from a partial order list. */
export function sumSalesReport(rows: readonly SalesReportRow[]): {
  orderCount: number;
  grossMinor: bigint;
  refundedMinor: bigint;
  netMinor: bigint;
} {
  return rows.reduce(
    (acc, row) => ({
      orderCount: acc.orderCount + (row.orderCount ?? 0),
      grossMinor: acc.grossMinor + parseMinor(row.grossMinor),
      refundedMinor: acc.refundedMinor + parseMinor(row.refundedMinor),
      netMinor: acc.netMinor + parseMinor(row.netMinor),
    }),
    { orderCount: 0, grossMinor: 0n, refundedMinor: 0n, netMinor: 0n },
  );
}

export type StaffUserRow = {
  id: string;
  displayName?: string | null;
  primaryIdentifier?: string | null;
  status?: string;
  actorType?: string;
  roleCodes?: string[];
};

export function filterStaffUsers<T extends StaffUserRow>(
  rows: readonly T[],
  opts: { q: string; status: string },
): T[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.status && row.status !== opts.status) return false;
    if (!q) return true;
    return (
      row.id.toLowerCase().includes(q) ||
      (row.displayName ?? '').toLowerCase().includes(q) ||
      (row.primaryIdentifier ?? '').toLowerCase().includes(q) ||
      (row.roleCodes ?? []).some((code) => code.toLowerCase().includes(q))
    );
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function canAssignRole(input: {
  userId: string;
  roleId: string;
  existingRoleCodes?: string[];
  roleCode?: string;
}): boolean {
  if (!UUID_RE.test(input.userId.trim()) || !UUID_RE.test(input.roleId.trim())) return false;
  if (input.roleCode && input.existingRoleCodes?.includes(input.roleCode)) return false;
  return true;
}

export type PermissionRow = {
  id?: string;
  code: string;
  name?: string;
  description?: string | null;
};

export function permissionGroup(code: string): string {
  const parts = code.split('.');
  if (parts.length <= 1) return code;
  return parts.slice(0, -1).join('.');
}

export function groupPermissions(rows: readonly PermissionRow[]): {
  group: string;
  items: PermissionRow[];
}[] {
  const map = new Map<string, PermissionRow[]>();
  for (const row of rows) {
    const group = permissionGroup(row.code);
    const list = map.get(group) ?? [];
    list.push(row);
    map.set(group, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.code.localeCompare(b.code)),
    }));
}

export type AuditRow = {
  id: string;
  action?: string;
  actorUserId?: string | null;
  actorId?: string | null;
  actorType?: string;
  resourceType?: string | null;
  resourceId?: string | null;
  branchId?: string | null;
  requestId?: string | null;
  reason?: string | null;
  createdAt?: string;
};

export function auditActorId(row: AuditRow): string {
  return row.actorUserId ?? row.actorId ?? '—';
}

export function filterAuditLogs<T extends AuditRow>(
  rows: readonly T[],
  opts: { q: string; action: string; actor: string; resource: string },
): T[] {
  const q = opts.q.trim().toLowerCase();
  const action = opts.action.trim().toLowerCase();
  const actor = opts.actor.trim().toLowerCase();
  const resource = opts.resource.trim().toLowerCase();
  return rows.filter((row) => {
    if (action && (row.action ?? '').toLowerCase() !== action) return false;
    if (actor && !auditActorId(row).toLowerCase().includes(actor)) return false;
    if (
      resource &&
      !(row.resourceType ?? '').toLowerCase().includes(resource) &&
      !(row.resourceId ?? '').toLowerCase().includes(resource)
    ) {
      return false;
    }
    if (!q) return true;
    const hay = [
      row.action,
      auditActorId(row),
      row.actorType,
      row.resourceType,
      row.resourceId,
      row.branchId,
      row.requestId,
      row.reason,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export type SettingClass =
  | 'SAFE_OPERATIONAL'
  | 'CUSTOMER_BEHAVIOR_AFFECTING'
  | 'SECURITY_SENSITIVE'
  | 'PROVIDER_CONFIGURATION'
  | 'READ_ONLY_RUNTIME_INFO';

export type SettingRow = {
  key: string;
  valueJson?: unknown;
  valueType?: string;
  category?: string;
  description?: string | null;
  mutable?: boolean;
};

const SECRET_KEY_RE =
  /secret|password|token|credential|private[_-]?key|api[_-]?key|server[_-]?key/i;
const PROVIDER_KEY_RE = /provider|iyzico|stripe|paypal|fcm|apns|smtp|oauth/i;

export function settingLooksSecret(key: string): boolean {
  return SECRET_KEY_RE.test(key);
}

export function classifySetting(row: SettingRow): SettingClass {
  if (settingLooksSecret(row.key)) return 'SECURITY_SENSITIVE';
  if (PROVIDER_KEY_RE.test(row.key) || row.category === 'provider') return 'PROVIDER_CONFIGURATION';
  if (
    row.key.startsWith('loyalty.') ||
    row.category === 'loyalty' ||
    row.key.startsWith('storefront.') ||
    row.category === 'customer'
  ) {
    return 'CUSTOMER_BEHAVIOR_AFFECTING';
  }
  if (row.mutable === false) return 'READ_ONLY_RUNTIME_INFO';
  return 'SAFE_OPERATIONAL';
}

export function settingClassLabel(kind: SettingClass): string {
  const map: Record<SettingClass, string> = {
    SAFE_OPERATIONAL: 'Operasyonel',
    CUSTOMER_BEHAVIOR_AFFECTING: 'Müşteri davranışı',
    SECURITY_SENSITIVE: 'Güvenlik / gizli',
    PROVIDER_CONFIGURATION: 'Sağlayıcı',
    READ_ONLY_RUNTIME_INFO: 'Salt okunur',
  };
  return map[kind];
}

export function canPatchSetting(row: SettingRow): boolean {
  return row.mutable === true && !settingLooksSecret(row.key);
}

export function parseSettingJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

export function displaySettingValue(row: SettingRow): string {
  if (settingLooksSecret(row.key)) return '•••• (gizli — gösterilmez)';
  try {
    return JSON.stringify(row.valueJson ?? null);
  } catch {
    return '—';
  }
}
