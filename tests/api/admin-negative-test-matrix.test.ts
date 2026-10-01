/**
 * Phase 4 admin-endpoint negative-test matrix (document 39 §10).
 *
 * Mirrors tests/api/negative-test-matrix.test.ts but targets the
 * Phase 4 admin endpoints. The matrix covers:
 *   - unauthenticated requests
 *   - authenticated without the required permission
 *   - permission but wrong branch scope (BranchScopePolicy)
 *   - correct permission + correct scope
 */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ActorType, Permissions } from '@fastfood/domain-types';

import { AccountStatusGuard } from '../../apps/api/src/modules/auth/guards/account-status.guard.js';
import { AuthGuard } from '../../apps/api/src/modules/auth/guards/auth.guard.js';
import { RbacGuard } from '../../apps/api/src/modules/auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../../apps/api/src/modules/auth/guards/resource-scope.guard.js';
import { BranchScopePolicy } from '../../apps/api/src/modules/branch/policies/branch-scope.policy.js';
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
    actorType: ActorType.STAFF,
    status: 'ACTIVE',
    permissions: new Set<string>([
      Permissions.CatalogProductsRead,
      Permissions.CatalogProductsWrite,
    ]),
    branchIds: new Set<string>(['01900000-0000-7000-8000-faaaaaaaaaaa']),
    ...overrides,
  };
}

describe('Phase 4 admin-endpoint negative-test matrix (document 39 §10)', () => {
  describe('POST /api/v1/admin/categories — CatalogProductsWrite', () => {
    it('rejects unauthenticated request via AuthGuard', async () => {
      const guard = new AuthGuard();
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects DISABLED staff via AccountStatusGuard', () => {
      const guard = new AccountStatusGuard();
      const principal = makePrincipal({ status: 'DISABLED' });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('rejects staff without CatalogProductsWrite', () => {
      const guard = new RbacGuard(reflectorWith([Permissions.CatalogProductsWrite]));
      const principal = makePrincipal({
        permissions: new Set<string>([Permissions.CatalogProductsRead]),
      });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('accepts staff with the permission + scope', () => {
      const auth = new AuthGuard();
      const account = new AccountStatusGuard();
      const rbac = new RbacGuard(reflectorWith([Permissions.CatalogProductsWrite]));
      const principal = makePrincipal();
      const ctx = makeContext({ authenticatedUserId: principal.id, principal });
      expect(() => auth.canActivate(ctx)).not.toThrow();
      expect(() => account.canActivate(ctx)).not.toThrow();
      expect(() => rbac.canActivate(ctx)).not.toThrow();
    });
  });

  describe('POST /api/v1/admin/branches — BranchesWrite', () => {
    it('rejects staff with BranchesRead only', () => {
      const guard = new RbacGuard(reflectorWith([Permissions.BranchesWrite]));
      const principal = makePrincipal({
        permissions: new Set<string>([Permissions.BranchesRead]),
      });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('accepts HQ staff with BranchesWrite', () => {
      const guard = new RbacGuard(reflectorWith([Permissions.BranchesWrite]));
      const principal = makePrincipal({
        permissions: new Set<string>([Permissions.BranchesWrite, Permissions.CatalogProductsWrite]),
        branchIds: new Set<string>(),
      });
      const ctx = makeContext({ principal });
      expect(() => guard.canActivate(ctx)).not.toThrow();
    });
  });

  describe('BranchScopePolicy — branches/:branchId endpoints', () => {
    const policy = new BranchScopePolicy();

    it('rejects branch staff trying to read another branch', () => {
      const principal = makePrincipal({
        branchIds: new Set<string>(['01900000-0000-7000-8000-aaaaaaaaaaaa']),
      });
      expect(() =>
        policy.enforce(principal, { branchId: '01900000-0000-7000-8000-bbbbbbbbbbbb' }),
      ).toThrow(ForbiddenException);
    });

    it('accepts branch staff reading their own branch', () => {
      const principal = makePrincipal({
        branchIds: new Set<string>(['01900000-0000-7000-8000-aaaaaaaaaaaa']),
      });
      expect(() =>
        policy.enforce(principal, { branchId: '01900000-0000-7000-8000-aaaaaaaaaaaa' }),
      ).not.toThrow();
    });

    it('accepts HQ staff with empty branch scope (global access)', () => {
      const principal = makePrincipal({ branchIds: new Set<string>() });
      expect(() => policy.enforce(principal, { branchId: 'any' })).not.toThrow();
    });
  });
});
