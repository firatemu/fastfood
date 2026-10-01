/**
 * OrderService listWithFilters + summaryByBranch unit tests (Phase Admin Orders redesign).
 */
import { describe, expect, it } from 'vitest';

import { bumpDisplayNumber, OrderService } from '../../src/modules/order/order.service.js';

function minor(value: string): bigint {
  return BigInt(value);
}

async function seed(): Promise<OrderService> {
  const svc = new OrderService();
  const branch = '01900000-0000-7000-8000-bbbbbbbbbbbb';
  await svc.create({
    branchId: branch,
    userId: 'user-a',
    initialStatus: 'PAID',
    merchandiseNetMinor: minor('10000'),
    finalPayableMinor: minor('12000'),
    items: [
      {
        productId: 'p-1',
        productNameSnapshot: 'Smash',
        quantity: 1,
        unitPriceMinorSnapshot: minor('10000'),
        lineGrossMinorSnapshot: minor('10000'),
      },
    ],
  });
  await svc.create({
    branchId: branch,
    userId: 'user-b',
    initialStatus: 'PREPARING',
    merchandiseNetMinor: minor('20000'),
    finalPayableMinor: minor('22500'),
    items: [
      {
        productId: 'p-1',
        productNameSnapshot: 'Smash',
        quantity: 2,
        unitPriceMinorSnapshot: minor('10000'),
        lineGrossMinorSnapshot: minor('20000'),
      },
    ],
  });
  await svc.create({
    branchId: branch,
    userId: 'user-c',
    initialStatus: 'DELIVERED',
    merchandiseNetMinor: minor('30000'),
    finalPayableMinor: minor('32500'),
    items: [
      {
        productId: 'p-2',
        productNameSnapshot: 'Fries',
        quantity: 1,
        unitPriceMinorSnapshot: minor('30000'),
        lineGrossMinorSnapshot: minor('30000'),
      },
    ],
  });
  await svc.create({
    branchId: branch,
    userId: 'user-d',
    initialStatus: 'CANCELLED',
    merchandiseNetMinor: minor('5000'),
    finalPayableMinor: minor('5000'),
    items: [
      {
        productId: 'p-3',
        productNameSnapshot: 'Soda',
        quantity: 1,
        unitPriceMinorSnapshot: minor('5000'),
        lineGrossMinorSnapshot: minor('5000'),
      },
    ],
  });
  return svc;
}

describe('OrderService listWithFilters', () => {
  it('returns all branch orders without filters and reports total', async () => {
    const svc = await seed();
    const page = await svc.listWithFilters({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
    });
    expect(page.total).toBe(4);
    expect(page.rows.length).toBe(4);
    expect(page.nextCursor).toBeNull();
  });

  it('filters by status list', async () => {
    const svc = await seed();
    const page = await svc.listWithFilters({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
      statuses: ['PREPARING', 'DELIVERED'],
    });
    expect(page.total).toBe(2);
    expect(page.rows.map((row) => row.status).sort()).toEqual(['DELIVERED', 'PREPARING']);
  });

  it('filters by min and max amount', async () => {
    const svc = await seed();
    const page = await svc.listWithFilters({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
      minMinor: minor('15000'),
      maxMinor: minor('30000'),
    });
    expect(page.total).toBe(1);
    expect(page.rows[0]?.status).toBe('PREPARING');
  });

  it('filters by case-insensitive id query', async () => {
    const svc = await seed();
    const all = await svc.listByBranch('01900000-0000-7000-8000-bbbbbbbbbbbb');
    const target = all.find((row) => row.userId === 'user-c')!;
    const page = await svc.listWithFilters({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
      query: target.id.slice(-6),
    });
    expect(page.total).toBe(1);
    expect(page.rows[0]?.id).toBe(target.id);
  });

  it('paginates with cursor + limit', async () => {
    const svc = await seed();
    const first = await svc.listWithFilters({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
      limit: 2,
    });
    expect(first.rows.length).toBe(2);
    expect(first.nextCursor).not.toBeNull();
    expect(first.total).toBe(4);
    const second = await svc.listWithFilters({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.rows.length).toBe(2);
    expect(second.nextCursor).toBeNull();
    const ids = new Set([...first.rows, ...second.rows].map((row) => row.id));
    expect(ids.size).toBe(4);
  });
});

describe('OrderService summaryByBranch', () => {
  it('reports counts, prep, delivered and cancellation rate', async () => {
    const svc = await seed();
    const summary = await svc.summaryByBranch('01900000-0000-7000-8000-bbbbbbbbbbbb');
    expect(summary.counts.PREPARING).toBe(1);
    expect(summary.counts.DELIVERED).toBe(1);
    expect(summary.counts.CANCELLED).toBe(1);
    expect(summary.kpis.cancellationRateBps).toBe(2500);
  });
});

describe('bumpDisplayNumber', () => {
  it('starts from SP00001 when no previous number exists', () => {
    expect(bumpDisplayNumber(null)).toBe('SP00001');
    expect(bumpDisplayNumber(undefined)).toBe('SP00001');
    expect(bumpDisplayNumber('')).toBe('SP00001');
  });

  it('increments the trailing counter', () => {
    expect(bumpDisplayNumber('SP00007')).toBe('SP00008');
    expect(bumpDisplayNumber('sp00099')).toBe('SP00100');
  });

  it('falls back when the existing value is unparseable', () => {
    expect(bumpDisplayNumber('BH-00001')).toBe('SP00001');
    expect(bumpDisplayNumber('garbage')).toBe('SP00001');
  });

  it('integrates with OrderService.create in memory', async () => {
    const svc = new OrderService();
    const first = await svc.create({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
      initialStatus: 'CREATED',
      merchandiseNetMinor: 0n,
      finalPayableMinor: 0n,
      items: [
        {
          productId: 'p',
          productNameSnapshot: 'p',
          quantity: 1,
          unitPriceMinorSnapshot: 0n,
          lineGrossMinorSnapshot: 0n,
        },
      ],
    });
    const second = await svc.create({
      branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
      initialStatus: 'CREATED',
      merchandiseNetMinor: 0n,
      finalPayableMinor: 0n,
      items: [
        {
          productId: 'p',
          productNameSnapshot: 'p',
          quantity: 1,
          unitPriceMinorSnapshot: 0n,
          lineGrossMinorSnapshot: 0n,
        },
      ],
    });
    expect(first.displayNumber).toBe('SP00001');
    expect(second.displayNumber).toBe('SP00002');
  });
});
