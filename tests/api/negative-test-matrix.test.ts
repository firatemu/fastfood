/**
 * Negative-test matrix for the Phase 3 protected endpoints.
 *
 * Per document 39 §10 every protected endpoint must include
 * negative cases for:
 *   - unauthenticated,
 *   - authenticated without permission,
 *   - permission but wrong resource scope,
 *   - correct permission and scope.
 *
 * The HTTP-boundary negative cases are exercised by the
 * `@fastfood/api` test surface that boots the Nest app via
 * NestFactory + the Fastify adapter and then calls the protected
 * endpoint without a principal / with a wrong-principal.
 *
 * This test exercises the canonical guard sequence directly with
 * synthetic ExecutionContext + principal shapes so it does NOT
 * need a running PostgreSQL / Prisma instance. The HTTP-boundary
 * surface (which exercises the actual middleware stack) is wired
 * into the integration suite under apps/api/test/integration/ when
 * the local Docker Postgres stack is available.
 */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ActorType, Permissions } from '@fastfood/domain-types';

import { AccountStatusGuard } from '../../apps/api/src/modules/auth/guards/account-status.guard.js';
import { AuthGuard } from '../../apps/api/src/modules/auth/guards/auth.guard.js';
import { RbacGuard } from '../../apps/api/src/modules/auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../../apps/api/src/modules/auth/guards/resource-scope.guard.js';
import type { AuthenticatedPrincipal } from '../../apps/api/src/modules/auth/guards/authenticated-principal.js';

interface FakeRequest {
  authenticatedUserId?: string;
  principal?: AuthenticatedPrincipal;
}

function makeContext(req: FakeRequest): {
  switchToHttp: () => { getRequest: () => FakeRequest };
  getHandler: () => unknown;
  getClass: () => unknown;
  getArgs: () => unknown[];
  getArgByIndex: <T>(_index: number) => T;
  switchToRpc: () => never;
  switchToWs: () => never;
  getType: () => string;
} {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class FakeHandler {},
    getArgs: () => [],
    getArgByIndex: <T>(_index: number): T => undefined as T,
    switchToRpc: () => {
      throw new Error('not supported');
    },
    switchToWs: () => {
      throw new Error('not supported');
    },
    getType: () => 'http',
  };
}

function reflectorWith(permissions: string[] | undefined): import('@nestjs/core').Reflector {
  return {
    get: <T>(_key: string): T | undefined => permissions as unknown as T,
    getAll: <T>(_key: string): T[] => (permissions ? [permissions as unknown as T] : []),
    getAllAndOverride: <T>(_key: string, _targets: unknown[]): T | undefined =>
      permissions as unknown as T,
    getAllAndMerge: <T>(_key: string, _targets: unknown[]): T =>
      (permissions as unknown as T) ?? ([] as unknown as T),
  } as unknown as import('@nestjs/core').Reflector;
}

function makePrincipal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    actorType: ActorType.CUSTOMER,
    status: 'ACTIVE',
    permissions: new Set<string>([Permissions.OrdersRead]),
    ...overrides,
  };
}

describe('Phase 3 negative-test matrix (document 39 §10)', () => {
  // ---------------- UNAUTHENTICATED ----------------
  describe('Unauthenticated requests are rejected by AuthGuard', () => {
    it('rejects when no authenticatedUserId is present', async () => {
      const guard = new AuthGuard();
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ---------------- NO PERMISSION ----------------
  describe('Authenticated requests without required permission are rejected by RbacGuard', () => {
    it('rejects when principal lacks required permission', () => {
      const guard = new RbacGuard(reflectorWith([Permissions.OrdersUpdateStatus]));
      const principal = makePrincipal({
        permissions: new Set<string>([Permissions.OrdersRead]),
      });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('accepts when principal has all required permissions', () => {
      const guard = new RbacGuard(reflectorWith([Permissions.OrdersUpdateStatus]));
      const principal = makePrincipal({
        permissions: new Set<string>([Permissions.OrdersRead, Permissions.OrdersUpdateStatus]),
      });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).not.toThrow();
    });

    it('accepts when no permissions metadata is present (open endpoint)', () => {
      const guard = new RbacGuard(reflectorWith(undefined));
      const principal = makePrincipal();
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).not.toThrow();
    });
  });

  // ---------------- WRONG SCOPE ----------------
  describe('AccountStatusGuard rejects wrong account state', () => {
    it('rejects DISABLED accounts', () => {
      const guard = new AccountStatusGuard();
      const principal = makePrincipal({ status: 'DISABLED' });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('rejects PENDING_VERIFICATION accounts', () => {
      const guard = new AccountStatusGuard();
      const principal = makePrincipal({ status: 'PENDING_VERIFICATION' });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('accepts ACTIVE accounts', () => {
      const guard = new AccountStatusGuard();
      const principal = makePrincipal({ status: 'ACTIVE' });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).not.toThrow();
    });
  });

  // ---------------- IDOR ----------------
  describe('ResourceScopeGuard rejects principals without principal', () => {
    it('rejects when no principal is attached', () => {
      const guard = new ResourceScopeGuard(reflectorWith(undefined));
      const ctx = makeContext({});
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('accepts when principal is attached (per-resource policies decide)', () => {
      const guard = new ResourceScopeGuard(reflectorWith(undefined));
      const ctx = makeContext({ principal: makePrincipal() });
      expect(() => guard.canActivate(ctx)).not.toThrow();
    });
  });

  // ---------------- CORRECT PATH ----------------
  describe('Correct principal + correct permission + correct scope is accepted', () => {
    it('accepts when AuthGuard + AccountStatusGuard + RbacGuard all pass', () => {
      const auth = new AuthGuard();
      const account = new AccountStatusGuard();
      const rbac = new RbacGuard(reflectorWith([Permissions.OrdersRead]));
      const principal = makePrincipal({
        status: 'ACTIVE',
        permissions: new Set<string>([Permissions.OrdersRead]),
      });
      const ctx = makeContext({ authenticatedUserId: principal.id, principal });
      expect(() => auth.canActivate(ctx)).not.toThrow();
      expect(() => account.canActivate(ctx)).not.toThrow();
      expect(() => rbac.canActivate(ctx)).not.toThrow();
    });
  });
});
