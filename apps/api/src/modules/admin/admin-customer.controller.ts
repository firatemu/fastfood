import { ErrorCodes } from '@fastfood/contracts';
import { Controller, ForbiddenException, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';
import { ClubService } from '../loyalty/club.service.js';

import { AdminCustomerService } from './admin-customer.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';
type StaffBranchPrincipal = {
  actorType?: string;
  isSuperAdmin?: boolean;
  branchIds?: ReadonlySet<string>;
};

@Controller({ path: 'admin' })
export class AdminCustomerController {
  constructor(
    @Inject(AdminCustomerService) private readonly customers: AdminCustomerService,
    @Inject(ClubService) private readonly club: ClubService,
  ) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('customers.read')
  @Get('customers')
  async list(
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const rows = await this.customers.list(50, this.#branchId(request.principal));
    return { data: rows, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('loyalty.read')
  @Get('customers/:userId/club')
  async clubSnapshot(
    @Param('userId') userId: string,
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const row = await this.customers.get(userId, this.#branchId(request.principal));
    if (!row) {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Customer not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    const snapshot = await this.club.inspectSnapshot(userId);
    return { data: snapshot, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('customers.read')
  @Get('customers/:userId')
  async detail(
    @Param('userId') userId: string,
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const row = await this.customers.get(userId, this.#branchId(request.principal));
    if (!row) {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Customer not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    return { data: row, meta: { requestId: REQUEST_ID } };
  }

  #branchId(principal?: StaffBranchPrincipal): string | undefined {
    if (principal?.actorType !== 'STAFF' || principal.isSuperAdmin) return undefined;
    const branchIds = [...(principal.branchIds ?? [])];
    if (branchIds.length !== 1) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'Staff access requires exactly one assigned branch.',
      });
    }
    return branchIds[0];
  }
}
