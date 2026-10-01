import { describe, expect, it } from 'vitest';

import { isA1Path, isIntendedA0ScaffoldPath, isOpsShellPath } from './admin-routes';
import { resolveBranchId } from './branch-storage';
import { dashboardMetrics } from './dashboard-metrics';
import { shouldRunKitchenPoll } from './kitchen-poll';
import { isIstanbulToday, istanbulCalendarDate } from './ops-time';
import {
  allowedTransitions,
  canAssignCourier,
  canReassignBranch,
  kdsLane,
  kitchenPrimaryAction,
  orderStatusLabel,
  orderStatusTone,
} from './order-status';

describe('isA1Path', () => {
  it('covers the four golden routes only', () => {
    expect(isA1Path('/')).toBe(true);
    expect(isA1Path('/orders')).toBe(true);
    expect(isA1Path('/orders/abc')).toBe(true);
    expect(isA1Path('/kitchen')).toBe(true);
    expect(isA1Path('/couriers')).toBe(false);
    expect(isA1Path('/login')).toBe(false);
    expect(isA1Path('/catalog/products')).toBe(false);
  });
});

describe('isOpsShellPath A6 coverage', () => {
  it('covers every production Admin route and leaves lab/login on scaffold', () => {
    const production = [
      '/',
      '/orders',
      '/orders/abc',
      '/kitchen',
      '/couriers',
      '/catalog',
      '/catalog/products',
      '/catalog/products/abc',
      '/catalog/categories',
      '/catalog/modifiers',
      '/catalog/allergens',
      '/catalog/media',
      '/branches',
      '/branches/abc',
      '/branches/service-areas',
      '/branches/availability',
      '/customers',
      '/customers/abc',
      '/loyalty',
      '/promotions',
      '/promotions/abc',
      '/payments',
      '/payments/abc',
      '/refunds',
      '/reports',
      '/users',
      '/roles',
      '/audit',
      '/settings',
    ];
    for (const path of production) {
      expect(isOpsShellPath(path)).toBe(true);
      expect(isIntendedA0ScaffoldPath(path)).toBe(false);
    }
    expect(isOpsShellPath('/login')).toBe(false);
    expect(isOpsShellPath('/access-denied')).toBe(false);
    expect(isIntendedA0ScaffoldPath('/login')).toBe(true);
    expect(isIntendedA0ScaffoldPath('/access-denied')).toBe(true);
  });
});

describe('order status presentation', () => {
  it('maps ops-safe labels and tones consistently', () => {
    expect(orderStatusLabel('PREPARING')).toBe('Hazırlanıyor');
    expect(orderStatusTone('PREPARING')).toBe('amber');
    expect(orderStatusTone('ON_THE_WAY')).toBe('logistics');
    expect(orderStatusTone('CANCELLED')).toBe('critical');
    expect(kdsLane('BRANCH_ASSIGNED')).toBe('new');
    expect(kdsLane('PREPARING')).toBe('prep');
    expect(kdsLane('READY_FOR_COURIER')).toBe('ready');
    expect(kdsLane('DELIVERED')).toBeNull();
  });

  it('only offers backend-legal kitchen actions', () => {
    expect(kitchenPrimaryAction('PREPARING')).toEqual({
      toStatus: 'READY_FOR_COURIER',
      label: 'Paketle',
    });
    expect(allowedTransitions('PREPARING')).toContain('CANCELLED');
    expect(allowedTransitions('PREPARING')).not.toContain('DELIVERED');
    expect(canAssignCourier('READY_FOR_COURIER')).toBe(true);
    expect(canAssignCourier('PREPARING')).toBe(false);
    expect(canReassignBranch('PREPARING')).toBe(true);
    expect(canReassignBranch('PICKED_UP')).toBe(false);
    expect(canReassignBranch('DELIVERED')).toBe(false);
  });
});

describe('branch resolve', () => {
  const branches = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ];

  it('prefers stored id when the branch still exists', () => {
    expect(resolveBranchId('b', branches, 'a')).toBe('b');
  });

  it('falls back without inventing an all-branch mode', () => {
    expect(resolveBranchId('missing', branches, 'a')).toBe('a');
    expect(resolveBranchId(null, [], 'fallback')).toBe('fallback');
  });
});

describe('kitchen poll honesty', () => {
  it('pauses when the document is hidden', () => {
    expect(shouldRunKitchenPoll(false)).toBe(true);
    expect(shouldRunKitchenPoll(true)).toBe(false);
  });
});

describe('istanbul calendar', () => {
  it('classifies a known Istanbul date', () => {
    const noonUtc = new Date('2026-09-21T12:00:00.000Z');
    expect(istanbulCalendarDate(noonUtc)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isIstanbulToday(noonUtc, noonUtc)).toBe(true);
  });
});

describe('dashboard metrics', () => {
  it('derives today/active/kitchen from real order fields', () => {
    const now = new Date('2026-09-21T12:00:00.000Z');
    const metrics = dashboardMetrics({
      now,
      kitchenCount: 3,
      orders: [
        {
          status: 'PREPARING',
          createdAt: now.toISOString(),
          finalPayableMinor: '10000',
          currency: 'TRY',
        },
        {
          status: 'CANCELLED',
          createdAt: now.toISOString(),
          finalPayableMinor: '5000',
          currency: 'TRY',
        },
        { status: 'DELIVERED', createdAt: '2026-09-20T12:00:00.000Z', finalPayableMinor: '9000' },
      ],
    });
    expect(metrics.todayCount).toBe(2);
    expect(metrics.activeCount).toBe(1);
    expect(metrics.kitchenCount).toBe(3);
    expect(metrics.cancelledToday).toBe(1);
    expect(metrics.todayNetLabel).toContain('₺');
  });
});
