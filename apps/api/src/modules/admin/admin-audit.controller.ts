import { ErrorCodes } from '@fastfood/contracts';
import { Controller, ForbiddenException, Get, Inject, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { AuditQueryService } from './audit-query.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';
type StaffBranchPrincipal = {
  actorType?: string;
  isSuperAdmin?: boolean;
  branchIds?: ReadonlySet<string>;
};

@Controller({ path: 'admin' })
export class AdminAuditController {
  constructor(@Inject(AuditQueryService) private readonly audit: AuditQueryService) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('audit.read')
  @Get('audit')
  async list(
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const principal = request.principal;
    const branchIds = [...(principal?.branchIds ?? [])];
    if (principal?.actorType === 'STAFF' && !principal.isSuperAdmin && branchIds.length !== 1) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'Staff access requires exactly one assigned branch.',
      });
    }
    const rows = await this.audit.list(
      50,
      principal?.actorType === 'STAFF' && !principal.isSuperAdmin ? branchIds[0] : undefined,
    );
    return { data: rows, meta: { requestId: REQUEST_ID } };
  }
}
