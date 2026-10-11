/**
 * Branch finder logic for the Storefront branch locator.
 *
 * The API stores the locality as the tail of `addressLine` ("... , Çukurova/Adana")
 * and the seeded rows mix ASCII and Turkish spellings ("GAZIANTEP" / "GAZİANTEP"),
 * so every city comparison here folds Turkish characters before matching.
 *
 * Status is derived from the branch's own operating hours in the business time
 * zone; the same row feeds the "closes in" countdown on the page.
 */

import { distanceKm } from './address-point';
import type { CustomerBranch } from './discover';
import { formatDeliveryWindow } from './format';
import { groupOperatingHours, type HoursGroup } from './hours';

export type Branch = CustomerBranch;
export type BranchPoint = { latitude: number; longitude: number };
export type BranchHours = NonNullable<CustomerBranch['hours']>;

export const ALL_CITIES = 'TÜMÜ';
const BUSINESS_TIME_ZONE = 'Europe/Istanbul';

const FOLD: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

const DAY_NAMES = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
] as const;

const WEEKDAY_BY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Lowercase and strip diacritics so Turkish spellings compare equal. */
export function normalizeTr(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (char) => FOLD[char] ?? char)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Display form written in Turkish letters ("GAZIANTEP" -> "GAZİANTEP"). */
export function turkishUpper(value: string): string {
  return value.toLocaleUpperCase('tr-TR').replace(/I/g, 'İ');
}

export type BranchLocality = { district: string; city: string; street: string };

export function branchLocality(branch: Pick<Branch, 'addressLine'>): BranchLocality {
  const line = branch.addressLine;
  const cut = line.lastIndexOf('/');
  const city = (cut >= 0 ? line.slice(cut + 1) : '').trim();
  const head = (cut >= 0 ? line.slice(0, cut) : line).trim();
  const parts = head
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const district = parts.length > 0 ? (parts[parts.length - 1] ?? '') : '';
  const street = parts.length > 1 ? parts.slice(0, -1).join(', ') : head;
  return { district, city, street };
}

const CITY_ORDER = ['ADANA', 'GAZİANTEP', 'MERSİN', 'OSMANİYE', 'DİĞER'];

/** City rail for the finder. ASCII and Turkish spellings collapse into one row. */
export function cityGroups(
  branches: Branch[],
): Array<{ key: string; label: string; count: number }> {
  const seen = new Map<string, { label: string; count: number }>();
  for (const branch of branches) {
    const { city } = branchLocality(branch);
    const key = normalizeTr(city) || 'diger';
    const current = seen.get(key);
    if (current) current.count += 1;
    else seen.set(key, { label: turkishUpper(city) || 'DİĞER', count: 1 });
  }
  return [...seen.entries()]
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((a, b) => {
      const left = CITY_ORDER.indexOf(a.label);
      const right = CITY_ORDER.indexOf(b.label);
      if (left === -1 && right === -1) return a.label.localeCompare(b.label, 'tr');
      if (left === -1) return 1;
      if (right === -1) return -1;
      return left - right;
    });
}

function istanbulClock(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  return {
    day: WEEKDAY_BY_SHORT[values.weekday ?? 'Sun'] ?? 0,
    minutes: Number(values.hour ?? '0') * 60 + Number(values.minute ?? '0'),
  };
}

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

/** Compact duration used on cards: "45 dk", "2 sa 14 dk". */
export function formatSpan(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours === 0) return `${minutes} dk`;
  if (minutes === 0) return `${hours} sa`;
  return `${hours} sa ${minutes} dk`;
}

export type BranchStatus = {
  open: boolean;
  accepting: boolean;
  pill: string;
  detail: string;
  today: string;
  dayName: string;
};

function nextOpenRow(hours: BranchHours, fromDay: number): BranchHours[number] | null {
  for (let step = 1; step <= 7; step += 1) {
    const row = hours.find((item) => item.dayOfWeek === (fromDay + step) % 7);
    if (row && !row.isClosed) return row;
  }
  return null;
}

/** Live open/closed state for a branch, evaluated in Europe/Istanbul. */
export function branchStatus(branch: Branch, now: Date = new Date()): BranchStatus {
  const { day, minutes } = istanbulClock(now);
  const hours = branch.hours ?? [];
  const row = hours.find((item) => item.dayOfWeek === day) ?? null;
  const opens = row && !row.isClosed ? toMinutes(row.opensAt) : null;
  const closes = row && !row.isClosed ? toMinutes(row.closesAt) : null;
  const dayName = DAY_NAMES[day] ?? '';
  const today =
    opens !== null && closes !== null && row
      ? `Bugün ${row.opensAt} – ${row.closesAt}`
      : 'Bugün kapalı';

  if (!branch.isAcceptingOrders) {
    return {
      open: false,
      accepting: false,
      pill: 'Sipariş almıyor',
      detail: today,
      today,
      dayName,
    };
  }
  if (opens === null || closes === null) {
    return {
      open: false,
      accepting: true,
      pill: 'Saat yok',
      detail: 'Çalışma saatleri girilmemiş.',
      today,
      dayName,
    };
  }
  if (minutes < opens) {
    return {
      open: false,
      accepting: true,
      pill: 'Kapalı',
      detail: `Açılış ${row?.opensAt ?? ''} · ${formatSpan(opens - minutes)} kaldı`,
      today,
      dayName,
    };
  }
  if (minutes >= closes) {
    const next = nextOpenRow(hours, day);
    return {
      open: false,
      accepting: true,
      pill: 'Bugün kapandı',
      detail: next ? `Yarın ${next.opensAt} açılış` : 'Yarın için saat girilmemiş.',
      today,
      dayName,
    };
  }
  return {
    open: true,
    accepting: true,
    pill: 'Şu an açık',
    detail: `${row?.closesAt ?? ''} kapanıyor · ${formatSpan(closes - minutes)} kaldı`,
    today,
    dayName,
  };
}

export type Fulfillment = 'both' | 'delivery' | 'pickup' | 'none';

/** Network unit prefix from a branch code: "GAZ-OSMANGAZI" -> "GAZ". */
export function unitTagOf(code: string): string {
  const head = code.split('-')[0] ?? '';
  return head.trim().toLocaleUpperCase('tr-TR');
}

function fulfillmentOf(branch: Branch): Fulfillment {
  const delivery = branch.deliveryEnabled !== false;
  const pickup = branch.pickupEnabled !== false;
  if (delivery && pickup) return 'both';
  if (delivery) return 'delivery';
  if (pickup) return 'pickup';
  return 'none';
}

function fulfillmentLabel(fulfillment: Fulfillment): string {
  if (fulfillment === 'both') return 'Teslimat + gel-al';
  if (fulfillment === 'delivery') return 'Yalnızca teslimat';
  if (fulfillment === 'pickup') return 'Yalnızca gel-al';
  return 'Hizmet dışı';
}

export type BranchView = {
  id: string;
  code: string;
  unitTag: string;
  name: string;
  district: string;
  city: string;
  cityKey: string;
  addressLine: string;
  phone: string | null;
  phoneLabel: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  eta: string | null;
  fulfillment: Fulfillment;
  fulfillmentLabel: string;
  minOrderMinor: string | null;
  deliveryFeeMinor: string | null;
  status: BranchStatus;
  hours: HoursGroup[];
};

function mostCommon(values: Array<string | null | undefined>): string | null {
  const tally = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    tally.set(value, (tally.get(value) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of tally) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/** "+904441399" -> "444 1 399" for the shared contact strip. */
export function formatPhoneLabel(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const national = digits.startsWith('90') ? digits.slice(2) : digits;
  if (national.length === 7) {
    return `${national.slice(0, 3)} ${national.slice(3, 4)} ${national.slice(4)}`;
  }
  return national.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

export function buildBranchViews(
  branches: Branch[],
  now: Date = new Date(),
  origin: BranchPoint | null = null,
): BranchView[] {
  return branches.map((branch) => {
    const { district, city } = branchLocality(branch);
    const point: BranchPoint | null =
      typeof branch.latitude === 'number' && typeof branch.longitude === 'number'
        ? { latitude: branch.latitude, longitude: branch.longitude }
        : null;
    const fulfillment = fulfillmentOf(branch);
    return {
      id: branch.id,
      code: branch.code ?? '',
      unitTag: unitTagOf(branch.code ?? ''),
      name: branch.name,
      district,
      city: turkishUpper(city),
      cityKey: normalizeTr(city) || 'diger',
      addressLine: branch.addressLine,
      phone: branch.phone ?? null,
      phoneLabel: formatPhoneLabel(branch.phone ?? null),
      latitude: point ? point.latitude : null,
      longitude: point ? point.longitude : null,
      distanceKm: origin && point ? distanceKm(origin, point) : null,
      eta: formatDeliveryWindow(
        branch.estimatedDeliveryMinutesMin ?? 0,
        branch.estimatedDeliveryMinutesMax ?? 0,
      ),
      fulfillment,
      fulfillmentLabel: fulfillmentLabel(fulfillment),
      minOrderMinor: branch.minOrderMinor ?? null,
      deliveryFeeMinor: branch.deliveryFeeMinor ?? null,
      status: branchStatus(branch, now),
      hours: groupOperatingHours(branch.hours ?? []),
    };
  });
}

export type NetworkFacts = {
  minOrderMinor: string | null;
  deliveryFeeMinor: string | null;
  phone: string | null;
  phoneLabel: string;
  openCount: number;
  closedCount: number;
  cityCount: number;
};

/** Facts every branch shares, hoisted out of the cards so cards stay about differences. */
export function networkFacts(views: BranchView[]): NetworkFacts {
  const phone = mostCommon(views.map((view) => view.phone));
  return {
    minOrderMinor: mostCommon(views.map((view) => view.minOrderMinor)),
    deliveryFeeMinor: mostCommon(views.map((view) => view.deliveryFeeMinor)),
    phone,
    phoneLabel: formatPhoneLabel(phone),
    openCount: views.filter((view) => view.status.open).length,
    closedCount: views.filter((view) => !view.status.open).length,
    cityCount: new Set(views.map((view) => view.cityKey)).size,
  };
}

/** Closest branch currently taking orders, or null when no distances are known. */
export function nearestBranchId(views: BranchView[]): string | null {
  let best: BranchView | null = null;
  for (const view of views) {
    if (view.distanceKm === null || !view.status.open) continue;
    if (!best || (view.distanceKm ?? 0) < (best.distanceKm ?? 0)) best = view;
  }
  return best ? best.id : null;
}

export type SortMode = 'distance' | 'eta' | 'az';

export type FinderState = {
  q: string;
  city: string;
  openOnly: boolean;
  deliveryOnly: boolean;
  pickupOnly: boolean;
  sort: SortMode;
  focusId: string | null;
};

export const DEFAULT_FINDER: FinderState = {
  q: '',
  city: ALL_CITIES,
  openOnly: false,
  deliveryOnly: false,
  pickupOnly: false,
  sort: 'eta',
  focusId: null,
};

export function searchBlob(view: BranchView): string {
  return normalizeTr(
    [view.name, view.code, view.district, view.city, view.addressLine].filter(Boolean).join(' '),
  );
}

/** Every query token must appear in the branch identity, code or address. */
export function matchesQuery(view: BranchView, query: string): boolean {
  const tokens = normalizeTr(query)
    .split(' ')
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return true;
  const blob = searchBlob(view);
  return tokens.every((token) => blob.includes(token));
}

export function applyFinder(views: BranchView[], state: FinderState): BranchView[] {
  const collator = new Intl.Collator('tr');
  const filtered = views.filter((view) => {
    if (state.city !== ALL_CITIES && view.cityKey !== normalizeTr(state.city)) return false;
    if (state.openOnly && !view.status.open) return false;
    if (state.deliveryOnly && view.fulfillment !== 'both' && view.fulfillment !== 'delivery') {
      return false;
    }
    if (state.pickupOnly && view.fulfillment !== 'both' && view.fulfillment !== 'pickup') {
      return false;
    }
    return matchesQuery(view, state.q);
  });

  return [...filtered].sort((a, b) => {
    if (state.sort === 'distance') {
      if (a.distanceKm === null && b.distanceKm === null) return collator.compare(a.name, b.name);
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return collator.compare(a.name, b.name);
    }
    if (state.sort === 'eta') {
      if (a.status.open !== b.status.open) return a.status.open ? -1 : 1;
      return collator.compare(a.name, b.name);
    }
    return collator.compare(a.name, b.name);
  });
}

const SORTS: SortMode[] = ['distance', 'eta', 'az'];

/** Filters live in the URL so a filtered view can be shared or reloaded. */
export function readFinderState(search: string): FinderState {
  const params = new URLSearchParams(search);
  const city = params.get('city');
  const sort = params.get('sort');
  return {
    q: params.get('q') ?? '',
    city: city && city.length > 0 ? turkishUpper(city) : ALL_CITIES,
    openOnly: params.get('acik') === '1',
    deliveryOnly: params.get('teslimat') === '1',
    pickupOnly: params.get('gelal') === '1',
    sort: sort && SORTS.includes(sort as SortMode) ? (sort as SortMode) : DEFAULT_FINDER.sort,
    focusId: params.get('sube'),
  };
}

export function finderSearch(state: FinderState): string {
  const params = new URLSearchParams();
  if (state.q.trim().length > 0) params.set('q', state.q.trim());
  if (state.city !== ALL_CITIES) params.set('city', state.city);
  if (state.openOnly) params.set('acik', '1');
  if (state.deliveryOnly) params.set('teslimat', '1');
  if (state.pickupOnly) params.set('gelal', '1');
  if (state.sort !== DEFAULT_FINDER.sort) params.set('sort', state.sort);
  if (state.focusId) params.set('sube', state.focusId);
  const query = params.toString();
  return query.length > 0 ? `?${query}` : '';
}
