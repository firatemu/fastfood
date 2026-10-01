/**
 * Phase 7 OrderService + state machine unit tests (documents 10 + 12).
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { BranchService } from '../../src/modules/branch/branch.service.js';
import { RoutingService } from '../../src/modules/branch/routing/routing.service.js';
import { OrderOutboxService } from '../../src/modules/order/order-outbox.service.js';
import { canTransition } from '../../src/modules/order/order-state-machine.js';
import { OrderService } from '../../src/modules/order/order.service.js';

const DOWNTOWN = {
  latitude: 41.0369,
  longitude: 28.9847,
  line1: 'Istiklal Caddesi 1',
};

function paidOrderInput(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    merchandiseNetMinor: 15000n,
    deliveryFeeMinor: 1500n,
    finalPayableMinor: 16500n,
    deliveryAddress: DOWNTOWN,
    initialStatus: 'PAID' as const,
    items: [
      {
        productId: 'p-1',
        productNameSnapshot: 'Burger',
        quantity: 1,
        unitPriceMinorSnapshot: 15000n,
        lineGrossMinorSnapshot: 15000n,
      },
    ],
    ...overrides,
  };
}

function makeService() {
  const outbox = new OrderOutboxService();
  const routing = new RoutingService();
  const branches = new BranchService();
  const svc = new OrderService(outbox, routing, branches);
  return { svc, outbox, branches };
}

describe('Phase 7 order state machine', () => {
  it('allows the canonical happy path', async () => {
    expect(canTransition('PAID', 'BRANCH_ASSIGNED')).toBe(true);
    expect(canTransition('BRANCH_ASSIGNED', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'READY_FOR_COURIER')).toBe(true);
    expect(canTransition('READY_FOR_COURIER', 'COURIER_ASSIGNED')).toBe(true);
    expect(canTransition('COURIER_ASSIGNED', 'PICKED_UP')).toBe(true);
    expect(canTransition('PICKED_UP', 'ON_THE_WAY')).toBe(true);
    expect(canTransition('ON_THE_WAY', 'DELIVERED')).toBe(true);
  });

  it('rejects illegal jumps', async () => {
    expect(canTransition('PAID', 'DELIVERED')).toBe(false);
    expect(canTransition('PREPARING', 'ON_THE_WAY')).toBe(false);
  });
});

describe('Phase 7 OrderService', () => {
  it('creates an order and auto-assigns a branch via RoutingService', async () => {
    const { svc } = makeService();
    const order = await svc.create(paidOrderInput());
    expect(order.status).toBe('BRANCH_ASSIGNED');
    expect(order.branchId).toBeTruthy();
    expect(order.branchAssignments.length).toBe(1);
    expect(order.events.some((e) => e.eventType === 'OrderCreated')).toBe(true);
  });

  it('transitions kitchen statuses and records OrderEvent timeline', async () => {
    const { svc, outbox } = makeService();
    const created = await svc.create(paidOrderInput());
    const preparing = await svc.transition(created.id, {
      toStatus: 'PREPARING',
      actorUserId: 'staff-1',
    });
    expect(preparing.status).toBe('PREPARING');
    const timeline = await svc.timeline(created.id);
    expect(timeline.some((e) => e.toStatus === 'PREPARING')).toBe(true);
    const events = await outbox.list({ eventType: 'OrderStatusChanged' });
    expect(events.length).toBeGreaterThan(0);
  });

  it('rejects invalid transitions with ORDER_INVALID_TRANSITION', async () => {
    const { svc } = makeService();
    const order = await svc.create(paidOrderInput());
    await expect(svc.transition(order.id, { toStatus: 'DELIVERED' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lists kitchen board for branch-scoped active statuses', async () => {
    const { svc } = makeService();
    const order = await svc.create(paidOrderInput());
    await svc.transition(order.id, { toStatus: 'PREPARING' });
    const board = await svc.listKitchenBoard(order.branchId!);
    expect(board.some((o) => o.id === order.id)).toBe(true);
  });

  it('reassigns branch and preserves assignment history', async () => {
    const { svc, branches } = makeService();
    const order = await svc.create(paidOrderInput());
    const other = await branches.createBranch({
      code: 'IST-OTHER',
      name: 'Other',
      addressLine: 'Other St 1',
      latitude: 41.05,
      longitude: 29.0,
    });
    const reassigned = await svc.reassignBranch(order.id, other.id, {
      actorUserId: 'staff-1',
      reason: 'capacity',
    });
    expect(reassigned.branchId).toBe(other.id);
    expect(reassigned.branchAssignments.length).toBe(2);
  });

  it('rejects reassignment after courier pickup', async () => {
    const { svc, branches } = makeService();
    const order = await svc.create(paidOrderInput());
    await svc.transition(order.id, { toStatus: 'PREPARING' });
    await svc.transition(order.id, { toStatus: 'READY_FOR_COURIER' });
    await svc.transition(order.id, { toStatus: 'COURIER_ASSIGNED' });
    await svc.transition(order.id, { toStatus: 'PICKED_UP' });
    const other = await branches.createBranch({
      code: 'IST-LATE',
      name: 'Late',
      addressLine: 'Late St 1',
      latitude: 41.05,
      longitude: 29.0,
    });
    await expect(svc.reassignBranch(order.id, other.id)).rejects.toThrow(BadRequestException);
  });
});
