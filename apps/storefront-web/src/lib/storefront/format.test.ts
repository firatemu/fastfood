import { describe, expect, it } from 'vitest';

import { formatBranchLocation, formatDeliveryWindow, formatRatingBps, formatRelativeTr } from './format';
import { groupOperatingHours } from './hours';

describe('formatDeliveryWindow', () => {
  it('renders min–max when both are set', () => {
    expect(formatDeliveryWindow(25, 35)).toBe('25-35 dk');
  });

  it('returns null when unset', () => {
    expect(formatDeliveryWindow(0, 0)).toBeNull();
  });
});

describe('formatBranchLocation', () => {
  it('appends city from the address line', () => {
    expect(formatBranchLocation('Kadıköy Moda', 'Moda Caddesi 12, Kadıköy, İstanbul')).toBe(
      'Kadıköy Moda, İstanbul',
    );
  });
});

describe('formatRatingBps', () => {
  it('formats bps as one decimal', () => {
    expect(formatRatingBps(490)).toBe('4,9');
  });
});

describe('formatRelativeTr', () => {
  it('labels yesterday', () => {
    const now = Date.parse('2026-09-19T12:00:00Z');
    expect(formatRelativeTr('2026-09-18T12:00:00Z', now)).toBe('Dün');
  });
});

describe('groupOperatingHours', () => {
  it('collapses consecutive identical windows', () => {
    const groups = groupOperatingHours([
      { dayOfWeek: 1, opensAt: '11:30', closesAt: '01:00', isClosed: false },
      { dayOfWeek: 2, opensAt: '11:30', closesAt: '01:00', isClosed: false },
      { dayOfWeek: 3, opensAt: '11:30', closesAt: '01:00', isClosed: false },
      { dayOfWeek: 4, opensAt: '11:30', closesAt: '01:00', isClosed: false },
      { dayOfWeek: 5, opensAt: '11:30', closesAt: '03:00', isClosed: false },
      { dayOfWeek: 6, opensAt: '11:30', closesAt: '03:00', isClosed: false },
      { dayOfWeek: 0, opensAt: '12:00', closesAt: '00:00', isClosed: false },
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Pzt - Per', 'Cuma - Cmt', 'Pazar']);
  });
});
