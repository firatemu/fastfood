/**
 * Admin orders list + summary integration smoke (Phase Admin Orders redesign).
 *
 * Boots the OrderController stack in-process (no Prisma) and exercises
 * /api/v1/admin/orders with the new query filters and the summary route.
 */
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthGuard } from '../../src/modules/auth/guards/auth.guard.js';
import { RbacGuard } from '../../src/modules/auth/guards/rbac.guard.js';
import { AccountStatusGuard } from '../../src/modules/auth/guards/account-status.guard.js';
import { ResourceScopeGuard } from '../../src/modules/auth/guards/resource-scope.guard.js';
import { OrderController } from '../../src/modules/order/order.controller.js';
import { OrderService } from '../../src/modules/order/order.service.js';
import { OrderPickupTokenService } from '../../src/modules/order/order-pickup-token.service.js';
import { CustomerOrderQueryService } from '../../src/modules/order/customer-order-query.service.js';
import { CustomerAuthService } from '../../src/modules/auth/customer/customer-auth.service.js';
import { ReorderService } from '../../src/modules/order/reorder.service.js';

const BRANCH = '01900000-0000-7000-8000-eeeeeeeeeeee';

let app: NestFastifyApplication | undefined;

async function seed(): Promise<void> {
  const orders = app!.get(OrderService);
  const products = [
    ['p-1', 'Smash', '10000'],
    ['p-2', 'Fries', '30000'],
    ['p-3', 'Soda', '5000'],
  ] as const;
  for (const [id, name, unit] of products) {
    await orders.create({
      branchId: BRANCH,
      initialStatus: 'CREATED',
      merchandiseNetMinor: BigInt(unit),
      finalPayableMinor: BigInt(unit),
      items: [
        {
          productId: id,
          productNameSnapshot: name,
          quantity: 1,
          unitPriceMinorSnapshot: BigInt(unit),
          lineGrossMinorSnapshot: BigInt(unit),
        },
      ],
    });
  }
}

describe('Admin orders list + summary (integration)', () => {
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        OrderService,
        { provide: OrderPickupTokenService, useClass: OrderPickupTokenService },
        { provide: CustomerOrderQueryService, useValue: {} },
        { provide: CustomerAuthService, useValue: {} },
        { provide: ReorderService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AccountStatusGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ResourceScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    app.setGlobalPrefix('/api/v1');
    await app.init();
    (await app.getHttpAdapter()).getInstance().ready();
    if (!app) throw new Error('app not initialized');
    await seed();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('rejects missing branchId', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/orders',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { error?: { code: string } };
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('filters by statuses', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/orders?branchId=${BRANCH}&statuses=BRANCH_ASSIGNED`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ status: string }>; meta: { total: number } };
    expect(body.meta.total).toBe(3);
    expect(body.data.every((row) => row.status === 'BRANCH_ASSIGNED')).toBe(true);
  });

  it('returns paginated meta', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/orders?branchId=${BRANCH}&limit=2`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[]; meta: { total: number; nextCursor: string | null } };
    expect(body.data.length).toBe(2);
    expect(body.meta.total).toBe(3);
    expect(body.meta.nextCursor).not.toBeNull();
  });

  it('returns summary KPIs', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/orders/summary?branchId=${BRANCH}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { counts: Record<string, number>; kpis: { activeCount: number; grossTodayMinor: string } } };
    expect(body.data.counts.BRANCH_ASSIGNED).toBe(3);
    expect(body.data.kpis.activeCount).toBe(3);
    expect(typeof body.data.kpis.grossTodayMinor).toBe('string');
  });
});
