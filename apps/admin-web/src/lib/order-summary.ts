import { formatTryMinor } from '@fastfood/contracts';

import { formatElapsed } from './ops-time';
import type { OrderSummaryResponse } from './order-summary-types';

export interface SummaryKpisView {
  activeCount: number;
  prepCount: number;
  deliveredToday: number;
  grossTodayLabel: string;
  refundsTodayLabel: string;
  avgTicketLabel: string;
  cancellationRateLabel: string;
}

const EMPTY_KPIS: SummaryKpisView = {
  activeCount: 0,
  prepCount: 0,
  deliveredToday: 0,
  grossTodayLabel: '—',
  refundsTodayLabel: '—',
  avgTicketLabel: '—',
  cancellationRateLabel: '—',
};

export function summarizeKpis(
  raw: OrderSummaryResponse['data']['kpis'] | undefined,
): SummaryKpisView {
  if (!raw) return EMPTY_KPIS;
  const bps = Number(raw.cancellationRateBps ?? 0);
  return {
    activeCount: Number(raw.activeCount ?? 0),
    prepCount: Number(raw.prepCount ?? 0),
    deliveredToday: Number(raw.deliveredToday ?? 0),
    grossTodayLabel: formatTryMinor(String(raw.grossTodayMinor ?? '0'), 'TRY'),
    refundsTodayLabel: formatTryMinor(String(raw.refundsTodayMinor ?? '0'), 'TRY'),
    avgTicketLabel: formatTryMinor(String(raw.avgTicketMinor ?? '0'), 'TRY'),
    cancellationRateLabel: `${(bps / 100).toFixed(1)}%`,
  };
}

/**
 * Counts each status bucket from the summary payload and returns the total
 * for the requested status group. Used to keep the KPI strip aligned with
 * the active filter tab so the users never see a mismatch between the
 * top metrics and the data grid below.
 */
export function countForGroup(
  counts: Record<string, number> | undefined,
  statuses: readonly string[],
): number {
  if (!counts) return 0;
  let total = 0;
  for (const status of statuses) {
    total += Number(counts[status] ?? 0);
  }
  return total;
}
export function ageTone(ageMinutes: number): 'idle' | 'amber' | 'critical' {
  if (ageMinutes >= 15) return 'critical';
  if (ageMinutes >= 5) return 'amber';
  return 'idle';
}

export function orderAge(createdAt: string | undefined, now = new Date()): string {
  if (!createdAt) return '—';
  return formatElapsed(createdAt, now);
}

export function orderAgeMinutes(createdAt: string | undefined, now = new Date()): number {
  if (!createdAt) return 0;
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60_000));
}
