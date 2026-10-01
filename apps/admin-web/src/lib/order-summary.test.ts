import { describe, expect, it } from 'vitest';

import { ageTone, orderAge, orderAgeMinutes, summarizeKpis } from './order-summary';

describe('order-summary helpers', () => {
  it('formats KPI amounts in TRY', () => {
    const view = summarizeKpis({
      activeCount: 12,
      prepCount: 4,
      deliveredToday: 18,
      grossTodayMinor: '125000',
      refundsTodayMinor: '1500',
      avgTicketMinor: '5500',
      cancellationRateBps: 425,
    });
    expect(view.grossTodayLabel).toContain('1');
    expect(view.refundsTodayLabel).toMatch(/15/);
    expect(view.avgTicketLabel).toMatch(/55/);
    expect(view.cancellationRateLabel).toBe('4.3%');
    expect(view.activeCount).toBe(12);
    expect(view.prepCount).toBe(4);
    expect(view.deliveredToday).toBe(18);
  });

  it('returns placeholders for empty summary', () => {
    expect(summarizeKpis(undefined).grossTodayLabel).toBe('—');
  });

  it('computes age and tone', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    const twentyMinAgo = new Date(now.getTime() - 20 * 60_000).toISOString();
    expect(orderAge(twentyMinAgo, now)).toBe('20 dk');
    expect(orderAgeMinutes(twentyMinAgo, now)).toBe(20);
    expect(ageTone(20)).toBe('critical');
    expect(ageTone(7)).toBe('amber');
    expect(ageTone(2)).toBe('idle');
  });
});
