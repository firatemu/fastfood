import { ErrorCodes } from '@fastfood/contracts';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { PrismaService } from '../../../common/database/prisma.service.js';

import type { AuthenticatedPrincipal } from './authenticated-principal.js';

/**
 * Canonical `ResourceScopeGuard` — document 39 §3 "ResourceScopeGuard".
 *
 * The actual resource policy is implemented per-module by classes
 * implementing the canonical `ResourcePolicy<TResource, TPrincipal>`
 * interface. This base guard performs the principal-level scope check.
 *
 * The guard is fail-closed: missing scope metadata rejects.
 */
@Injectable()
export class ResourceScopeGuard implements CanActivate {
  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        principal?: AuthenticatedPrincipal;
        params?: Record<string, unknown>;
        query?: Record<string, unknown>;
        body?: unknown;
      }
    >();
    if (!request.principal) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'No principal available for scope check.',
      });
    }
    if (request.principal.actorType === 'STAFF') {
      if (request.principal.isSuperAdmin) return true;
      const params = request.params ?? {};
      const query = request.query ?? {};
      const body =
        request.body && typeof request.body === 'object'
          ? (request.body as Record<string, unknown>)
          : {};
      const explicitBranchIds = [params['branchId'], query['branchId'], body['branchId']].flatMap(
        (value) => (typeof value === 'string' ? [value] : []),
      );
      const requestedBranchIds = Array.isArray(body['branchIds'])
        ? body['branchIds'].filter((value): value is string => typeof value === 'string')
        : [];
      const scope = request.principal.branchIds;
      if (!scope || scope.size !== 1) {
        throw new ForbiddenException({
          code: ErrorCodes.AUTH_SCOPE_DENIED,
          message: 'Staff access requires exactly one assigned branch.',
        });
      }
      if ([...explicitBranchIds, ...requestedBranchIds].some((branchId) => !scope?.has(branchId))) {
        throw new ForbiddenException({
          code: ErrorCodes.AUTH_SCOPE_DENIED,
          message: 'The requested branch is outside your assigned scope.',
        });
      }
      const resourceBranchId = await this.#resourceBranchId(params);
      if (resourceBranchId !== undefined && !scope.has(resourceBranchId ?? '')) {
        throw new ForbiddenException({
          code: ErrorCodes.AUTH_SCOPE_DENIED,
          message: 'The requested resource is outside your assigned branch.',
        });
      }
    }
    return true;
  }

  async #resourceBranchId(params: Record<string, unknown>): Promise<string | null | undefined> {
    const orderId = this.#stringParam(params, 'orderId');
    const deliveryId = this.#stringParam(params, 'deliveryId');
    const paymentId = this.#stringParam(params, 'paymentId');
    const refundId = this.#stringParam(params, 'refundId');
    if (!orderId && !deliveryId && !paymentId && !refundId) return undefined;
    if (!this.prisma) return null;

    if (orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { branchId: true },
      });
      return order?.branchId ?? null;
    }
    if (deliveryId) {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { branchId: true },
      });
      return delivery?.branchId ?? null;
    }
    let checkoutSessionId: string | null = null;
    if (paymentId) {
      const payment = await this.prisma.paymentAttempt.findUnique({
        where: { id: paymentId },
        select: { checkoutSessionId: true },
      });
      checkoutSessionId = payment?.checkoutSessionId ?? null;
    } else if (refundId) {
      const refund = await this.prisma.refund.findUnique({
        where: { id: refundId },
        select: { payment: { select: { checkoutSessionId: true } } },
      });
      checkoutSessionId = refund?.payment.checkoutSessionId ?? null;
    }
    if (!checkoutSessionId) return null;
    const [checkout, order] = await Promise.all([
      this.prisma.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        select: { branchId: true },
      }),
      this.prisma.order.findFirst({
        where: { checkoutSessionId },
        select: { branchId: true },
      }),
    ]);
    return order?.branchId ?? checkout?.branchId ?? null;
  }

  #stringParam(params: Record<string, unknown>, name: string): string | null {
    const value = params[name];
    return typeof value === 'string' ? value : null;
  }
}
