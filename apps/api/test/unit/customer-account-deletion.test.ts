/**
 * ADR-023: customer self-service account deletion.
 */
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ErrorCodes } from '@fastfood/contracts';
import { ActorType } from '@fastfood/domain-types';

import type { PrismaService } from '../../src/common/database/prisma.service.js';
import type { AuthenticatedPrincipal } from '../../src/modules/auth/guards/authenticated-principal.js';
import { CustomerOwnershipPolicy } from '../../src/modules/customer/customer-ownership.policy.js';
import { CustomerController } from '../../src/modules/customer/customer.controller.js';
import {
  ACCOUNT_DELETION_CLOSED_ORDER_STATUSES,
  CustomerService,
} from '../../src/modules/customer/customer.service.js';
import type { FavoritesService } from '../../src/modules/customer/favorites.service.js';
import type { LoyaltyService } from '../../src/modules/loyalty/loyalty.service.js';

const USER_ID = '01900000-0000-7000-8000-0000000000d1';

function principal(actorType: ActorType = ActorType.CUSTOMER): AuthenticatedPrincipal {
  return {
    id: USER_ID,
    actorType,
    status: 'ACTIVE',
    permissions: new Set<string>(),
    customerId: USER_ID,
  };
}

const DELETED_MODELS = [
  'customerProfile',
  'customerCredential',
  'authIdentity',
  'customerPreference',
  'emailVerificationChallenge',
  'passwordResetChallenge',
  'session',
  'address',
  'customerFavorite',
  'notification',
  'supportConversation',
  'newsletterSubscription',
] as const;

const UPDATED_MODELS = [
  'cart',
  'diningTableScan',
  'delivery',
  'order',
  'checkoutSession',
  'user',
] as const;

function fakePrisma(openOrder: { id: string } | null) {
  const tx: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  for (const model of DELETED_MODELS)
    tx[model] = { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) };
  for (const model of UPDATED_MODELS)
    tx[model] = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
  tx['order']!['findMany'] = vi.fn().mockResolvedValue([{ id: 'order-1' }]);
  const prisma = {
    order: { findFirst: vi.fn().mockResolvedValue(openOrder) },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
  };
  return { prisma, tx };
}

function service(prisma: unknown): CustomerService {
  return new CustomerService(new CustomerOwnershipPolicy(), prisma as PrismaService);
}

describe('ADR-023 account deletion', () => {
  it('refuses while an order is still open', async () => {
    const { prisma } = fakePrisma({ id: 'open-order' });
    const err = await service(prisma)
      .deleteAccount(principal())
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toMatchObject({
      code: ErrorCodes.ACCOUNT_HAS_ACTIVE_ORDER,
    });
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: { notIn: [...ACCOUNT_DELETION_CLOSED_ORDER_STATUSES] } },
      select: { id: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes personal data and keeps a de-identified tombstone', async () => {
    const { prisma, tx } = fakePrisma(null);
    await service(prisma).deleteAccount(principal());

    for (const model of DELETED_MODELS) {
      expect(tx[model]!['deleteMany']).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    }
    expect(tx['delivery']!['updateMany']).toHaveBeenCalledWith({
      where: { orderId: { in: ['order-1'] } },
      data: expect.objectContaining({
        recipientName: null,
        recipientPhone: null,
        addressLine: null,
      }),
    });
    expect(tx['order']!['updateMany']).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        data: expect.objectContaining({ deliveryNote: null, buildingAccessCode: null }),
      }),
    );
    expect(tx['checkoutSession']!['updateMany']).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { deliveryNote: null, buildingAccessCode: null, guestName: null, guestPhone: null },
    });
    expect(tx['user']!['updateMany']).toHaveBeenCalledWith({
      where: { id: USER_ID, actorType: 'CUSTOMER' },
      data: expect.objectContaining({
        status: 'DISABLED',
        primaryIdentifier: null,
        primaryIdentifierType: null,
        displayName: null,
      }),
    });
  });

  it('removes in-memory profile data without a database', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    await svc.patchProfile(principal(), { displayName: 'Silinecek' });
    await svc.deleteAccount(principal());
    const profile = await svc.getProfile(principal());
    expect(profile.displayName).not.toBe('Silinecek');
  });
});

describe('DELETE /me controller', () => {
  function controller(svc: CustomerService): CustomerController {
    return new CustomerController(svc, {} as LoyaltyService, {} as FavoritesService);
  }

  it('requires an explicit confirmation', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const spy = vi.spyOn(svc, 'deleteAccount');
    const res = (await controller(svc).deleteMe({ principal: principal() } as never, {})) as {
      error?: { code: string };
    };
    expect(res.error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects staff principals', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const spy = vi.spyOn(svc, 'deleteAccount');
    await expect(
      controller(svc).deleteMe({ principal: principal(ActorType.STAFF) } as never, {
        confirm: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(spy).not.toHaveBeenCalled();
  });

  it('deletes a confirmed customer account', async () => {
    const svc = new CustomerService(new CustomerOwnershipPolicy());
    const spy = vi.spyOn(svc, 'deleteAccount');
    const res = await controller(svc).deleteMe({ principal: principal() } as never, {
      confirm: true,
    });
    expect(res).toMatchObject({ data: { deleted: true } });
    expect(spy).toHaveBeenCalledOnce();
  });
});
