/**
 * Phase 7 order/kitchen negative-test matrix (document 39 §10).
 */
import { ErrorCodes } from '@fastfood/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuthGuard } from '../../apps/api/src/modules/auth/guards/auth.guard.js';
import { BranchService } from '../../apps/api/src/modules/branch/branch.service.js';
import { RoutingService } from '../../apps/api/src/modules/branch/routing/routing.service.js';
import { OrderOutboxService } from '../../apps/api/src/modules/order/order-outbox.service.js';
import { OrderService } from '../../apps/api/src/modules/order/order.service.js';

function makeContext(req: { authenticatedUserId?: string }) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class Fake {},
    getArgs: () => [],
    getArgByIndex: <T>(_i: number): T => undefined as T,
    switchToRpc: () => {
      throw new Error('n/a');
    },
    switchToWs: () => {
      throw new Error('n/a');
    },
    getType: () => 'http',
  };
}

function makeOrders() {
  return new OrderService(new OrderOutboxService(), new RoutingService(), new BranchService());
}

const paidInput = {
  userId: 'user-1',
  merchandiseNetMinor: 10000n,
  finalPayableMinor: 10000n,
  deliveryAddress: { latitude: 41.0369, longitude: 28.9847 },
  initialStatus: 'PAID' as const,
  items: [
    {
      productId: 'p-1',
      productNameSnapshot: 'Burger',
      quantity: 1,
      unitPriceMinorSnapshot: 10000n,
      lineGrossMinorSnapshot: 10000n,
    },
  ],
};

describe('Phase 7 order/kitchen negative-test matrix', () => {
  it('rejects unauthenticated via AuthGuard', async () => {
    const guard = new AuthGuard();
    await expect(guard.canActivate(makeContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid status jump (ORDER_INVALID_TRANSITION)', async () => {
    const orders = makeOrders();
    const order = await orders.create(paidInput);
    await expect(orders.transition(order.id, { toStatus: 'DELIVERED' })).rejects.toThrow();
  });

  it('rejects branch reassignment after pickup', async () => {
    const orders = makeOrders();
    const order = await orders.create(paidInput);
    await orders.transition(order.id, { toStatus: 'PREPARING' });
    await orders.transition(order.id, { toStatus: 'READY_FOR_COURIER' });
    await orders.transition(order.id, { toStatus: 'COURIER_ASSIGNED' });
    await orders.transition(order.id, { toStatus: 'PICKED_UP' });
    await expect(
      orders.reassignBranch(order.id, '01900000-0000-7000-8000-ffffffffffff'),
    ).rejects.toThrow();
  });

  it('correct-scope happy path: create → accept → prepare', async () => {
    const orders = makeOrders();
    const order = await orders.create(paidInput);
    const preparing = await orders.transition(order.id, { toStatus: 'PREPARING' });
    expect(preparing.status).toBe('PREPARING');
  });

  it('ErrorCodes for order envelope exist', () => {
    expect(ErrorCodes.ORDER_INVALID_TRANSITION).toBeTruthy();
    expect(ErrorCodes.ORDER_BRANCH_REASSIGNMENT_NOT_ALLOWED).toBeTruthy();
    expect(ErrorCodes.AUTH_UNAUTHENTICATED).toBeTruthy();
    expect(ErrorCodes.NOT_FOUND).toBeTruthy();
  });
});
