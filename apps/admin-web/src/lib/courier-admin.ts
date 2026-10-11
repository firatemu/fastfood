import {
  adminCourierCreateSchema,
  COURIER_PASSWORD_MIN_LENGTH,
  courierUsernameSchema,
  normalizeCourierUsername,
  type AdminCourier,
  type CourierBranchRef,
} from '@fastfood/contracts';

/**
 * Courier roster view helpers.
 *
 * A courier is an account (login name + password) that belongs to one or more
 * branches, so the roster is filtered and described in those three terms: who
 * they are, whether they can sign in, and which branches claimed them. The
 * rules themselves live in `@fastfood/contracts`; this module only adds the
 * Turkish wording the operations team reads and the derivations the page draws.
 */
export type Courier = AdminCourier;
export type CourierBranch = CourierBranchRef;

export interface CourierMetrics {
  activeCount: number;
  deliveredCount: number;
}

export const DEFAULT_COURIER_CAPACITY = 3;
export const MAX_COURIER_CAPACITY = 20;

export type CourierFilter = 'all' | 'active' | 'paused' | 'unassigned';

export const COURIER_FILTERS: ReadonlyArray<{ value: CourierFilter; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Uygun' },
  { value: 'paused', label: 'Beklemede' },
  { value: 'unassigned', label: 'Şubesiz' },
];

export function courierCapacity(courier: Courier): number {
  return Math.max(1, courier.maxActiveDeliveries || DEFAULT_COURIER_CAPACITY);
}

export function courierInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`
      : displayName.trim().slice(0, 2);
  return (initials || '?').toLocaleUpperCase('tr-TR');
}

export interface CourierLoad {
  active: number;
  capacity: number;
  percent: number;
  label: string;
}

export function courierLoad(courier: Courier, metrics: CourierMetrics | undefined): CourierLoad {
  const active = metrics?.activeCount ?? 0;
  const capacity = courierCapacity(courier);
  return {
    active,
    capacity,
    percent: Math.min(100, Math.round((active / capacity) * 100)),
    label: `${active} / ${capacity}`,
  };
}

/** `"Kadıköy"` for one branch, `"Kadıköy +2"` for several, `"Şube atanmamış"` for none. */
export function courierBranchLabel(courier: Courier): string {
  const first = courier.branches[0];
  if (!first) return 'Şube atanmamış';
  const extra = courier.branches.length - 1;
  return extra > 0 ? `${first.branchName} +${extra}` : first.branchName;
}

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

export function filterCouriers(
  couriers: readonly Courier[],
  options: { query: string; filter: CourierFilter; branchId: string | null },
): Courier[] {
  const query = normalizeSearch(options.query);
  return couriers.filter((courier) => {
    if (options.branchId && !courier.branches.some((b) => b.branchId === options.branchId)) {
      return false;
    }
    if (options.filter === 'active' && !courier.isActive) return false;
    if (options.filter === 'paused' && courier.isActive) return false;
    if (options.filter === 'unassigned' && courier.branches.length > 0) return false;
    if (!query) return true;
    const haystack = [
      courier.displayName,
      courier.username,
      courier.phone ?? '',
      ...courier.branches.map((branch) => branch.branchName),
    ].map(normalizeSearch);
    return haystack.some((value) => value.includes(query));
  });
}

export interface RosterSummary {
  total: number;
  ready: number;
  paused: number;
  unassigned: number;
  activeDeliveries: number;
  capacity: number;
}

export function rosterSummary(
  couriers: readonly Courier[],
  metrics: Readonly<Record<string, CourierMetrics>>,
): RosterSummary {
  return couriers.reduce<RosterSummary>(
    (summary, courier) => {
      summary.total += 1;
      if (courier.isActive) summary.ready += 1;
      else summary.paused += 1;
      if (courier.branches.length === 0) summary.unassigned += 1;
      summary.activeDeliveries += metrics[courier.id]?.activeCount ?? 0;
      summary.capacity += courierCapacity(courier);
      return summary;
    },
    { total: 0, ready: 0, paused: 0, unassigned: 0, activeDeliveries: 0, capacity: 0 },
  );
}

export interface CourierDraft {
  displayName: string;
  username: string;
  password: string;
  passwordConfirmation: string;
  phone: string;
  maxActiveDeliveries: string;
  branchIds: string[];
}

export const EMPTY_COURIER_DRAFT: CourierDraft = {
  displayName: '',
  username: '',
  password: '',
  passwordConfirmation: '',
  phone: '',
  maxActiveDeliveries: String(DEFAULT_COURIER_CAPACITY),
  branchIds: [],
};

export interface CourierCreateRequest {
  displayName: string;
  username: string;
  password: string;
  phone?: string;
  maxActiveDeliveries?: number;
  branchIds: string[];
}

export function createRequestFromDraft(draft: CourierDraft): CourierCreateRequest {
  const capacity = Number.parseInt(draft.maxActiveDeliveries, 10);
  const phone = draft.phone.trim();
  return {
    displayName: draft.displayName.trim(),
    username: normalizeCourierUsername(draft.username),
    password: draft.password,
    ...(phone ? { phone } : {}),
    ...(Number.isFinite(capacity) && capacity > 0 ? { maxActiveDeliveries: capacity } : {}),
    branchIds: [...new Set(draft.branchIds)],
  };
}

/** Field-level guidance while the administrator is still typing. */
export function usernameHint(value: string): string | null {
  const normalized = normalizeCourierUsername(value);
  if (!normalized) return null;
  return courierUsernameSchema.safeParse(normalized).success
    ? null
    : 'Harf veya rakamla başlasın; yalnızca a-z, 0-9, nokta, tire ve alt çizgi kullanın.';
}

/**
 * How far the password is from the shared 12 character policy. Deliberately
 * reports the policy rather than a "strength" score — the API has no stronger
 * rule than length, so a meter claiming more would be a lie.
 */
export function passwordPolicyState(password: string): { met: boolean; remaining: number } {
  return {
    met: password.length >= COURIER_PASSWORD_MIN_LENGTH,
    remaining: Math.max(0, COURIER_PASSWORD_MIN_LENGTH - password.length),
  };
}

export function validateCourierDraft(draft: CourierDraft): string | null {
  if (draft.password !== draft.passwordConfirmation) {
    return 'Şifreyi iki kez aynı girin.';
  }
  const parsed = adminCourierCreateSchema.safeParse(createRequestFromDraft(draft));
  if (parsed.success) return null;
  const issue = parsed.error.issues[0];
  return draftIssueMessage(issue?.path[0], issue?.message ?? '');
}

function draftIssueMessage(field: unknown, message: string): string {
  switch (field) {
    case 'displayName':
      return 'Kurye adı en az 2 karakter olmalı.';
    case 'username':
      return message.includes('must start')
        ? 'Kullanıcı adı harf veya rakamla başlamalı; içinde yalnızca a-z, 0-9, nokta, tire ve alt çizgi olabilir.'
        : 'Kullanıcı adı 3–32 karakter olmalı.';
    case 'password':
      return `Şifre en az ${COURIER_PASSWORD_MIN_LENGTH} karakter olmalı.`;
    case 'phone':
      return 'Telefon numarası 10–32 karakter olmalı.';
    case 'maxActiveDeliveries':
      return `Azami aktif görev 1–${MAX_COURIER_CAPACITY} arasında olmalı.`;
    case 'branchIds':
      return 'Kurye için en az bir şube seçin.';
    default:
      return 'Kurye bilgilerini kontrol edin.';
  }
}

/** Toggles a branch in a draft roster, keeping the first pick as the primary. */
export function toggleDraftBranch(branchIds: readonly string[], branchId: string): string[] {
  return branchIds.includes(branchId)
    ? branchIds.filter((id) => id !== branchId)
    : [...branchIds, branchId];
}
