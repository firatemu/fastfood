/**
 * Phase 5 cart-endpoint negative-test matrix (document 39 §10).
 *
 * Cart endpoints are session/ownership scoped rather than RBAC-
 * permission scoped. The matrix covers:
 *   - unauthenticated (no x-user-id / x-session-id),
 *   - authenticated customer with wrong cart ownership,
 *   - correct customer ownership,
 *   - guest session isolation (wrong session id cannot mutate
 *     another guest cart via the ownership policy surface).
 *
 * HTTP-boundary cases boot CartApiModule (no database). Ownership
 * policy cases exercise CartOwnershipPolicy directly.
 */
import { ErrorCodes } from '@fastfood/contracts';
import { ActorType } from '@fastfood/domain-types';
import { ForbiddenException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AuthenticatedPrincipal } from '../../apps/api/src/modules/auth/guards/authenticated-principal.js';
import { CartApiModule } from '../../apps/api/src/modules/cart/cart-api.module.js';
import { CartOwnershipPolicy } from '../../apps/api/src/modules/cart/policies/cart-ownership.policy.js';
import { CustomerAuthService } from '../../apps/api/src/modules/auth/customer/customer-auth.service.js';

const CHEESEBURGER_ID = '01900000-0000-7000-8000-cccccccccccc';
const OWNER_ID = '01900000-0000-7000-8000-0000000000a1';
const OTHER_ID = '01900000-0000-7000-8000-0000000000a2';

async function issueCustomer(auth: CustomerAuthService, phone: string) {
  await auth.requestOtp(phone);
  const verified = await auth.verifyOtp(phone, '000000');
  if (!verified.ok) throw new Error('otp failed');
  return verified;
}

function makePrincipal(id: string): AuthenticatedPrincipal {
  return {
    id,
    actorType: ActorType.CUSTOMER,
    status: 'ACTIVE',
    permissions: new Set<string>(),
    customerId: id,
  };
}

describe('Phase 5 cart negative-test matrix (document 39 §10)', () => {
  describe('CartOwnershipPolicy — resource scope', () => {
    const policy = new CartOwnershipPolicy();

    it('rejects wrong-owner access (authenticated without resource scope)', async () => {
      const principal = makePrincipal(OWNER_ID);
      expect(
        await policy.canAccess(principal, {
          userId: OTHER_ID,
          guestSessionId: null,
        }),
      ).toBe(false);
    });

    it('accepts correct owner access', async () => {
      const principal = makePrincipal(OWNER_ID);
      expect(
        await policy.canAccess(principal, {
          userId: OWNER_ID,
          guestSessionId: null,
        }),
      ).toBe(true);
    });

    it('enforce throws AUTH_SCOPE_DENIED for wrong owner', () => {
      const principal = makePrincipal(OWNER_ID);
      expect(() =>
        policy.enforce(principal, {
          userId: OTHER_ID,
          guestSessionId: null,
        }),
      ).toThrow(ForbiddenException);
    });

    it('enforce allows correct owner', () => {
      const principal = makePrincipal(OWNER_ID);
      expect(() =>
        policy.enforce(principal, {
          userId: OWNER_ID,
          guestSessionId: null,
        }),
      ).not.toThrow();
    });
  });

  describe('HTTP cart endpoints — unauthenticated / wrong-scope / correct', () => {
    let app: NestFastifyApplication | undefined;
    let owner: { customerId: string; refreshToken: string };
    let other: { customerId: string; refreshToken: string };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CartApiModule],
      }).compile();
      app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
        logger: false,
      });
      app.setGlobalPrefix('/api/v1');
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      const auth = app.get(CustomerAuthService);
      owner = await issueCustomer(auth, '+905551000021');
      other = await issueCustomer(auth, '+905551000022');
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    it('rejects unauthenticated GET /storefront/cart', async () => {
      if (!app) throw new Error('app not initialized');
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/storefront/cart',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe(ErrorCodes.AUTH_UNAUTHENTICATED);
    });

    it('rejects unauthenticated POST /storefront/cart/lines', async () => {
      if (!app) throw new Error('app not initialized');
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/storefront/cart/lines',
        headers: { 'content-type': 'application/json' },
        payload: { productId: CHEESEBURGER_ID, quantity: 1 },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json() as { error?: { code: string }; data?: unknown };
      // Controller returns envelope error with 201 HttpCode decorator —
      // assert the error code, not the status, for the authz contract.
      expect(body.error?.code).toBe(ErrorCodes.AUTH_UNAUTHENTICATED);
      expect(body.data).toBeUndefined();
    });

    it('correct-scope customer can add and read their own cart', async () => {
      if (!app) throw new Error('app not initialized');
      const headers = {
        authorization: `Bearer ${owner.refreshToken}`,
        'content-type': 'application/json',
      };
      const added = await app.inject({
        method: 'POST',
        url: '/api/v1/storefront/cart/lines',
        headers,
        payload: { productId: CHEESEBURGER_ID, quantity: 1 },
      });
      expect(added.statusCode).toBe(201);
      const addedBody = added.json() as {
        data: { userId: string; lineItems: unknown[] };
      };
      expect(addedBody.data.userId).toBe(owner.customerId);
      expect(addedBody.data.lineItems).toHaveLength(1);

      const got = await app.inject({
        method: 'GET',
        url: '/api/v1/storefront/cart',
        headers: { authorization: `Bearer ${owner.refreshToken}` },
      });
      expect(got.statusCode).toBe(200);
      const gotBody = got.json() as { data: { lineItems: unknown[] } };
      expect(gotBody.data.lineItems).toHaveLength(1);
    });

    it('wrong-scope customer cannot mutate another customer cart line', async () => {
      if (!app) throw new Error('app not initialized');
      // Owner seeds a line.
      const ownerHeaders = {
        authorization: `Bearer ${owner.refreshToken}`,
        'content-type': 'application/json',
      };
      const seeded = await app.inject({
        method: 'POST',
        url: '/api/v1/storefront/cart/lines',
        headers: ownerHeaders,
        payload: { productId: CHEESEBURGER_ID, quantity: 1 },
      });
      const seededBody = seeded.json() as {
        data: { lineItems: { id: string }[] };
      };
      const lineId = seededBody.data.lineItems[0]?.id;
      expect(lineId).toBeTruthy();

      // Other customer resolves THEIR own cart (empty) — patching a
      // foreign lineId yields NOT_FOUND (cart isolation), not a cross-
      // cart mutation. Document 39 §10 wrong-scope outcome.
      const otherPatch = await app.inject({
        method: 'PATCH',
        url: `/api/v1/storefront/cart/lines/${lineId}`,
        headers: {
          authorization: `Bearer ${other.refreshToken}`,
          'content-type': 'application/json',
        },
        payload: { quantity: 99 },
      });
      expect(otherPatch.statusCode).toBe(200);
      const otherBody = otherPatch.json() as {
        error?: { code: string };
        data?: { lineItems: { quantity: number }[] };
      };
      // Other's cart has no such line → NOT_FOUND envelope.
      expect(otherBody.error?.code).toBe(ErrorCodes.NOT_FOUND);

      // Owner cart unchanged.
      const ownerCart = await app.inject({
        method: 'GET',
        url: '/api/v1/storefront/cart',
        headers: { authorization: `Bearer ${owner.refreshToken}` },
      });
      const ownerBody = ownerCart.json() as {
        data: { lineItems: { id: string; quantity: number }[] };
      };
      const ownerLine = ownerBody.data.lineItems.find((li) => li.id === lineId);
      expect(ownerLine?.quantity).not.toBe(99);
    });

    it('guest sessions are isolated from each other', async () => {
      if (!app) throw new Error('app not initialized');
      const guestA = {
        'x-session-id': 'guest-neg-a',
        'content-type': 'application/json',
      };
      const guestB = {
        'x-session-id': 'guest-neg-b',
        'content-type': 'application/json',
      };
      await app.inject({
        method: 'POST',
        url: '/api/v1/storefront/cart/lines',
        headers: guestA,
        payload: { productId: CHEESEBURGER_ID, quantity: 2 },
      });
      const b = await app.inject({
        method: 'GET',
        url: '/api/v1/storefront/cart',
        headers: { 'x-session-id': 'guest-neg-b' },
      });
      const bBody = b.json() as { data: { lineItems: unknown[] } };
      expect(bBody.data.lineItems).toEqual([]);

      // Guest B adding does not affect Guest A.
      await app.inject({
        method: 'POST',
        url: '/api/v1/storefront/cart/lines',
        headers: guestB,
        payload: { productId: CHEESEBURGER_ID, quantity: 1 },
      });
      const a = await app.inject({
        method: 'GET',
        url: '/api/v1/storefront/cart',
        headers: { 'x-session-id': 'guest-neg-a' },
      });
      const aBody = a.json() as { data: { lineItems: { quantity: number }[] } };
      expect(aBody.data.lineItems[0]?.quantity).toBe(2);
    });
  });
});
