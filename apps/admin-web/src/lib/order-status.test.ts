import { describe, expect, it } from 'vitest';

import {
  ORDER_STATUS_LABEL,
  RAIL_STEP_COUNT,
  STATUS_GROUPS,
  allowedTransitions,
  paymentLabel,
  paymentTone,
  railIndexForStatus,
  statusGroupOf,
} from './order-status';

describe('order-status helpers', () => {
  it('groups statuses', () => {
    expect(statusGroupOf('PAID')).toBe('active');
    expect(statusGroupOf('PREPARING')).toBe('active');
    expect(statusGroupOf('DELIVERED')).toBe('completed');
    expect(statusGroupOf('REFUNDED')).toBe('refunded');
    expect(statusGroupOf('UNKNOWN')).toBeNull();
  });

  it('exposes status group arrays', () => {
    expect(STATUS_GROUPS.waiting).toEqual(expect.arrayContaining(['BRANCH_ASSIGNED', 'PREPARING']));
  });

  it('translates payment status', () => {
    expect(paymentLabel('PAID')).toBe('Ödendi');
    expect(paymentLabel('REFUNDED')).toBe('İade edildi');
    expect(paymentLabel(null)).toBe('—');
  });

  it('maps payment tones', () => {
    expect(paymentTone('PAID')).toBe('ready');
    expect(paymentTone('FAILED')).toBe('critical');
    expect(paymentTone(null)).toBe('idle');
  });

  it('returns transitions', () => {
    expect(allowedTransitions('PAID')).toEqual(
      expect.arrayContaining(['BRANCH_ASSIGNED', 'CANCELLED', 'REFUND_PENDING']),
    );
  });

  it('keeps label dictionary stable', () => {
    expect(ORDER_STATUS_LABEL.PREPARING).toBe('Hazırlanıyor');
    expect(ORDER_STATUS_LABEL.READY_FOR_COURIER).toBe('Paketlendi');
  });

  it('maps order status to admin rail index (ADR-012)', () => {
    expect(RAIL_STEP_COUNT).toBe(6);
    // New orders land on the first visible step (Hazırlanıyor) — paying
    // and branch selection are auto-completed upstream.
    expect(railIndexForStatus('BRANCH_ASSIGNED')).toBe(1);
    expect(railIndexForStatus('PAID')).toBe(1);
    // Backward-compat: historical BRANCH_ACCEPTED rows collapse to PREPARING.
    expect(railIndexForStatus('BRANCH_ACCEPTED')).toBe(1);
    expect(railIndexForStatus('PREPARING')).toBe(1);
    expect(railIndexForStatus('READY_FOR_COURIER')).toBe(2);
    expect(railIndexForStatus('COURIER_ASSIGNED')).toBe(3);
    expect(railIndexForStatus('PICKED_UP')).toBe(3);
    expect(railIndexForStatus('ON_THE_WAY')).toBe(4);
    expect(railIndexForStatus('DELIVERED')).toBe(5);
    expect(railIndexForStatus('CANCELLED')).toBe(5);
    expect(railIndexForStatus('REJECTED')).toBe(5);
    expect(railIndexForStatus('REFUND_PENDING')).toBe(5);
    expect(railIndexForStatus('PARTIALLY_REFUNDED')).toBe(5);
    expect(railIndexForStatus('REFUNDED')).toBe(5);
    expect(railIndexForStatus('UNKNOWN')).toBe(1);
  });
});
