import { describe, expect, it } from 'vitest';

import { groupOperatingHours } from './hours';

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
