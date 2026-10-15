import { isRouteIdentifiedBranchPath } from './admin-routes';

export type A3ResourceScope =
  | 'GLOBAL_MASTER_DATA'
  | 'BRANCH_SCOPED'
  | 'ROUTE_IDENTIFIED_BRANCH'
  | 'MIXED';

export function a3ResourceScope(pathname: string): A3ResourceScope | null {
  if (pathname === '/branches') return 'GLOBAL_MASTER_DATA';
  if (
    pathname === '/branches/service-areas' ||
    pathname === '/branches/availability' ||
    pathname === '/branches/map'
  ) {
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

/* ---------------------------------------------------------------------------
   Derived polygon facts
   ---------------------------------------------------------------------------
   `createServiceAreaSchema` types `coordinates` as `z.unknown()`, so the API
   validates the envelope (Polygon | MultiPolygon) and nothing else: a swapped
   latitude/longitude pair or a malformed ring is accepted and only shows up
   later, when a customer address silently falls outside every area. Reading
   the coordinates on the client is therefore the only place the shape can be
   checked before it is stored. Everything below is derived from the stored
   value — no field is invented and none is written back.
   --------------------------------------------------------------------------- */

/** WGS84 `[longitude, latitude]`, matching GeoJSON and the API's field order. */
export type PolygonFacts = {
  type: 'Polygon' | 'MultiPolygon';
  ringCount: number;
  vertexCount: number;
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  /** False when any pair is outside valid WGS84 bounds — usually a swapped axis. */
  withinBounds: boolean;
};

/** WGS84 `[longitude, latitude]`, matching GeoJSON and the API's field order. */
type LonLat = [number, number];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Walks a GeoJSON coordinate tree and flattens it to `[lon, lat]` pairs. */
function collectPairs(node: unknown, out: LonLat[]): boolean {
  if (!Array.isArray(node)) return false;
  if (node.length >= 2 && isFiniteNumber(node[0]) && isFiniteNumber(node[1])) {
    out.push([node[0], node[1]]);
    return true;
  }
  for (const child of node) {
    if (!collectPairs(child, out)) return false;
  }
  return true;
}

function countRings(type: 'Polygon' | 'MultiPolygon', coordinates: unknown): number {
  // `coordinates` is `unknown` by contract, so the union with `[coordinates]`
  // has to be widened explicitly before it can be iterated.
  const polygons: unknown[] =
    type === 'MultiPolygon' && Array.isArray(coordinates) ? coordinates : [coordinates];
  let rings = 0;
  for (const polygon of polygons) {
    if (Array.isArray(polygon)) rings += polygon.length;
  }
  return rings;
}

export function readPolygonFacts(value: unknown): PolygonFacts | null {
  if (!value || typeof value !== 'object') return null;
  const typed = value as { type?: unknown; coordinates?: unknown };
  if (typed.type !== 'Polygon' && typed.type !== 'MultiPolygon') return null;
  if (typed.coordinates === undefined) return null;

  const pairs: LonLat[] = [];
  if (!collectPairs(typed.coordinates, pairs)) return null;
  if (pairs.length === 0) return null;

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let withinBounds = true;
  for (const pair of pairs) {
    const lon = pair[0];
    const lat = pair[1];
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (!isValidLongitude(lon) || !isValidLatitude(lat)) withinBounds = false;
  }

  return {
    type: typed.type,
    ringCount: countRings(typed.type, typed.coordinates),
    vertexCount: pairs.length,
    minLon,
    maxLon,
    minLat,
    maxLat,
    withinBounds,
  };
}

/** `41.0000–41.0200 K · 28.9600–29.0000 D` — K = kuzey (enlem), D = doğu (boylam). */
export function formatBbox(facts: PolygonFacts): string {
  return `${facts.minLat.toFixed(4)}–${facts.maxLat.toFixed(4)} K · ${facts.minLon.toFixed(4)}–${facts.maxLon.toFixed(4)} D`;
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

/* --- branch profile form (A9-23) --- */

export type BranchDraft = {
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

export type ProfileField =
  | 'name'
  | 'code'
  | 'address'
  | 'latitude'
  | 'longitude'
  | 'phone'
  | 'minOrder'
  | 'deliveryFee';
export type ProfileErrors = Partial<Record<ProfileField, string>>;
export type ProfileValues = {
  code: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  phone: string;
  minOrderMinor: string;
  deliveryFeeMinor: string;
};
export type ProfileResult =
  | { ok: true; errors: ProfileErrors; values: ProfileValues }
  | { ok: false; errors: ProfileErrors; firstInvalid: ProfileField };

/** Visual order of the profile form — the first invalid entry receives focus. */
export const PROFILE_FIELDS: ProfileField[] = [
  'name',
  'code',
  'address',
  'latitude',
  'longitude',
  'phone',
  'minOrder',
  'deliveryFee',
];
export const PROFILE_LIMITS = { name: 128, code: 32, address: 255 } as const;

/** ₺ major-unit string to the minor-unit integer the API expects. */
export function majorToMinor(value: string): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return (BigInt(whole ?? '0') * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
}

/**
 * Single source of truth for the branch profile form. Mirrors the server
 * contract in `createBranchSchema` (admin-branch.controller.ts), so the client
 * never submits a payload the API is going to reject. Coordinates are
 * create-only: the PATCH payload carries no latitude/longitude.
 */
export function checkProfile(draft: BranchDraft, mode: 'create' | 'edit'): ProfileResult {
  const errors: ProfileErrors = {};
  const name = draft.name.trim();
  const code = draft.code.trim();
  const addressLine = draft.address.trim();
  const phone = draft.phone.trim();
  const minOrderMinor = majorToMinor(draft.minOrder);
  const deliveryFeeMinor = majorToMinor(draft.deliveryFee);
  const latitude = parseCoordinate(draft.latitude);
  const longitude = parseCoordinate(draft.longitude);
  if (!name) errors.name = 'Şube adı zorunlu.';
  else if (name.length > PROFILE_LIMITS.name)
    errors.name = 'Şube adı en fazla ' + PROFILE_LIMITS.name + ' karakter olabilir.';
  if (!addressLine) errors.address = 'Adres zorunlu.';
  else if (addressLine.length > PROFILE_LIMITS.address)
    errors.address = 'Adres en fazla ' + PROFILE_LIMITS.address + ' karakter olabilir.';
  if (phone && !isE164Phone(phone))
    errors.phone = 'Telefonu ülke koduyla girin (örnek: +905551112233).';
  if (minOrderMinor === null) errors.minOrder = 'Geçerli tutar girin.';
  if (deliveryFeeMinor === null) errors.deliveryFee = 'Geçerli tutar girin.';
  if (mode === 'create') {
    if (!code) errors.code = 'Şube kodu zorunlu.';
    else if (code.length > PROFILE_LIMITS.code)
      errors.code = 'Şube kodu en fazla ' + PROFILE_LIMITS.code + ' karakter olabilir.';
  }
  // `parseCoordinate('')` returns 0, so the empty check has to come first.
  if (!draft.latitude.trim()) errors.latitude = 'Enlem zorunlu.';
  else if (latitude === null || !isValidLatitude(latitude))
    errors.latitude = 'Enlem -90 ile 90 arasında bir sayı olmalı.';
  if (!draft.longitude.trim()) errors.longitude = 'Boylam zorunlu.';
  else if (longitude === null || !isValidLongitude(longitude))
    errors.longitude = 'Boylam -180 ile 180 arasında bir sayı olmalı.';
  const firstInvalid = PROFILE_FIELDS.find((field) => errors[field]);
  if (firstInvalid) return { ok: false, errors, firstInvalid };
  return {
    ok: true,
    errors,
    values: {
      code,
      name,
      addressLine,
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      phone,
      minOrderMinor: minOrderMinor ?? '0',
      deliveryFeeMinor: deliveryFeeMinor ?? '0',
    },
  };
}

/** Live readout for the paired latitude/longitude control. */
export function coordinateReadout(
  draft: BranchDraft,
  _mode?: 'create' | 'edit',
): { text: string; ok: boolean } {
  if (!draft.latitude.trim() || !draft.longitude.trim())
    return { text: 'Enlem ve boylam zorunlu.', ok: false };
  const latitude = parseCoordinate(draft.latitude);
  const longitude = parseCoordinate(draft.longitude);
  if (latitude === null || longitude === null)
    return { text: 'Ondalık ayırıcı olarak nokta veya virgül kullanın.', ok: false };
  if (!isValidLatitude(latitude)) return { text: 'Enlem -90 ile 90 arasında olmalı.', ok: false };
  if (!isValidLongitude(longitude))
    return { text: 'Boylam -180 ile 180 arasında olmalı.', ok: false };
  return {
    text: 'WGS84 derece · ' + latitude.toFixed(5) + ', ' + longitude.toFixed(5),
    ok: true,
  };
}
