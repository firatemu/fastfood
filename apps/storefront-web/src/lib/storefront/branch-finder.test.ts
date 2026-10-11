import { describe, expect, it } from 'vitest';

import {
  ALL_CITIES,
  DEFAULT_FINDER,
  applyFinder,
  branchLocality,
  branchStatus,
  buildBranchViews,
  cityGroups,
  finderSearch,
  formatPhoneLabel,
  formatSpan,
  matchesQuery,
  networkFacts,
  normalizeTr,
  readFinderState,
  turkishUpper,
  type Branch,
  type BranchView,
  type FinderState,
} from './branch-finder';
import type { CustomerBranch } from './discover';

const WEEK = [
  { dayOfWeek: 0, opensAt: '12:00', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 1, opensAt: '11:30', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 2, opensAt: '11:30', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 3, opensAt: '11:30', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 4, opensAt: '11:30', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 5, opensAt: '11:30', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 6, opensAt: '11:30', closesAt: '23:00', isClosed: false },
];

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: '01900000-0000-7000-8000-00010e359a1a',
    code: 'ADA-T-OZAL',
    name: 'T. ÖZAL',
    addressLine: 'Turgut Özal Bulvarı Mahfesığmaz Mahallesi, Çukurova/Adana',
    latitude: 37.040278,
    longitude: 35.314167,
    phone: '+904441399',
    isActive: true,
    isAcceptingOrders: true,
    minOrderMinor: '5000',
    deliveryFeeMinor: '1500',
    estimatedDeliveryMinutesMin: 25,
    estimatedDeliveryMinutesMax: 35,
    storyBody: null,
    imageUrl: null,
    pickupEnabled: true,
    deliveryEnabled: true,
    hours: WEEK,
    ...overrides,
  } as CustomerBranch;
}

function at(views: BranchView[], index: number): BranchView {
  const view = views[index];
  if (!view) throw new Error(`test fixture ${index} is missing`);
  return view;
}

const WEDNESDAY_NOON = new Date('2026-03-11T10:00:00Z'); // 13:00 in Istanbul
const WEDNESDAY_MORNING = new Date('2026-03-11T07:00:00Z'); // 10:00 in Istanbul
const WEDNESDAY_NIGHT = new Date('2026-03-11T20:30:00Z'); // 23:30 in Istanbul

describe('normalizeTr / turkishUpper', () => {
  it('folds Turkish letters so ASCII and Turkish spellings match', () => {
    expect(normalizeTr('GAZIANTEP')).toBe(normalizeTr('Gaziantep'));
    expect(normalizeTr('Çukurova')).toBe('cukurova');
    expect(normalizeTr('Şişli')).toBe('sisli');
  });

  it('rewrites city labels in Turkish letters', () => {
    expect(turkishUpper('gaziantep')).toBe('GAZİANTEP');
    expect(turkishUpper('mersin')).toBe('MERSİN');
    expect(turkishUpper('osmaniye')).toBe('OSMANİYE');
  });
});

describe('branchLocality', () => {
  it('splits district and city from the address tail', () => {
    const locality = branchLocality({
      addressLine: 'Kurtuluş Mah. Şinasi Efendi Caddesi No:15/A, Seyhan/Adana',
    } as CustomerBranch);
    expect(locality.district).toBe('Seyhan');
    expect(locality.city).toBe('Adana');
  });

  it('handles a single-token head such as OSMANGAZİ/GAZİANTEP', () => {
    const locality = branchLocality({ addressLine: 'OSMANGAZİ/GAZİANTEP' } as CustomerBranch);
    expect(locality.district).toBe('OSMANGAZİ');
    expect(locality.city).toBe('GAZİANTEP');
  });
});

describe('cityGroups', () => {
  it('collapses ASCII and Turkish spellings and orders the rail', () => {
    const groups = cityGroups([
      makeBranch({ addressLine: 'Çukurova/Adana' }),
      makeBranch({ addressLine: 'OSMANGAZİ/GAZIANTEP' }),
      makeBranch({ addressLine: 'BATIKENT/GAZİANTEP' }),
      makeBranch({ addressLine: 'Mezitli/MERSIN' }),
      makeBranch({ addressLine: 'Merkez/OSMANIYE' }),
    ]);
    expect(groups).toEqual([
      { key: 'adana', label: 'ADANA', count: 1 },
      { key: 'gaziantep', label: 'GAZİANTEP', count: 2 },
      { key: 'mersin', label: 'MERSİN', count: 1 },
      { key: 'osmaniye', label: 'OSMANİYE', count: 1 },
    ]);
  });
});

describe('formatSpan / formatPhoneLabel', () => {
  it('formats remaining time compactly', () => {
    expect(formatSpan(45)).toBe('45 dk');
    expect(formatSpan(120)).toBe('2 sa');
    expect(formatSpan(134)).toBe('2 sa 14 dk');
    expect(formatSpan(-5)).toBe('0 dk');
  });

  it('formats the shared call centre number', () => {
    expect(formatPhoneLabel('+904441399')).toBe('444 1 399');
    expect(formatPhoneLabel(null)).toBe('');
  });
});

describe('branchStatus', () => {
  it('reports open with the remaining time inside the window', () => {
    const status = branchStatus(makeBranch(), WEDNESDAY_NOON);
    expect(status.open).toBe(true);
    expect(status.pill).toBe('Şu an açık');
    expect(status.detail).toBe('23:00 kapanıyor · 10 sa kaldı');
    expect(status.today).toBe('Bugün 11:30 – 23:00');
  });

  it('reports closed before opening with the countdown', () => {
    const status = branchStatus(makeBranch(), WEDNESDAY_MORNING);
    expect(status.open).toBe(false);
    expect(status.pill).toBe('Kapalı');
    expect(status.detail).toBe('Açılış 11:30 · 1 sa 30 dk kaldı');
  });

  it('reports the next opening day after closing time', () => {
    const status = branchStatus(makeBranch(), WEDNESDAY_NIGHT);
    expect(status.open).toBe(false);
    expect(status.pill).toBe('Bugün kapandı');
    expect(status.detail).toBe('Yarın 11:30 açılış');
  });

  it('wins over the hour table when the branch is not accepting orders', () => {
    const status = branchStatus(makeBranch({ isAcceptingOrders: false }), WEDNESDAY_NOON);
    expect(status.open).toBe(false);
    expect(status.accepting).toBe(false);
    expect(status.pill).toBe('Sipariş almıyor');
  });

  it('falls back when the branch has no hours', () => {
    const status = branchStatus(makeBranch({ hours: [] }), WEDNESDAY_NOON);
    expect(status.open).toBe(false);
    expect(status.pill).toBe('Saat yok');
    expect(status.today).toBe('Bugün kapalı');
  });
});

describe('buildBranchViews / networkFacts', () => {
  const views = buildBranchViews(
    [
      makeBranch({ id: 'a', name: 'M1 ŞUBE', code: 'ADA-M1', addressLine: 'Çukurova/Adana' }),
      makeBranch({
        id: 'b',
        name: 'MERSİN MEZİTLİ',
        code: 'MER-MEZITLI',
        addressLine: 'Mezitli/MERSIN',
        isAcceptingOrders: false,
        deliveryEnabled: false,
        pickupEnabled: false,
      }),
    ],
    WEDNESDAY_NOON,
  );

  it('exposes locality, status and fulfilment per branch', () => {
    expect(at(views, 0).city).toBe('ADANA');
    expect(at(views, 0).eta).toBe('25-35 dk');
    expect(at(views, 1).city).toBe('MERSİN');
    expect(at(views, 1).fulfillment).toBe('none');
    expect(at(views, 1).status.open).toBe(false);
  });

  it('measures distance only when an origin is given', () => {
    const withoutOrigin = buildBranchViews([makeBranch()], WEDNESDAY_NOON);
    expect(at(withoutOrigin, 0).distanceKm).toBeNull();
    const withOrigin = buildBranchViews([makeBranch()], WEDNESDAY_NOON, {
      latitude: 37.04,
      longitude: 35.314167,
    });
    expect(at(withOrigin, 0).distanceKm).not.toBeNull();
  });

  it('hoists the facts every branch shares', () => {
    const facts = networkFacts(views);
    expect(facts.minOrderMinor).toBe('5000');
    expect(facts.deliveryFeeMinor).toBe('1500');
    expect(facts.phoneLabel).toBe('444 1 399');
    expect(facts.openCount).toBe(1);
    expect(facts.closedCount).toBe(1);
    expect(facts.cityCount).toBe(2);
  });
});

describe('matchesQuery / applyFinder', () => {
  const views = buildBranchViews(
    [
      makeBranch({ id: 'a', name: 'M1 ŞUBE', code: 'ADA-M1', addressLine: 'Çukurova/Adana' }),
      makeBranch({
        id: 'b',
        name: 'ÜRETİM',
        code: 'ADA-URETIM',
        addressLine: 'Şehitkamil/GAZIANTEP',
      }),
      makeBranch({
        id: 'c',
        name: 'MERSİN YENİŞEHİR',
        code: 'MER-YENISEHIR',
        addressLine: 'Yenişehir/MERSIN',
        deliveryEnabled: false,
        isAcceptingOrders: false,
      }),
    ],
    WEDNESDAY_NOON,
  );

  it('matches name, code, district and city', () => {
    expect(matchesQuery(at(views, 0), 'm1')).toBe(true);
    expect(matchesQuery(at(views, 0), 'çukurova')).toBe(true);
    expect(matchesQuery(at(views, 1), 'gaziantep')).toBe(true);
    expect(matchesQuery(at(views, 1), 'üretim şehitkamil')).toBe(true);
    expect(matchesQuery(at(views, 1), 'üretim zeytin')).toBe(false);
  });

  it('filters by city even when the stored spelling differs', () => {
    const result = applyFinder(views, { ...DEFAULT_FINDER, city: 'GAZİANTEP' });
    expect(result.map((view) => view.id)).toEqual(['b']);
    expect(applyFinder(views, { ...DEFAULT_FINDER, city: ALL_CITIES })).toHaveLength(3);
  });

  it('filters by fulfilment and open state', () => {
    expect(
      applyFinder(views, { ...DEFAULT_FINDER, deliveryOnly: true }).map((view) => view.id),
    ).toEqual(['a', 'b']);
    expect(
      applyFinder(views, { ...DEFAULT_FINDER, pickupOnly: true }).map((view) => view.id),
    ).toEqual(['a', 'b', 'c']);
    expect(
      applyFinder(views, { ...DEFAULT_FINDER, openOnly: true }).map((view) => view.id),
    ).toEqual(['a', 'b']);
  });

  it('sorts by distance when an origin is known and alphabetically otherwise', () => {
    const located = buildBranchViews(
      [
        makeBranch({ id: 'far', name: 'UZAK', latitude: 36.2, longitude: 35.2 }),
        makeBranch({ id: 'near', name: 'YAKIN', latitude: 37.02, longitude: 35.3 }),
      ],
      WEDNESDAY_NOON,
      { latitude: 37.0, longitude: 35.25 },
    );
    expect(
      applyFinder(located, { ...DEFAULT_FINDER, sort: 'distance' }).map((view) => view.id),
    ).toEqual(['near', 'far']);
    expect(applyFinder(located, { ...DEFAULT_FINDER, sort: 'az' }).map((view) => view.id)).toEqual([
      'far',
      'near',
    ]);
  });

  it('puts open branches first for the default sort', () => {
    const result = applyFinder(views, DEFAULT_FINDER);
    expect(result.map((view) => view.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('finder URL state', () => {
  it('round-trips through the query string', () => {
    const state: FinderState = {
      q: 'çukurova',
      city: 'ADANA',
      openOnly: true,
      deliveryOnly: false,
      pickupOnly: true,
      sort: 'distance',
      focusId: 'abc',
    };
    expect(readFinderState(finderSearch(state))).toEqual(state);
  });

  it('falls back to defaults for unknown values', () => {
    expect(readFinderState('?sort=bogus&acik=0')).toEqual(DEFAULT_FINDER);
    expect(readFinderState('')).toEqual({ ...DEFAULT_FINDER, city: ALL_CITIES });
  });
});
