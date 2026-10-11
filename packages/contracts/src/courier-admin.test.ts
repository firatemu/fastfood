import { describe, expect, it } from 'vitest';

import {
  adminCourierBranchesSchema,
  adminCourierCreateSchema,
  adminCourierPasswordSchema,
  adminCourierUpdateSchema,
  courierUsernameSchema,
  normalizeCourierUsername,
} from './courier.js';

const BRANCH = '01900000-0000-7000-8000-faaaaaaaaaaa';
const OTHER_BRANCH = '01900000-0000-7000-8000-bbbbbbbbbbbb';
const VALID_PASSWORD = 'kurye-sifresi-2026';

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Deniz Yılmaz',
    username: 'deniz.y',
    password: VALID_PASSWORD,
    branchIds: [BRANCH],
    ...overrides,
  };
}

describe('courier username contract', () => {
  it('accepts the handles a courier can actually type', () => {
    for (const value of ['deniz.y', 'deniz-y', 'deniz_y', 'abc', 'a1b2c3', 'x'.repeat(32)]) {
      expect(courierUsernameSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it('rejects handles that are ambiguous, too short, or need URL escaping', () => {
    for (const value of ['ab', 'AB', 'deniz y', 'deniz@y', 'deniz.yilmaz+', '.deniz', '']) {
      expect(courierUsernameSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it('normalises casing instead of rejecting it, so a typo cannot fork an account', () => {
    expect(courierUsernameSchema.parse('  Deniz.Yilmaz ')).toBe('deniz.yilmaz');
    expect(courierUsernameSchema.parse('DENIZ')).toBe('deniz');
  });

  it('rejects a handle longer than 32 characters', () => {
    expect(courierUsernameSchema.safeParse('x'.repeat(33)).success).toBe(false);
  });

  it('normalises to the single stored spelling so two accounts cannot collide', () => {
    expect(normalizeCourierUsername('  Deniz.Yilmaz ')).toBe('deniz.yilmaz');
    expect(normalizeCourierUsername('DENIZ.Y')).toBe('deniz.y');
    // Pinned to en-US: a Turkish host locale must not turn "I" into "ı".
    expect(normalizeCourierUsername('IIKLANI')).toBe('iiklani');
  });
});

describe('courier create contract', () => {
  it('requires a branch — a courier without one is not a usable state', () => {
    expect(adminCourierCreateSchema.safeParse(createPayload({ branchIds: [] })).success).toBe(
      false,
    );
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ branchIds: undefined })).success,
    ).toBe(false);
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ branchIds: [BRANCH, OTHER_BRANCH] }))
        .success,
    ).toBe(true);
  });

  it('enforces the shared 12 character password policy', () => {
    expect(adminCourierCreateSchema.safeParse(createPayload({ password: 'kısa' })).success).toBe(
      false,
    );
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ password: 'x'.repeat(257) })).success,
    ).toBe(false);
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ password: 'x'.repeat(12) })).success,
    ).toBe(true);
  });

  it('keeps the active-delivery ceiling inside the agreed range', () => {
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ maxActiveDeliveries: 0 })).success,
    ).toBe(false);
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ maxActiveDeliveries: 21 })).success,
    ).toBe(false);
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ maxActiveDeliveries: 8 })).success,
    ).toBe(true);
  });

  it('stores the username in its normalised spelling', () => {
    const parsed = adminCourierCreateSchema.parse(createPayload({ username: '  Deniz.Y  ' }));
    expect(parsed.username).toBe('deniz.y');
  });

  it('rejects a branch list that is not UUIDs', () => {
    expect(
      adminCourierCreateSchema.safeParse(createPayload({ branchIds: ['asayfa-1'] })).success,
    ).toBe(false);
  });
});

describe('courier update contract', () => {
  it('requires at least one field so a no-op PATCH is reported as invalid', () => {
    expect(adminCourierUpdateSchema.safeParse({}).success).toBe(false);
    expect(adminCourierUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('allows clearing the phone but not shortening it', () => {
    expect(adminCourierUpdateSchema.safeParse({ phone: null }).success).toBe(true);
    expect(adminCourierUpdateSchema.safeParse({ phone: '0532' }).success).toBe(false);
  });
});

describe('courier branch and password sub-resources', () => {
  it('treats the submitted branch list as the complete new roster', () => {
    expect(adminCourierBranchesSchema.safeParse({ branchIds: [] }).success).toBe(false);
    expect(adminCourierBranchesSchema.safeParse({ branchIds: [BRANCH] }).success).toBe(true);
  });

  it('shares the password policy with account creation', () => {
    expect(adminCourierPasswordSchema.safeParse({ password: 'kısa' }).success).toBe(false);
    expect(adminCourierPasswordSchema.safeParse({ password: VALID_PASSWORD }).success).toBe(true);
  });
});
