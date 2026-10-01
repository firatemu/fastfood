/**
 * CartOwnershipPolicy unit tests (document 39 §5 + document 09 §1).
 */
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ActorType } from '@fastfood/domain-types';

import type { AuthenticatedPrincipal } from '../../src/modules/auth/guards/authenticated-principal.js';
import { CartOwnershipPolicy } from '../../src/modules/cart/policies/cart-ownership.policy.js';

function makePrincipal(id: string): AuthenticatedPrincipal {
  return {
    id,
    actorType: ActorType.CUSTOMER,
    status: 'ACTIVE',
    permissions: new Set<string>(),
    customerId: id,
  };
}

describe('Phase 5 CartOwnershipPolicy', () => {
  const policy = new CartOwnershipPolicy();

  it('customer can access their own cart', async () => {
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    expect(
      await policy.canAccess(principal, {
        userId: '01900000-0000-7000-8000-000000000001',
        guestSessionId: null,
      }),
    ).toBe(true);
  });

  it("customer cannot access another customer's cart", async () => {
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    expect(
      await policy.canAccess(principal, {
        userId: '01900000-0000-7000-8000-000000000002',
        guestSessionId: null,
      }),
    ).toBe(false);
  });

  it('authenticated principal cannot access a guest cart via canAccess', async () => {
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    expect(await policy.canAccess(principal, { userId: null, guestSessionId: 'session-1' })).toBe(
      false,
    );
  });

  it('enforce throws AUTH_SCOPE_DENIED when principal is not the owner', async () => {
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    expect(() =>
      policy.enforce(principal, {
        userId: '01900000-0000-8000-000000000002',
        guestSessionId: null,
      }),
    ).toThrow(ForbiddenException);
  });

  it('enforce allows the owner', async () => {
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    expect(() =>
      policy.enforce(principal, {
        userId: '01900000-0000-7000-8000-000000000001',
        guestSessionId: null,
      }),
    ).not.toThrow();
  });

  it('enforce silently passes for guest carts (controller layer guards)', async () => {
    const principal = makePrincipal('01900000-0000-7000-8000-000000000001');
    expect(() =>
      policy.enforce(principal, { userId: null, guestSessionId: 'session-1' }),
    ).not.toThrow();
  });
});
