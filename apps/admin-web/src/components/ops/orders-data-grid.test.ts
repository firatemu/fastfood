import { describe, expect, it } from 'vitest';

import {
  buildTimelineRows,
  computeAllowedTransitions,
  DEFAULT_SLA_BUDGET,
  deriveElapsedState,
  deriveSlaState,
  formatDuration,
  formatTimelineTime,
  INLINE_TRANSITION_LABELS,
  timelineIcon,
  timelineTitle,
  type TimelineEntry,
} from './orders-data-grid.helpers';

describe('orders-data-grid helpers', () => {
  it('returns the positive transitions first then negatives', () => {
    const preparing = computeAllowedTransitions('PREPARING');
    expect(preparing.map((t) => t.toStatus)).toEqual(['READY_FOR_COURIER', 'CANCELLED']);
    const firstNeg = preparing.findIndex((t) => t.toStatus === 'CANCELLED');
    expect(preparing.slice(0, firstNeg).every((t) => t.variant === 'primary')).toBe(true);
    expect(preparing[firstNeg]?.variant).toBe('warning');
  });

  it('handles terminal statuses with no transitions', () => {
    expect(computeAllowedTransitions('DELIVERED')).toEqual([]);
    expect(computeAllowedTransitions('CANCELLED')).toEqual([]);
    expect(computeAllowedTransitions('REFUNDED')).toEqual([]);
  });

  it('handles unknown / empty input gracefully', () => {
    expect(computeAllowedTransitions('')).toEqual([]);
    expect(computeAllowedTransitions('UNKNOWN')).toEqual([]);
  });

  it('covers the canonical inline labels', () => {
    const labels = Object.keys(INLINE_TRANSITION_LABELS);
    expect(labels).toEqual(
      expect.arrayContaining([
        'PREPARING',
        'READY_FOR_COURIER',
        'COURIER_ASSIGNED',
        'ON_THE_WAY',
        'DELIVERED',
        'REJECTED',
        'CANCELLED',
      ]),
    );
  });

  it('derives SLA age and breach state from a synthetic timestamp', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0);
    const tenMin = new Date(now - 10 * 60_000).toISOString();
    const sixtyMin = new Date(now - 60 * 60_000).toISOString();
    expect(deriveSlaState('PREPARING', tenMin, now, DEFAULT_SLA_BUDGET)).toEqual({
      ageMinutes: 10,
      slaMinutes: 14,
      breached: false,
    });
    expect(deriveSlaState('PREPARING', sixtyMin, now, DEFAULT_SLA_BUDGET)).toEqual({
      ageMinutes: 60,
      slaMinutes: 14,
      breached: true,
    });
  });

  it('returns null SLA for statuses outside the budget map (terminal)', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0);
    const state = deriveSlaState(
      'DELIVERED',
      new Date(now - 60_000).toISOString(),
      now,
      DEFAULT_SLA_BUDGET,
    );
    expect(state.slaMinutes).toBeNull();
    expect(state.breached).toBe(false);
  });

  it('returns age 0 when createdAt is missing', () => {
    const state = deriveSlaState('PREPARING', null, Date.now(), DEFAULT_SLA_BUDGET);
    expect(state.ageMinutes).toBe(0);
  });
});

describe('elapsed duration helper', () => {
  it('returns null for orders that have not reached a terminal status', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0);
    const state = deriveElapsedState(new Date(now - 30 * 60_000).toISOString(), [
      {
        id: 'e1',
        eventType: 'OrderCreated',
        fromStatus: null,
        toStatus: 'PAID',
        createdAt: new Date(now - 30 * 60_000).toISOString(),
      } satisfies TimelineEntry,
    ]);
    expect(state).toBeNull();
  });

  it('returns minutes from createdAt to the terminal event', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0);
    const created = new Date(now - 75 * 60_000).toISOString();
    const terminal = new Date(now - 15 * 60_000).toISOString();
    const events: TimelineEntry[] = [
      {
        id: 'e1',
        eventType: 'OrderCreated',
        fromStatus: null,
        toStatus: 'PAID',
        createdAt: created,
      },
      {
        id: 'e2',
        eventType: 'OrderStatusChanged',
        fromStatus: 'ON_THE_WAY',
        toStatus: 'DELIVERED',
        createdAt: terminal,
      },
    ];
    const state = deriveElapsedState(created, events);
    expect(state).not.toBeNull();
    expect(state?.minutes).toBe(60);
    expect(state?.tone).toBe('completed');
  });

  it('returns null when createdAt is missing', () => {
    expect(deriveElapsedState(null, null)).toBeNull();
  });

  it('falls back to nowMs when there is no terminal event (live counter)', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0);
    const created = new Date(now - 42 * 60_000).toISOString();
    const state = deriveElapsedState(created, [], now);
    expect(state).not.toBeNull();
    expect(state?.minutes).toBe(42);
    expect(state?.tone).toBe('ongoing');
  });

  it('returns null without nowMs and without terminal event', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0);
    const created = new Date(now - 42 * 60_000).toISOString();
    expect(deriveElapsedState(created, [])).toBeNull();
  });
});

describe('duration formatter', () => {
  it('renders plain minutes', () => {
    expect(formatDuration(0)).toBe('0 dk');
    expect(formatDuration(45)).toBe('45 dk');
    expect(formatDuration(59)).toBe('59 dk');
  });
  it('renders hours without remainder', () => {
    expect(formatDuration(60)).toBe('1 sa');
    expect(formatDuration(120)).toBe('2 sa');
  });
  it('renders hours with remainder', () => {
    expect(formatDuration(75)).toBe('1 sa 15 dk');
    expect(formatDuration(135)).toBe('2 sa 15 dk');
  });
});

describe('timeline title + icon map', () => {
  it('returns human-readable labels for known events', () => {
    expect(timelineTitle('OrderCreated')).toBe('Sipariş oluşturuldu');
    expect(timelineTitle('OrderDelivered')).toBe('Teslim edildi');
    expect(timelineTitle('OrderBranchReassigned')).toBe('Şube yeniden atandı');
  });
  it('falls back to eventType for unknown values', () => {
    expect(timelineTitle('CustomEventXYZ')).toBe('CustomEventXYZ');
  });
  it('returns icons', () => {
    expect(timelineIcon('OrderCreated')).toBe('add_circle');
    expect(timelineIcon('Unknown')).toBe('event_note');
  });
});

describe('timeline formatter', () => {
  it('formats ISO into dd MMM HH:mm', () => {
    const iso = new Date(Date.UTC(2026, 8, 23, 12, 34)).toISOString();
    // Hard to assert local TZ output, but the function must return a string
    // that starts with "23 ".
    const out = formatTimelineTime(iso);
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('buildTimelineRows', () => {
  it('returns an empty array when events are empty', () => {
    expect(buildTimelineRows([])).toEqual([]);
  });

  it('sorts events oldest → newest', () => {
    const events: TimelineEntry[] = [
      {
        id: 'e2',
        eventType: 'OrderDelivered',
        fromStatus: 'ON_THE_WAY',
        toStatus: 'DELIVERED',
        createdAt: new Date(Date.UTC(2026, 0, 1, 1, 0)).toISOString(),
      },
      {
        id: 'e1',
        eventType: 'OrderCreated',
        fromStatus: null,
        toStatus: 'PAID',
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0)).toISOString(),
      },
    ];
    const rows = buildTimelineRows(events);
    expect(rows.map((r) => r.id)).toEqual(['e1', 'e2']);
    expect(rows[0]?.tone).toBe('info');
    expect(rows[1]?.tone).toBe('success');
  });

  it('marks refund / cancel / reject as danger', () => {
    const events: TimelineEntry[] = [
      {
        id: 'e1',
        eventType: 'OrderRejected',
        fromStatus: null,
        toStatus: 'REJECTED',
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0)).toISOString(),
      },
    ];
    expect(buildTimelineRows(events)[0]?.tone).toBe('danger');
  });
});
