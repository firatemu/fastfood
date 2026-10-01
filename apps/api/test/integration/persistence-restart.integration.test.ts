/**
 * Persistence restart proof — create → disconnect → new PrismaService → read.
 *
 * Requires local Postgres (`pnpm infra:up`) and migrations applied.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/common/database/prisma.service.js';

const IDS = {
  category: '01900000-0000-7000-8000-00000000c001',
  product: '01900000-0000-7000-8000-00000000c002',
  cart: '01900000-0000-7000-8000-00000000c003',
  order: '01900000-0000-7000-8000-00000000c004',
  delivery: '01900000-0000-7000-8000-00000000c005',
  checkout: '01900000-0000-7000-8000-00000000c006',
  payment: '01900000-0000-7000-8000-00000000c007',
  refund: '01900000-0000-7000-8000-00000000c008',
  user: '01900000-0000-7000-8000-00000000c009',
  session: '01900000-0000-7000-8000-00000000c00a',
  branch: '01900000-0000-7000-8000-00000000c00b',
  courier: '01900000-0000-7000-8000-00000000c00c',
  courierUser: '01900000-0000-7000-8000-00000000c00d',
} as const;

/**
 * Ordered fixture teardown. Prior runs left `Persist Burger` as an
 * `isActive` catalog row; Storefront/Playwright carts then held
 * `cart_line_items.product_id` RESTRICT FKs. Swallowing delete errors
 * hid that leftover and the next `category.create` hit `categories_pkey`.
 */
async function cleanupPersistenceArtifacts(db: PrismaService): Promise<void> {
  await db.refund.deleteMany({ where: { id: IDS.refund } });
  await db.paymentAttempt.deleteMany({ where: { id: IDS.payment } });
  await db.checkoutSession.deleteMany({ where: { id: IDS.checkout } });
  await db.delivery.deleteMany({ where: { id: IDS.delivery } });
  await db.order.deleteMany({ where: { id: IDS.order } });
  await db.cartLineItem.deleteMany({
    where: { OR: [{ cartId: IDS.cart }, { productId: IDS.product }] },
  });
  await db.orderItem.deleteMany({
    where: { OR: [{ orderId: IDS.order }, { productId: IDS.product }] },
  });
  await db.storefrontComboOfferItem.deleteMany({ where: { productId: IDS.product } });
  await db.productMerchandising.deleteMany({ where: { productId: IDS.product } });
  await db.cart.deleteMany({ where: { id: IDS.cart } });
  await db.session.deleteMany({
    where: { OR: [{ id: IDS.session }, { userId: { in: [IDS.user, IDS.courierUser] } }] },
  });
  await db.courierProfile.deleteMany({ where: { id: IDS.courier } });
  await db.product.deleteMany({ where: { id: IDS.product } });
  await db.category.deleteMany({ where: { id: IDS.category } });
  await db.branch.deleteMany({ where: { id: IDS.branch } });
  await db.user.deleteMany({ where: { id: { in: [IDS.user, IDS.courierUser] } } });
}

describe('persistence restart (integration)', () => {
  let first: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Use the local development database (migrations + seed already applied).
    // Do not default to a separate `fastfood_test` DB that may lack schema.
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://fastfood:fastfood@localhost:5439/fastfood?schema=public';
    first = new PrismaService();
    await first.$connect();

    await cleanupPersistenceArtifacts(first);

    await first.category.create({
      data: {
        id: IDS.category,
        slug: `persist-burgers-${Date.now()}`,
        name: 'Persist Burgers',
        displayOrder: 1,
        isActive: true,
      },
    });
    await first.product.create({
      data: {
        id: IDS.product,
        categoryId: IDS.category,
        slug: `persist-burger-${Date.now()}`,
        name: 'Persist Burger',
        basePriceMinor: 1000n,
        currency: 'TRY',
        isActive: false,
      },
    });
    await first.branch.create({
      data: {
        id: IDS.branch,
        code: `P-${Date.now().toString(36).slice(-6)}`,
        name: 'Persist Branch',
        addressLine: 'Test 1',
        latitude: 41.0,
        longitude: 29.0,
        isActive: true,
      },
    });
    await first.user.create({
      data: {
        id: IDS.user,
        actorType: 'CUSTOMER',
        status: 'ACTIVE',
        primaryIdentifier: `persist-${Date.now()}@example.com`,
        primaryIdentifierType: 'EMAIL',
        displayName: 'Persist User',
      },
    });
    await first.user.create({
      data: {
        id: IDS.courierUser,
        actorType: 'COURIER',
        status: 'ACTIVE',
        primaryIdentifier: `courier-persist-${Date.now()}@example.com`,
        primaryIdentifierType: 'EMAIL',
        displayName: 'Persist Courier',
      },
    });
    await first.courierProfile.create({
      data: {
        id: IDS.courier,
        userId: IDS.courierUser,
        displayName: 'Persist Courier',
        isActive: true,
      },
    });
    await first.cart.create({
      data: {
        id: IDS.cart,
        userId: IDS.user,
        status: 'OPEN',
        lineItems: {
          create: [
            {
              productId: IDS.product,
              quantity: 2,
              unitPriceMinorSnapshot: 1000n,
              currencySnapshot: 'TRY',
            },
          ],
        },
      },
    });
    await first.order.create({
      data: {
        id: IDS.order,
        userId: IDS.user,
        branchId: IDS.branch,
        status: 'PAID',
        currency: 'TRY',
        merchandiseNetMinor: 2000n,
        finalPayableMinor: 2000n,
        items: {
          create: [
            {
              productId: IDS.product,
              productNameSnapshot: 'Persist Burger',
              quantity: 2,
              unitPriceMinorSnapshot: 1000n,
              lineGrossMinorSnapshot: 2000n,
            },
          ],
        },
      },
    });
    await first.delivery.create({
      data: {
        id: IDS.delivery,
        orderId: IDS.order,
        branchId: IDS.branch,
        courierId: IDS.courier,
        status: 'ASSIGNED',
      },
    });
    await first.checkoutSession.create({
      data: {
        id: IDS.checkout,
        status: 'PAID',
        currency: 'TRY',
        finalPayableMinor: 2000n,
      },
    });
    await first.paymentAttempt.create({
      data: {
        id: IDS.payment,
        checkoutSessionId: IDS.checkout,
        status: 'PAID',
        amountMinor: 2000n,
        currency: 'TRY',
        idempotencyKey: `persist-pay-${Date.now()}`,
      },
    });
    await first.refund.create({
      data: {
        id: IDS.refund,
        paymentId: IDS.payment,
        orderId: IDS.order,
        amountMinor: 500n,
        currency: 'TRY',
        status: 'SUCCEEDED',
        reason: 'persist-test',
      },
    });
    await first.session.create({
      data: {
        id: IDS.session,
        userId: IDS.user,
        refreshTokenHash: `persist-hash-${Date.now()}`,
        familyId: IDS.session,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await first.$disconnect();
  });

  afterAll(async () => {
    const cleaner = new PrismaService();
    await cleaner.$connect();
    try {
      await cleanupPersistenceArtifacts(cleaner);
    } finally {
      await cleaner.$disconnect();
    }
  });

  it('reads catalog/cart/order/delivery/refund/session after reconnect', async () => {
    const second = new PrismaService();
    await second.$connect();
    try {
      const category = await second.category.findUnique({ where: { id: IDS.category } });
      expect(category?.name).toBe('Persist Burgers');

      const cart = await second.cart.findUnique({
        where: { id: IDS.cart },
        include: { lineItems: true },
      });
      expect(cart?.lineItems.length).toBe(1);
      expect(cart?.lineItems[0]?.quantity).toBe(2);

      const order = await second.order.findUnique({ where: { id: IDS.order } });
      expect(order?.finalPayableMinor).toBe(2000n);

      const delivery = await second.delivery.findUnique({ where: { id: IDS.delivery } });
      expect(delivery?.status).toBe('ASSIGNED');

      const refund = await second.refund.findUnique({ where: { id: IDS.refund } });
      expect(refund?.amountMinor).toBe(500n);

      const session = await second.session.findUnique({ where: { id: IDS.session } });
      expect(session?.userId).toBe(IDS.user);
      expect(session?.revokedAt).toBeNull();
    } finally {
      await second.$disconnect();
    }
  });
});
