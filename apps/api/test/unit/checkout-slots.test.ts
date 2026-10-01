import { describe, expect, it } from 'vitest';

import { isEligibleScheduledInstant, listEligibleSlots } from '../../src/modules/checkout/checkout-slots.js';

const HOURS = [
  { dayOfWeek: 1, opensAt: '09:00', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 2, opensAt: '09:00', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 3, opensAt: '09:00', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 4, opensAt: '09:00', closesAt: '23:00', isClosed: false },
  { dayOfWeek: 5, opensAt: '09:00', closesAt: '00:00', isClosed: false },
  { dayOfWeek: 6, opensAt: '10:00', closesAt: '00:00', isClosed: false },
  { dayOfWeek: 0, opensAt: '10:00', closesAt: '22:00', isClosed: false },
];

describe('checkout eligible slots', () => {
  it('returns empty slots when the branch is closed that day', () => {
    const closed = HOURS.map((row) => ({ ...row, isClosed: true }));
    const slots = listEligibleSlots({ now: new Date('2026-09-21T10:00:00+03:00'), hours: closed });
    expect(slots).toEqual([]);
  });

  it('starts after prep time and stays inside the horizon', () => {
    const now = new Date('2026-09-21T12:00:00+03:00');
    const slots = listEligibleSlots({ now, hours: HOURS });
    expect(slots.length).toBeGreaterThan(0);
    const first = new Date(slots[0]!.startAt);
    expect(first.getTime()).toBeGreaterThanOrEqual(now.getTime() + 20 * 60_000 - 60_000);
    const last = new Date(slots[slots.length - 1]!.startAt);
    expect(last.getTime()).toBeLessThanOrEqual(now.getTime() + 4 * 60 * 60_000 + 60_000);
    expect(isEligibleScheduledInstant(first, HOURS, now)).toBe(true);
  });
});
