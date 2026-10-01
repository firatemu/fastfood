import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';
import { PaymentService } from '../payment/payment.service.js';

import { RefundService } from './refund.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000095';
type StaffBranchPrincipal = {
  actorType?: string;
  isSuperAdmin?: boolean;
  branchIds?: ReadonlySet<string>;
};

const createRefundSchema = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  reason: z.string().max(255).optional(),
});

@Controller()
export class RefundController {
  constructor(
    @Inject(RefundService) private readonly refunds: RefundService,
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('payments.refund')
  @Post('admin/payments/:paymentId/refunds')
  @HttpCode(201)
  async create(
    @Param('paymentId') paymentId: string,
    @Body() body: unknown,
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const parsed = safeValidate(createRefundSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      await this.#assertPaymentAccess(paymentId, request.principal);
      const refund = await this.refunds.create({
        paymentId,
        amountMinor: BigInt(parsed.data.amountMinor),
        reason: parsed.data.reason,
      });
      return {
        data: {
          ...refund,
          amountMinor: refund.amountMinor.toString(),
        },
      };
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      const code =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { code?: string } }).response?.code ??
            ErrorCodes.REFUND_NOT_ALLOWED)
          : ErrorCodes.REFUND_NOT_ALLOWED;
      return {
        error: {
          code,
          message: err instanceof Error ? err.message : 'Refund failed.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('payments.read')
  @Get('admin/refunds/:refundId')
  async get(
    @Param('refundId') refundId: string,
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    try {
      const refund = await this.refunds.get(refundId);
      await this.#assertPaymentAccess(refund.paymentId, request.principal);
      return { data: { ...refund, amountMinor: refund.amountMinor.toString() } };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Refund not found.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('payments.read')
  @Get('admin/payments/:paymentId/refunds')
  async listByPayment(
    @Param('paymentId') paymentId: string,
    @Req() request: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    await this.#assertPaymentAccess(paymentId, request.principal);
    const rows = await this.refunds.listByPayment(paymentId);
    return {
      data: rows.map((refund) => ({ ...refund, amountMinor: refund.amountMinor.toString() })),
    };
  }

  async #assertPaymentAccess(paymentId: string, principal?: StaffBranchPrincipal): Promise<void> {
    if (principal?.actorType !== 'STAFF' || principal.isSuperAdmin) return;
    const branchIds = [...(principal.branchIds ?? [])];
    const branchId = branchIds.length === 1 ? branchIds[0] : undefined;
    if (!branchId || !(await this.payments.isPaymentInBranch(paymentId, branchId))) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'The requested payment is outside your assigned branch.',
      });
    }
  }
}
