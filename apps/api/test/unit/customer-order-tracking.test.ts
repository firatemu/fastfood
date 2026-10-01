import { describe, expect, it } from 'vitest';

import {
  customerSafeStatusLabel,
  customerTrackerKind,
  deriveCustomerEta,
  isCourierLocationEligible,
  locationFreshness,
  mapOrderStatusToStitchStepperIndex,
  shortenCourierDisplayName,
} from '../../src/modules/order/customer-order-presentation.js';

describe('customer order tracker mapping', () => {
  it('maps operational statuses onto the 4-stage Stitch stepper', () => {
    expect(mapOrderStatusToStitchStepperIndex('PAID')).toBe(0);
    // Backward-compat: historical BRANCH_ACCEPTED rows collapse to the
    // PREPARING phase (ADR-012).
    expect(mapOrderStatusToStitchStepperIndex('BRANCH_ACCEPTED')).toBe(1);
    expect(mapOrderStatusToStitchStepperIndex('PREPARING')).toBe(1);
    expect(mapOrderStatusToStitchStepperIndex('READY_FOR_COURIER')).toBe(1);
    expect(mapOrderStatusToStitchStepperIndex('COURIER_ASSIGNED')).toBe(2);
    expect(mapOrderStatusToStitchStepperIndex('ON_THE_WAY')).toBe(2);
    expect(mapOrderStatusToStitchStepperIndex('DELIVERED')).toBe(3);
  });

  it('does not force cancelled or rejected onto the happy-path stepper', () => {
    expect(mapOrderStatusToStitchStepperIndex('CANCELLED')).toBe(-1);
    expect(mapOrderStatusToStitchStepperIndex('REJECTED')).toBe(-1);
    expect(mapOrderStatusToStitchStepperIndex('PAYMENT_FAILED')).toBe(-1);
    expect(customerTrackerKind('CANCELLED')).toBe('cancelled');
    expect(customerTrackerKind('REJECTED')).toBe('rejected');
  });

  it('adapts pickup ready as stage 2 instead of courier', () => {
    expect(mapOrderStatusToStitchStepperIndex('READY_FOR_COURIER', 'PICKUP')).toBe(2);
    expect(customerSafeStatusLabel('READY_FOR_COURIER', 'PICKUP')).toBe('Teslime hazır');
  });
});

describe('ETA derivation', () => {
  it('uses scheduledFor when it is in the future', () => {
    const now = new Date('2026-09-19T18:00:00.000Z');
    const scheduledFor = new Date('2026-09-19T18:40:00.000Z');
    const eta = deriveCustomerEta({
      status: 'PREPARING',
      fulfillmentMode: 'DELIVERY',
      scheduledFor,
      estimatedDeliveryMinutesMin: 25,
      estimatedDeliveryMinutesMax: 35,
      now,
    });
    expect(eta.source).toBe('scheduled_for');
    expect(eta.remainingMinutes).toBe(40);
  });

  it('derives remaining minutes from branch estimate and status', () => {
    const eta = deriveCustomerEta({
      status: 'ON_THE_WAY',
      fulfillmentMode: 'DELIVERY',
      estimatedDeliveryMinutesMin: 25,
      estimatedDeliveryMinutesMax: 40,
      now: new Date('2026-09-19T18:00:00.000Z'),
    });
    expect(eta.source).toBe('branch_estimate');
    expect(eta.kind).toBe('delivery');
    expect(eta.remainingMinutes).toBe(10);
  });

  it('clears ETA for cancelled orders', () => {
    const eta = deriveCustomerEta({
      status: 'CANCELLED',
      fulfillmentMode: 'DELIVERY',
      estimatedDeliveryMinutesMin: 25,
      estimatedDeliveryMinutesMax: 35,
    });
    expect(eta.remainingMinutes).toBeNull();
    expect(eta.kind).toBe('none');
  });
});

describe('courier location freshness', () => {
  it('marks a point current within 90s and stale after', () => {
    const now = Date.parse('2026-09-19T18:00:00.000Z');
    expect(locationFreshness(new Date(now - 10_000), now)).toBe('current');
    expect(locationFreshness(new Date(now - 91_000), now)).toBe('stale');
    expect(locationFreshness(null, now)).toBe('unavailable');
  });

  it('allows location only for active delivery courier states', () => {
    expect(isCourierLocationEligible('ON_THE_WAY', 'DELIVERY')).toBe(true);
    expect(isCourierLocationEligible('PREPARING', 'DELIVERY')).toBe(false);
    expect(isCourierLocationEligible('ON_THE_WAY', 'PICKUP')).toBe(false);
    expect(isCourierLocationEligible('DELIVERED', 'DELIVERY')).toBe(false);
  });

  it('shortens courier names without exposing extra personal data', () => {
    expect(shortenCourierDisplayName('Ahmet Yılmaz')).toBe('Ahmet Y.');
  });
});
