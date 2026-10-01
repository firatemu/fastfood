import type { z } from 'zod';

import type { homeHoursSchema } from './schemas';

type Hours = z.infer<typeof homeHoursSchema>;

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_SHORT: Record<number, string> = {
  0: 'Pazar',
  1: 'Pzt',
  2: 'Sal',
  3: 'Çar',
  4: 'Per',
  5: 'Cuma',
  6: 'Cmt',
};

export interface HoursGroup {
  label: string;
  opensAt: string;
  closesAt: string;
}

function keyOf(row: Hours): string {
  return `${row.isClosed ? 'x' : 'o'}|${row.opensAt}|${row.closesAt}`;
}

function rangeLabel(days: number[]): string {
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  if (firstDay === undefined) return '';
  const first = DAY_SHORT[firstDay] ?? '';
  if (days.length === 1 || lastDay === undefined) return first;
  const last = DAY_SHORT[lastDay] ?? '';
  return `${first} - ${last}`;
}

export function groupOperatingHours(hours: Hours[]): HoursGroup[] {
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const groups: HoursGroup[] = [];
  let current: { days: number[]; key: string; row: Hours } | null = null;
  for (const day of DAY_ORDER) {
    const row = byDay.get(day);
    if (!row || row.isClosed) {
      if (current) {
        groups.push({
          label: rangeLabel(current.days),
          opensAt: current.row.opensAt,
          closesAt: current.row.closesAt,
        });
        current = null;
      }
      continue;
    }
    const key = keyOf(row);
    if (current && current.key === key) {
      current.days.push(day);
    } else {
      if (current) {
        groups.push({
          label: rangeLabel(current.days),
          opensAt: current.row.opensAt,
          closesAt: current.row.closesAt,
        });
      }
      current = { days: [day], key, row };
    }
  }
  if (current) {
    groups.push({
      label: rangeLabel(current.days),
      opensAt: current.row.opensAt,
      closesAt: current.row.closesAt,
    });
  }
  return groups;
}
