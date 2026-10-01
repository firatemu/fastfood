import { isRouteIdentifiedBranchPath } from './admin-routes';

export type A3ResourceScope =
  | 'GLOBAL_MASTER_DATA'
  | 'BRANCH_SCOPED'
  | 'ROUTE_IDENTIFIED_BRANCH'
  | 'MIXED';

export function a3ResourceScope(pathname: string): A3ResourceScope | null {
  if (pathname === '/branches') return 'GLOBAL_MASTER_DATA';
  if (pathname === '/branches/service-areas' || pathname === '/branches/availability') {
    return 'BRANCH_SCOPED';
  }
  if (pathname === '/couriers') return 'MIXED';
  if (isRouteIdentifiedBranchPath(pathname)) return 'ROUTE_IDENTIFIED_BRANCH';
  return null;
}

export const WEEKDAY_LABELS_TR = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
] as const;

export function weekdayLabel(dayOfWeek: number): string {
  return WEEKDAY_LABELS_TR[dayOfWeek] ?? `Gün ${dayOfWeek}`;
}

export function isHhMm(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export const E164_PHONE = /^\+\d{10,15}$/;

export function isE164Phone(value: string): boolean {
  return E164_PHONE.test(value);
}

export function parseCoordinate(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function isValidLatitude(n: number): boolean {
  return n >= -90 && n <= 90;
}

export function isValidLongitude(n: number): boolean {
  return n >= -180 && n <= 180;
}

export function parsePolygonGeoJson(
  raw: string,
): { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } | null {
  try {
    const value = JSON.parse(raw) as { type?: string; coordinates?: unknown };
    if (
      value &&
      (value.type === 'Polygon' || value.type === 'MultiPolygon') &&
      value.coordinates !== undefined
    ) {
      return { type: value.type, coordinates: value.coordinates };
    }
    return null;
  } catch {
    return null;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function canDispatchAssign(input: {
  orderId: string;
  courierId: string;
  branchId: string;
}): boolean {
  return isUuid(input.orderId) && isUuid(input.courierId) && isUuid(input.branchId);
}

export type AvailabilityFilter = '' | 'available' | 'unavailable' | 'globally-inactive';

export type AvailabilityRow = {
  productId: string;
  name: string;
  slug?: string;
  isActive?: boolean;
  isAvailable: boolean;
};

export function filterAvailabilityRows<T extends AvailabilityRow>(
  rows: readonly T[],
  opts: { q: string; filter: AvailabilityFilter },
): T[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.filter === 'available' && row.isAvailable === false) return false;
    if (opts.filter === 'unavailable' && row.isAvailable !== false) return false;
    if (opts.filter === 'globally-inactive' && row.isActive !== false) return false;
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      (row.slug ?? '').toLowerCase().includes(q) ||
      row.productId.toLowerCase().includes(q)
    );
  });
}

export function polygonSummary(polygon: unknown): string {
  if (!polygon || typeof polygon !== 'object') return '—';
  const typed = polygon as { type?: string };
  return typed.type ?? 'GeoJSON';
}

/** Minimal Istanbul downtown square — structured GeoJSON only, not a map. */
export const DEMO_SERVICE_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [28.96, 41.0],
      [28.98, 41.0],
      [28.98, 41.02],
      [28.96, 41.02],
      [28.96, 41.0],
    ],
  ],
};

export function digitsOnlyMinor(raw: string): string | null {
  const digits = raw.trim();
  if (!/^\d+$/.test(digits)) return null;
  return digits;
}
