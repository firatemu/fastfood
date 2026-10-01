/**
 * Unit tests for the canonical Phase 3 guard sequence.
 *
 * Each guard is exercised against a synthetic ExecutionContext.
 * Per document 39 §2 the canonical order is
 *   AuthGuard → AccountStatusGuard → RbacGuard → ResourceScopeGuard.
 */
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { CustomerAuthService } from '../../../src/modules/auth/customer/customer-auth.service.js';
import { AccountStatusGuard } from '../../../src/modules/auth/guards/account-status.guard.js';
import { AuthGuard } from '../../../src/modules/auth/guards/auth.guard.js';
import { RbacGuard } from '../../../src/modules/auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../../../src/modules/auth/guards/resource-scope.guard.js';
import { ActorType, Permissions } from '@fastfood/domain-types';
import type { AuthenticatedPrincipal } from '../../../src/modules/auth/guards/authenticated-principal.js';

function makeContext(req: Record<string, unknown>): {
  switchToHttp: () => { getRequest: () => Record<string, unknown> };
  getHandler: () => unknown;
  getClass: () => unknown;
  getArgs: () => unknown[];
  getArgByIndex: <T = unknown>(_index: number) => T;
  switchToRpc: () => never;
  switchToWs: () => never;
  getType: () => string;
} {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class FakeHandler {},
    getArgs: () => [],
    getArgByIndex: <T = unknown>(_index: number): T => undefined as T,
    switchToRpc: () => {
      throw new Error('not supported');
    },
    switchToWs: () => {
      throw new Error('not supported');
    },
    getType: () => 'http',
  };
}

function makeReflectorReturning<T>(value: T): Reflector {
  return {
    get: <U>(_key: string): U | undefined => value as unknown as U,
    getAll: <U>(_key: string): U[] => [value as unknown as U],
    getAllAndOverride: <U>(_key: string, _targets: unknown[]): U | undefined =>
      value as unknown as U,
    getAllAndMerge: <U>(_key: string, _targets: unknown[]): U => value as unknown as U,
  } as unknown as Reflector;
}

describe('Phase 3 canonical guard sequence', () => {
  describe('AuthGuard', () => {
    const guard = new AuthGuard();
    it('rejects when no authenticatedUserId is present', async () => {
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
    it('accepts when authenticatedUserId is present', async () => {
      const ctx = makeContext({ authenticatedUserId: '01900000-0000-7000-8000-000000000001' });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
    it('does not trust browser-supplied X-User-Id', async () => {
      const sessions = new CustomerAuthService();
      const local = new AuthGuard(sessions);
      const ctx = makeContext({
        headers: { 'x-user-id': '01900000-0000-7000-8000-000000000099' },
      });
      await expect(local.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
    it('does not trust spoofed customer-{uuid}-{ts} bearers', async () => {
      const sessions = new CustomerAuthService();
      const local = new AuthGuard(sessions);
      const ctx = makeContext({
        headers: {
          authorization: 'Bearer customer-01900000-0000-7000-8000-000000000001-1',
        },
      });
      await expect(local.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
    it('accepts a hashed customer refresh session', async () => {
      const sessions = new CustomerAuthService();
      const phone = '+905551009901';
      await sessions.requestOtp(phone);
      const verified = await sessions.verifyOtp(phone, '000000');
      if (!verified.ok) throw new Error('otp verify failed');
      const local = new AuthGuard(sessions);
      const ctx = makeContext({
        headers: { authorization: `Bearer ${verified.refreshToken}` },
      });
      await expect(local.canActivate(ctx)).resolves.toBe(true);
    });
  });

  describe('AccountStatusGuard', () => {
    const guard = new AccountStatusGuard();
    it('rejects when no principal', async () => {
      const ctx = makeContext({});
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
    it('rejects when status is DISABLED', async () => {
      const ctx = makeContext({
        principal: {
          id: '01900000-0000-7000-8000-000000000001',
          actorType: ActorType.STAFF,
          status: 'DISABLED',
          permissions: new Set<string>(),
        } satisfies AuthenticatedPrincipal,
      });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
    it('accepts ACTIVE STAFF', async () => {
      const ctx = makeContext({
        principal: {
          id: '01900000-0000-7000-8000-000000000001',
          actorType: ActorType.STAFF,
          status: 'ACTIVE',
          permissions: new Set<string>(),
        } satisfies AuthenticatedPrincipal,
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
    it('rejects SYSTEM actor type', async () => {
      const ctx = makeContext({
        principal: {
          id: '01900000-0000-7000-8000-000000000001',
          actorType: ActorType.SYSTEM,
          status: 'ACTIVE',
          permissions: new Set<string>(),
        },
      });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  describe('RbacGuard', () => {
    const reflector = new Reflector();
    const guard = new RbacGuard(reflector);

    it('passes when no @RequirePermissions metadata is present', async () => {
      const ctx = makeContext({});
      expect(guard.canActivate(ctx)).toBe(true);
    });
    it('rejects when principal lacks required permission', async () => {
      const local = new RbacGuard(makeReflectorReturning([Permissions.OrdersRead]));
      const ctx = makeContext({
        principal: {
          id: '01900000-0000-7000-8000-000000000001',
          actorType: ActorType.STAFF,
          status: 'ACTIVE',
          permissions: new Set<string>([Permissions.CatalogProductsRead]),
        } satisfies AuthenticatedPrincipal,
      });
      expect(() => local.canActivate(ctx)).toThrow(ForbiddenException);
    });
    it('accepts when principal has all required permissions', async () => {
      const local = new RbacGuard(
        makeReflectorReturning([Permissions.OrdersRead, Permissions.OrdersUpdateStatus]),
      );
      const ctx = makeContext({
        principal: {
          id: '01900000-0000-7000-8000-000000000001',
          actorType: ActorType.STAFF,
          status: 'ACTIVE',
          permissions: new Set<string>([Permissions.OrdersRead, Permissions.OrdersUpdateStatus]),
        } satisfies AuthenticatedPrincipal,
      });
      expect(local.canActivate(ctx)).toBe(true);
    });
  });

  describe('ResourceScopeGuard', () => {
    const reflector = new Reflector();
    const guard = new ResourceScopeGuard(reflector);
    it('passes through when principal is present (per-resource policies decide)', async () => {
      const ctx = makeContext({
        principal: {
          id: '01900000-0000-7000-8000-000000000001',
          actorType: ActorType.STAFF,
          status: 'ACTIVE',
          permissions: new Set<string>(),
          branchIds: new Set<string>(['01900000-0000-7000-8000-aaaaaaaaaaaa']),
        } satisfies AuthenticatedPrincipal,
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
    it('rejects when no principal is attached', async () => {
      const ctx = makeContext({});
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
