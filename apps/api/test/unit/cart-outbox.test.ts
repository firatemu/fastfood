/**
 * Phase 5 cart outbox emission (document 17 §4 + document 09 §6).
 *
 * Coverage:
 *   - addLine emits CartLineAdded for a new line
 *   - addLine emits CartLineUpdated when quantities combine
 *   - updateLine emits CartLineUpdated
 *   - removeLine emits CartLineRemoved
 *   - clearCart emits CartLineRemoved per line
 *   - no outbox → mutations still succeed (unit-test path)
 */
import { describe, expect, it } from 'vitest';

import { CartOutboxService } from '../../src/modules/cart/cart-outbox.service.js';
import { CartService } from '../../src/modules/cart/cart.service.js';

function price(amount: string): bigint {
  return BigInt(amount);
}

describe('Phase 5 CartOutboxService emission', () => {
  it('addLine emits CartLineAdded for a new line', async () => {
    const outbox = new CartOutboxService();
    const svc = new CartService(outbox);
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    // Allow microtask queue for void-emitted promises.
    await Promise.resolve();
    const events = await outbox.list({ eventType: 'CartLineAdded' });
    expect(events.length).toBe(1);
    expect(events[0]?.aggregateType).toBe('cart');
    expect(events[0]?.aggregateId).toBe(cart.id);
    expect(events[0]?.payload['productId']).toBe('p-1');
    expect(events[0]?.payload['quantity']).toBe(1);
  });

  it('addLine emits CartLineUpdated when an existing line combines', async () => {
    const outbox = new CartOutboxService();
    const svc = new CartService(outbox);
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 2,
      unitPriceMinorSnapshot: price('12990'),
    });
    await Promise.resolve();
    const added = await outbox.list({ eventType: 'CartLineAdded' });
    const updated = await outbox.list({ eventType: 'CartLineUpdated' });
    expect(added.length).toBe(1);
    expect(updated.length).toBe(1);
    expect(updated[0]?.payload['quantity']).toBe(3);
  });

  it('updateLine emits CartLineUpdated', async () => {
    const outbox = new CartOutboxService();
    const svc = new CartService(outbox);
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    const li = (await svc.getCart(cart.id)).lineItems[0]!;
    await svc.updateLine(cart.id, li.id, { quantity: 5 });
    await Promise.resolve();
    const updated = await outbox.list({ eventType: 'CartLineUpdated' });
    expect(updated.length).toBe(1);
    expect(updated[0]?.payload['lineId']).toBe(li.id);
    expect(updated[0]?.payload['quantity']).toBe(5);
  });

  it('removeLine emits CartLineRemoved', async () => {
    const outbox = new CartOutboxService();
    const svc = new CartService(outbox);
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    const li = (await svc.getCart(cart.id)).lineItems[0]!;
    await svc.removeLine(cart.id, li.id);
    await Promise.resolve();
    const removed = await outbox.list({ eventType: 'CartLineRemoved' });
    expect(removed.length).toBe(1);
    expect(removed[0]?.payload['lineId']).toBe(li.id);
  });

  it('clearCart emits CartLineRemoved for every line', async () => {
    const outbox = new CartOutboxService();
    const svc = new CartService(outbox);
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    await svc.addLine(cart.id, {
      productId: 'p-2',
      quantity: 1,
      unitPriceMinorSnapshot: price('9990'),
    });
    await svc.clearCart(cart.id);
    await Promise.resolve();
    const removed = await outbox.list({ eventType: 'CartLineRemoved' });
    expect(removed.length).toBe(2);
  });

  it('mutations succeed when no outbox is injected', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateGuestCart('session-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    expect((await svc.getCart(cart.id)).lineItems.length).toBe(1);
  });
});
