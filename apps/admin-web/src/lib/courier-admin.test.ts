import type { AdminCourier } from '@fastfood/contracts';
import { describe, expect, it } from 'vitest';

import {
  courierBranchLabel,
  courierCapacity,
  courierInitials,
  courierLoad,
  createRequestFromDraft,
  EMPTY_COURIER_DRAFT,
  filterCouriers,
  normalizeSearch,
  passwordPolicyState,
  rosterSummary,
  toggleDraftBranch,
  usernameHint,
  validateCourierDraft,
  type CourierDraft,
  type CourierFilter,
} from './courier-admin';

const BRANCH = '01900000-0000-7000-8000-faaaaaaaaaaa';
const OTHER_BRANCH = '01900000-0000-7000-8000-bbbbbbbbbbbb';

function courier(overrides: Partial<AdminCourier> = {}): AdminCourier {
  return {
    id: 'c1',
    userId: 'u1',
    displayName: 'Deniz Yılmaz',
    username: 'deniz.y',
    phone: '05321112233',
    isActive: true,
    maxActiveDeliveries: 3,
    branches: [{ branchId: BRANCH, branchName: 'Kadıköy', isPrimary: true }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('courier presentation helpers', () => {
  it('builds initials from the first two words, Turkish casing', () => {
    expect(courierInitials('Deniz Yılmaz')).toBe('DY');
    expect(courierInitials('  ada   kaya  ')).toBe('AK');
    expect(courierInitials('İpek')).toBe('İP');
  });

  it('never renders an empty avatar for a blank name', () => {
    expect(courierInitials('   ')).toBe('?');
  });

  it('falls back to the default capacity when the stored value is unusable', () => {
    expect(courierCapacity(courier({ maxActiveDeliveries: 0 }))).toBe(3);
    expect(courierCapacity(courier({ maxActiveDeliveries: 8 }))).toBe(8);
  });

  it('caps the load bar so an overbooked courier stays readable', () => {
    expect(courierLoad(courier(), { activeCount: 1, deliveredCount: 0 })).toEqual({
      active: 1,
      capacity: 3,
      percent: 33,
      label: '1 / 3',
    });
    expect(courierLoad(courier(), { activeCount: 9, deliveredCount: 0 }).percent).toBe(100);
    expect(courierLoad(courier(), undefined).label).toBe('0 / 3');
  });

  it('summarises the branch roster the way the roster row shows it', () => {
    expect(courierBranchLabel(courier())).toBe('Kadıköy');
    expect(
      courierBranchLabel(
        courier({
          branches: [
            { branchId: BRANCH, branchName: 'Kadıköy', isPrimary: true },
            { branchId: OTHER_BRANCH, branchName: 'Beşiktaş', isPrimary: false },
            { branchId: 'c', branchName: 'Çankaya', isPrimary: false },
          ],
        }),
      ),
    ).toBe('Kadıköy +2');
    expect(courierBranchLabel(courier({ branches: [] }))).toBe('Şube atanmamış');
  });
});

describe('courier roster filtering', () => {
  const roster: AdminCourier[] = [
    courier(),
    courier({
      id: 'c2',
      displayName: 'Ada Kaya',
      username: 'ada',
      phone: '05443334455',
      branches: [],
    }),
    courier({
      id: 'c3',
      displayName: 'Bora Şen',
      username: 'bora',
      phone: '05556667788',
      isActive: false,
    }),
    courier({
      id: 'c4',
      displayName: 'Cem Aydın',
      username: 'cem',
      phone: null,
      branches: [
        { branchId: BRANCH, branchName: 'Kadıköy', isPrimary: true },
        { branchId: OTHER_BRANCH, branchName: 'Beşiktaş', isPrimary: false },
      ],
    }),
  ];

  function run(filter: CourierFilter, query = '', branchId: string | null = null) {
    return filterCouriers(roster, { query, filter, branchId }).map((c) => c.id);
  }

  it('splits the roster by sign-in state and branch coverage', () => {
    expect(run('all')).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(run('active')).toEqual(['c1', 'c2', 'c4']);
    expect(run('paused')).toEqual(['c3']);
    expect(run('unassigned')).toEqual(['c2']);
    expect(run('all', '', OTHER_BRANCH)).toEqual(['c4']);
  });

  it('searches name, login name, phone and branch name together', () => {
    expect(run('all', 'deniz')).toEqual(['c1']);
    expect(run('all', 'ADA')).toEqual(['c2']);
    expect(run('all', '0532')).toEqual(['c1']);
    expect(run('all', 'beşiktaş')).toEqual(['c4']);
    expect(run('all', 'yok')).toEqual([]);
  });

  it('matches Turkish letters written in either case', () => {
    expect(normalizeSearch('  ÇANKAYA ')).toBe('çankaya');
    expect(run('all', 'ÇANKAYA')).toEqual([]);
    expect(normalizeSearch('IŞIK')).toBe('ışık');
  });

  it('sums the operational totals the header strip shows', () => {
    const summary = rosterSummary(roster, {
      c1: { activeCount: 2, deliveredCount: 10 },
      c3: { activeCount: 1, deliveredCount: 4 },
    });
    expect(summary).toEqual({
      total: 4,
      ready: 3,
      paused: 1,
      unassigned: 1,
      activeDeliveries: 3,
      capacity: 12,
    });
  });
});

describe('courier create draft', () => {
  function draft(overrides: Partial<CourierDraft> = {}): CourierDraft {
    return {
      ...EMPTY_COURIER_DRAFT,
      displayName: 'Deniz Yılmaz',
      username: '  Deniz.Y  ',
      password: 'kurye-sifresi-2026',
      passwordConfirmation: 'kurye-sifresi-2026',
      branchIds: [BRANCH],
      ...overrides,
    };
  }

  it('normalises the username and drops the empty optional fields', () => {
    expect(createRequestFromDraft(draft())).toEqual({
      displayName: 'Deniz Yılmaz',
      username: 'deniz.y',
      password: 'kurye-sifresi-2026',
      maxActiveDeliveries: 3,
      branchIds: [BRANCH],
    });
  });

  it('keeps the phone and the capacity when they were filled in', () => {
    const request = createRequestFromDraft(
      draft({ phone: ' 05321112233 ', maxActiveDeliveries: '7' }),
    );
    expect(request.phone).toBe('05321112233');
    expect(request.maxActiveDeliveries).toBe(7);
  });

  it('de-duplicates the branch selection before sending it', () => {
    expect(
      createRequestFromDraft(draft({ branchIds: [BRANCH, BRANCH, OTHER_BRANCH] })).branchIds,
    ).toEqual([BRANCH, OTHER_BRANCH]);
  });

  it('accepts a complete draft', () => {
    expect(validateCourierDraft(draft())).toBeNull();
  });

  it('requires the two password fields to match before anything else', () => {
    expect(validateCourierDraft(draft({ passwordConfirmation: 'baska-sifre-2026' }))).toBe(
      'Şifreyi iki kez aynı girin.',
    );
  });

  it('explains each missing field in the operations team’s language', () => {
    expect(validateCourierDraft(draft({ displayName: 'D' }))).toBe(
      'Kurye adı en az 2 karakter olmalı.',
    );
    expect(validateCourierDraft(draft({ username: 'de niz' }))).toContain('harf veya rakamla');
    expect(validateCourierDraft(draft({ password: 'kısa', passwordConfirmation: 'kısa' }))).toBe(
      'Şifre en az 12 karakter olmalı.',
    );
    expect(validateCourierDraft(draft({ phone: '0532' }))).toBe(
      'Telefon numarası 10–32 karakter olmalı.',
    );
    expect(validateCourierDraft(draft({ branchIds: [] }))).toBe('Kurye için en az bir şube seçin.');
    expect(validateCourierDraft(draft({ maxActiveDeliveries: '99' }))).toBe(
      'Azami aktif görev 1–20 arasında olmalı.',
    );
  });

  it('guides the username field while typing without blocking an empty one', () => {
    expect(usernameHint('')).toBeNull();
    expect(usernameHint('Deniz.Y')).toBeNull();
    expect(usernameHint('de niz')).toContain('Harf veya rakamla');
  });

  it('reports the password policy as a remaining-character count, not a strength score', () => {
    expect(passwordPolicyState('abc')).toEqual({ met: false, remaining: 9 });
    expect(passwordPolicyState('kurye-sifresi')).toEqual({ met: true, remaining: 0 });
  });

  it('toggles a branch on and off without losing the other picks', () => {
    expect(toggleDraftBranch([], BRANCH)).toEqual([BRANCH]);
    expect(toggleDraftBranch([BRANCH], OTHER_BRANCH)).toEqual([BRANCH, OTHER_BRANCH]);
    expect(toggleDraftBranch([BRANCH, OTHER_BRANCH], BRANCH)).toEqual([OTHER_BRANCH]);
  });
});
