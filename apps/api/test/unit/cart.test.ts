/**
 * Phase 5 cart service unit tests (document 09 §1-§3).
 *
 * Coverage:
 *   - getOrCreateCustomerCart / getOrCreateGuestCart idempotency
 *   - addLine: combines quantities when product + variant + modifiers + removals match
 *   - updateLine: quantity + deliveryNote + modifiers + removals
 *   - removeLine + clearCart
 *   - mergeGuestIntoCustomer: lines combine; guest cart is dropped
 *   - rejects quantity <= 0
 */
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CartService } from '../../src/modules/cart/cart.service.js';

function price(amount: string): bigint {
  return BigInt(amount);
}

describe('Phase 5 CartService', () => {
  it('getOrCreateCustomerCart is idempotent for the same user', async () => {
    const svc = new CartService();
    const a = await svc.getOrCreateCustomerCart('user-1');
    const b = await svc.getOrCreateCustomerCart('user-1');
    expect(a.id).toBe(b.id);
  });

  it('getOrCreateGuestCart is idempotent for the same session id', async () => {
    const svc = new CartService();
    const a = await svc.getOrCreateGuestCart('session-1');
    const b = await svc.getOrCreateGuestCart('session-1');
    expect(a.id).toBe(b.id);
  });

  it('getOrCreateGuestCart creates a new OPEN cart after the session id is held by an abandoned cart', async () => {
    const now = new Date();
    const rows: Array<{
      id: string;
      userId: string | null;
      guestSessionId: string | null;
      status: string;
      branchId: string | null;
      createdAt: Date;
      updatedAt: Date;
      expiresAt: Date | null;
      lineItems: [];
    }> = [
      {
        id: 'abandoned-cart',
        userId: null,
        guestSessionId: 'session-1',
        status: 'ABANDONED',
        branchId: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: null,
        lineItems: [],
      },
    ];
    const prisma = {
      cart: {
        findFirst: async ({ where }: { where: { guestSessionId: string; status?: string } }) =>
          rows.find(
            (row) =>
              row.guestSessionId === where.guestSessionId &&
              (where.status === undefined || row.status === where.status),
          ) ?? null,
        create: async ({
          data,
        }: {
          data: { guestSessionId: string; status: string };
        }) => {
          if (rows.some((row) => row.guestSessionId === data.guestSessionId)) {
            const err = new Error('Unique constraint failed') as Error & { code: string };
            err.code = 'P2002';
            throw err;
          }
          const created = {
            id: 'fresh-open-cart',
            userId: null,
            guestSessionId: data.guestSessionId,
            status: data.status,
            branchId: null,
            createdAt: now,
            updatedAt: now,
            expiresAt: null,
            lineItems: [] as [],
          };
          rows.push(created);
          return created;
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { guestSessionId?: string | null };
        }) => {
          const row = rows.find((item) => item.id === where.id);
          if (row && data.guestSessionId !== undefined) row.guestSessionId = data.guestSessionId;
          return row;
        },
      },
    };
    const svc = new CartService(null, prisma as never);
    const cart = await svc.getOrCreateGuestCart('session-1');
    expect(cart.status).toBe('OPEN');
    expect(cart.id).toBe('fresh-open-cart');
    expect(cart.guestSessionId).toBe('session-1');
  });

  it('resolveCart prefers user-scoped over guest-scoped', async () => {
    const svc = new CartService();
    await svc.getOrCreateGuestCart('session-1');
    await svc.getOrCreateCustomerCart('user-1');
    expect((await svc.resolveCart({ userId: 'user-1', guestSessionId: 'session-1' }))?.userId).toBe(
      'user-1',
    );
  });

  it('addLine: same product + variant + modifiers + removals combines quantities', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 2,
      unitPriceMinorSnapshot: price('12990'),
    });
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    const after = await svc.getCart(cart.id);
    expect(after.lineItems.length).toBe(1);
    expect(after.lineItems[0]?.quantity).toBe(3);
  });

  it('addLine: different modifiers create a separate line', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
      modifiers: [{ modifierId: 'mod-1', priceDeltaMinorSnapshot: price('500') }],
    });
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
      modifiers: [{ modifierId: 'mod-2', priceDeltaMinorSnapshot: price('300') }],
    });
    const after = await svc.getCart(cart.id);
    expect(after.lineItems.length).toBe(2);
  });

  it('addLine: different variants create a separate line', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      productVariantId: 'v-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    await svc.addLine(cart.id, {
      productId: 'p-1',
      productVariantId: 'v-2',
      quantity: 1,
      unitPriceMinorSnapshot: price('14990'),
    });
    const after = await svc.getCart(cart.id);
    expect(after.lineItems.length).toBe(2);
  });

  it('addLine: rejects quantity <= 0', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await expect(
      svc.addLine(cart.id, {
        productId: 'p-1',
        quantity: 0,
        unitPriceMinorSnapshot: price('12990'),
      }),
    ).rejects.toThrow();
  });

  it('updateLine: changes quantity', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    const li = (await svc.getCart(cart.id)).lineItems[0]!;
    const after = await svc.updateLine(cart.id, li.id, { quantity: 5 });
    expect(after.lineItems[0]?.quantity).toBe(5);
  });

  it('updateLine: rejects quantity <= 0', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    const li = (await svc.getCart(cart.id)).lineItems[0]!;
    await expect(svc.updateLine(cart.id, li.id, { quantity: 0 })).rejects.toThrow();
  });

  it('updateLine: throws NotFoundException for unknown line id', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await expect(svc.updateLine(cart.id, 'no-such-line', { quantity: 1 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('removeLine: drops the line', async () => {
    const svc = new CartService();
    const cart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(cart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    const li = (await svc.getCart(cart.id)).lineItems[0]!;
    const after = await svc.removeLine(cart.id, li.id);
    expect(after.lineItems.length).toBe(0);
  });

  it('clearCart: removes all lines', async () => {
    const svc = new CartService();
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
    const after = await svc.clearCart(cart.id);
    expect(after.lineItems.length).toBe(0);
  });

  it('mergeGuestIntoCustomer: combines same lines + drops guest cart', async () => {
    const svc = new CartService();
    const guest = await svc.getOrCreateGuestCart('session-1');
    await svc.addLine(guest.id, {
      productId: 'p-1',
      quantity: 2,
      unitPriceMinorSnapshot: price('12990'),
    });
    const customer = await svc.mergeGuestIntoCustomer('session-1', 'user-1');
    expect(customer.lineItems.length).toBe(1);
    expect(customer.lineItems[0]?.quantity).toBe(2);
    expect(customer.userId).toBe('user-1');
    // Guest cart no longer exists.
    expect(await svc.resolveCart({ guestSessionId: 'session-1' })).toBeNull();
  });

  it('mergeGuestIntoCustomer: combines matching lines + keeps unique ones', async () => {
    const svc = new CartService();
    // Customer has p-1 x1
    const customerCart = await svc.getOrCreateCustomerCart('user-1');
    await svc.addLine(customerCart.id, {
      productId: 'p-1',
      quantity: 1,
      unitPriceMinorSnapshot: price('12990'),
    });
    await svc.addLine(customerCart.id, {
      productId: 'p-2',
      quantity: 3,
      unitPriceMinorSnapshot: price('9990'),
    });
    // Guest has p-1 x2 + p-3 x1
    const guest = await svc.getOrCreateGuestCart('session-1');
    await svc.addLine(guest.id, {
      productId: 'p-1',
      quantity: 2,
      unitPriceMinorSnapshot: price('12990'),
    });
    await svc.addLine(guest.id, {
      productId: 'p-3',
      quantity: 1,
      unitPriceMinorSnapshot: price('4990'),
    });
    const after = await svc.mergeGuestIntoCustomer('session-1', 'user-1');
    expect(after.lineItems.length).toBe(3);
    const p1 = after.lineItems.find((li) => li.productId === 'p-1');
    expect(p1?.quantity).toBe(3);
  });

  it('mergeGuestIntoCustomer: returns the customer cart unchanged when no guest cart exists', async () => {
    const svc = new CartService();
    await svc.getOrCreateCustomerCart('user-1');
    const after = await svc.mergeGuestIntoCustomer('no-such-session', 'user-1');
    expect(after.userId).toBe('user-1');
  });
});
