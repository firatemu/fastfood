import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CartService } from '../../src/modules/cart/cart.service.js';
import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import { OrderOutboxService } from '../../src/modules/order/order-outbox.service.js';
import { OrderService } from '../../src/modules/order/order.service.js';
import { ReorderService } from '../../src/modules/order/reorder.service.js';

const CHEESE = '01900000-0000-7000-8000-cccccccccccc';
const USER_A = '01900000-0000-7000-8000-0000000000a1';
const USER_B = '01900000-0000-7000-8000-0000000000a2';

function makeReorder() {
  const orders = new OrderService(new OrderOutboxService());
  const carts = new CartService();
  const catalog = new CatalogService();
  const checkout = {
    getSession: async () => null,
  };
  const reorder = new ReorderService(orders, carts, catalog, checkout as never);
  return { orders, carts, catalog, reorder };
}

describe('ReorderService', () => {
  it('restores current catalog price, not the historical snapshot', async () => {
    const { orders, catalog, reorder, carts } = makeReorder();
    const product = await catalog.getProduct(CHEESE);
    const order = await orders.create({
      userId: USER_A,
      merchandiseNetMinor: 1n,
      finalPayableMinor: 1n,
      initialStatus: 'PAID',
      autoAssignBranch: false,
      items: [
        {
          productId: CHEESE,
          productNameSnapshot: 'Classic',
          quantity: 1,
          unitPriceMinorSnapshot: 1n,
          lineGrossMinorSnapshot: 1n,
        },
      ],
    });
    const result = await reorder.reorder(order.id, { userId: USER_A });
    expect(result.status === 'success' || result.status === 'partial').toBe(true);
    const restored = result.items.find((item) => item.productId === CHEESE);
    expect(restored?.currentUnitPriceMinor).toBe(product.basePriceMinor.toString());
    expect(restored?.currentUnitPriceMinor).not.toBe('1');
    expect(restored?.historicalUnitPriceMinor).toBe('1');
    const cart = await carts.getOrCreateCustomerCart(USER_A);
    expect(cart.lineItems[0]?.unitPriceMinorSnapshot).toBe(product.basePriceMinor);
  });

  it('does not add unavailable products and reports them', async () => {
    const { orders, catalog, reorder } = makeReorder();
    await catalog.updateProduct(CHEESE, { isActive: false });
    const order = await orders.create({
      userId: USER_A,
      merchandiseNetMinor: 15000n,
      finalPayableMinor: 15000n,
      initialStatus: 'PAID',
      autoAssignBranch: false,
      items: [
        {
          productId: CHEESE,
          productNameSnapshot: 'Classic',
          quantity: 1,
          unitPriceMinorSnapshot: 15000n,
          lineGrossMinorSnapshot: 15000n,
        },
      ],
    });
    const result = await reorder.reorder(order.id, { userId: USER_A });
    expect(result.status).toBe('unavailable');
    expect(result.items[0]?.outcome).toBe('product_unavailable');
    expect(result.cartId).toBeNull();
  });

  it('rejects reorder of another customer order', async () => {
    const { orders, reorder } = makeReorder();
    const order = await orders.create({
      userId: USER_A,
      merchandiseNetMinor: 15000n,
      finalPayableMinor: 15000n,
      initialStatus: 'PAID',
      autoAssignBranch: false,
      items: [
        {
          productId: CHEESE,
          productNameSnapshot: 'Classic',
          quantity: 1,
          unitPriceMinorSnapshot: 15000n,
          lineGrossMinorSnapshot: 15000n,
        },
      ],
    });
    await expect(reorder.reorder(order.id, { userId: USER_B })).rejects.toThrow(NotFoundException);
  });
});
