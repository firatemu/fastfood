import { Global, Module } from '@nestjs/common';

import { CustomerAuthModule } from './customer/customer-auth.module.js';
import { AccountStatusGuard } from './guards/account-status.guard.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RbacGuard } from './guards/rbac.guard.js';
import { ResourceScopeGuard } from './guards/resource-scope.guard.js';
import { StaffAuthModule } from './staff/staff-auth.module.js';

/**
 * Auth module (document 39).
 *
 * Phase 3 ships the canonical guard sequence:
 *   AuthGuard → AccountStatusGuard → RbacGuard → ResourceScopeGuard
 *   (document 39 §2).
 *
 * Staff access tokens use the locked RS256 configured key paths and
 * resolve each request against the active database session. Real customer / staff auth endpoints
 * are implemented under P3-005 / P3-006. The module is wired into the
 * application; consumers attach guards per-route via
 * `@UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)`.
 */
@Global()
@Module({
  imports: [CustomerAuthModule, StaffAuthModule],
  providers: [AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard],
  exports: [AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard],
})
export class AuthModule {}
