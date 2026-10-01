import { ErrorCodes } from '@fastfood/contracts';
import { Controller, ForbiddenException, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';
import { PaymentService } from '../payment/payment.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';
type StaffBranchPrincipal = {
  actorType?: string;
  isSuperAdmin?: boolean;
  branchIds?: ReadonlySet<string>;
};

@Controller({ path: 'admin' })
export class AdminPaymentController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('payments.read')
  @Get('payments')
  async list(
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const principal = request.principal;
    const branchId =
      principal?.actorType === 'STAFF' && !principal.isSuperAdmin
        ? [...(principal.branchIds ?? [])][0]
        : undefined;
    const rows = await this.payments.listPayments(50, branchId);
    return {
      data: rows.map((p) => ({
        ...p,
        amountMinor: p.amountMinor.toString(),
      })),
      meta: { requestId: REQUEST_ID },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('payments.read')
  @Get('payments/:paymentId')
  async get(
    @Param('paymentId') paymentId: string,
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const principal = request.principal;
    if (
      principal?.actorType === 'STAFF' &&
      !principal.isSuperAdmin &&
      !(await this.payments.isPaymentInBranch(paymentId, [...(principal.branchIds ?? [])][0] ?? ''))
    ) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'The requested payment is outside your assigned branch.',
      });
    }
    const payment = await this.payments.getPayment(paymentId);
    if (!payment) {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Payment not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    return {
      data: { ...payment, amountMinor: payment.amountMinor.toString() },
      meta: { requestId: REQUEST_ID },
    };
  }
}
