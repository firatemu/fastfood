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
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CustomerAuthService } from '../auth/customer/customer-auth.service.js';
import { resolveStorefrontPrincipal } from '../auth/customer/request-identity.js';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { CustomerOrderQueryService } from './customer-order-query.service.js';
import { OrderPickupTokenService } from './order-pickup-token.service.js';
import { ORDER_STATUSES, type OrderStatus } from './order-state-machine.js';
import { OrderService } from './order.service.js';
import { ReorderService } from './reorder.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000097';

type StaffBranchPrincipal = {
  actorType?: string;
  isSuperAdmin?: boolean;
  branchIds?: ReadonlySet<string>;
};

function assertStaffBranchAccess(branchId: string | null, principal?: StaffBranchPrincipal): void {
  if (
    principal?.actorType === 'STAFF' &&
    !principal.isSuperAdmin &&
    (!branchId || !principal.branchIds?.has(branchId))
  ) {
    throw new ForbiddenException({
      code: ErrorCodes.AUTH_SCOPE_DENIED,
      message: 'The requested order is outside your assigned branch.',
    });
  }
}

const transitionSchema = z.object({
  toStatus: z.enum(ORDER_STATUSES as unknown as [OrderStatus, ...OrderStatus[]]),
  reason: z.string().max(255).optional(),
});

const reassignSchema = z.object({
  branchId: z.string().uuid(),
  reason: z.string().max(255).optional(),
});

const createOrderSchema = z.object({
  checkoutSessionId: z.string().uuid().optional(),
  merchandiseNetMinor: z.string().regex(/^\d+$/),
  deliveryFeeMinor: z.string().regex(/^\d+$/).optional(),
  loyaltyRedeemedMinor: z.string().regex(/^\d+$/).optional(),
  finalPayableMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3).optional(),
  deliveryAddress: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      line1: z.string().max(255).optional(),
    })
    .optional(),
  branchId: z.string().uuid().optional(),
  initialStatus: z.enum(ORDER_STATUSES as unknown as [OrderStatus, ...OrderStatus[]]).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        productVariantId: z.string().optional(),
        productNameSnapshot: z.string().min(1).max(255),
        quantity: z.number().int().positive(),
        unitPriceMinorSnapshot: z.string().regex(/^\d+$/),
        lineGrossMinorSnapshot: z.string().regex(/^\d+$/),
      }),
    )
    .min(1),
});

function serializeOrder(order: Awaited<ReturnType<OrderService['get']>>): Record<string, unknown> {
  return {
    ...order,
    merchandiseNetMinor: order.merchandiseNetMinor.toString(),
    deliveryFeeMinor: order.deliveryFeeMinor.toString(),
    loyaltyRedeemedMinor: order.loyaltyRedeemedMinor.toString(),
    finalPayableMinor: order.finalPayableMinor.toString(),
    tipMinor: order.tipMinor.toString(),
    pickupDiscountMinor: order.pickupDiscountMinor.toString(),
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    items: order.items.map((i) => ({
      ...i,
      unitPriceMinorSnapshot: i.unitPriceMinorSnapshot.toString(),
      lineGrossMinorSnapshot: i.lineGrossMinorSnapshot.toString(),
      modifiers: i.modifiers.map((m) => ({
        ...m,
        priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot.toString(),
      })),
    })),
    events: order.events,
    branchAssignments: order.branchAssignments,
  };
}

function serializeOrderSummary(
  summary: Awaited<ReturnType<OrderService['summaryByBranch']>>,
): Record<string, unknown> {
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(summary.counts)) {
    counts[key] = value as number;
  }
  return {
    counts,
    kpis: {
      activeCount: summary.kpis.activeCount,
      prepCount: summary.kpis.prepCount,
      deliveredToday: summary.kpis.deliveredToday,
      grossTodayMinor: summary.kpis.grossTodayMinor.toString(),
      refundsTodayMinor: summary.kpis.refundsTodayMinor.toString(),
      avgTicketMinor: summary.kpis.avgTicketMinor.toString(),
      cancellationRateBps: summary.kpis.cancellationRateBps,
    },
  };
}

const orderListQuerySchema = z.object({
  branchId: z.string().min(1),
  statuses: z.string().optional(),
  mode: z.enum(['DELIVERY', 'PICKUP']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  minMinor: z.string().regex(/^\d+$/).optional(),
  maxMinor: z.string().regex(/^\d+$/).optional(),
  q: z.string().max(120).optional(),
  cursor: z.string().uuid().optional(),
  limit: z
    .preprocess(
      (value) => (typeof value === 'string' ? Number(value) : value),
      z.number().int().min(1).max(200),
    )
    .optional(),
});

/**
 * Order HTTP surface (document 29 — Orders/kitchen).
 *
 *   GET  /api/v1/me/orders
 *   GET  /api/v1/orders/:orderId
 *   GET  /api/v1/orders/:orderId/timeline
 *   POST /api/v1/orders (dev/create from paid checkout)
 *   GET  /api/v1/admin/orders
 *   GET  /api/v1/admin/orders/:orderId
 *   POST /api/v1/admin/orders/:orderId/transitions
 *   POST /api/v1/admin/orders/:orderId/reassign-branch
 *   GET  /api/v1/admin/kitchen
 */
@Controller()
export class OrderController {
  constructor(
    @Inject(OrderService) private readonly orders: OrderService,
    @Inject(CustomerOrderQueryService) private readonly customerOrders: CustomerOrderQueryService,
    @Inject(ReorderService) private readonly reorderService: ReorderService,
    @Inject(CustomerAuthService) private readonly customerAuth: CustomerAuthService,
    @Inject(OrderPickupTokenService) private readonly pickupTokens: OrderPickupTokenService,
  ) {}

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Get('me/orders')
  async listMine(@Req() req: FastifyRequest & { authenticatedUserId?: string }): Promise<unknown> {
    const userId = req.authenticatedUserId;
    if (!userId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    return { data: await this.customerOrders.listHistory(userId) };
  }

  @Get('orders/:orderId')
  async getOne(
    @Req() req: FastifyRequest,
    @Param('orderId') orderId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    if (!principal.userId && !principal.guestSessionId) {
      reply.code(401);
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      return { data: await this.customerOrders.getTracking(orderId, principal) };
    } catch (err) {
      return this.#customerErr(reply, err);
    }
  }

  @Get('orders/:orderId/timeline')
  async getTimeline(
    @Req() req: FastifyRequest,
    @Param('orderId') orderId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    if (!principal.userId && !principal.guestSessionId) {
      reply.code(401);
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const view = await this.customerOrders.getTracking(orderId, principal);
      return { data: view.timeline };
    } catch (err) {
      return this.#customerErr(reply, err);
    }
  }

  @Get('orders/:orderId/courier-location')
  async courierLocation(
    @Req() req: FastifyRequest,
    @Param('orderId') orderId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    if (!principal.userId && !principal.guestSessionId) {
      reply.code(401);
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      return { data: await this.customerOrders.getCourierLocation(orderId, principal) };
    } catch (err) {
      return this.#customerErr(reply, err);
    }
  }

  @Post('orders/:orderId/reorder')
  @HttpCode(200)
  async reorder(
    @Req() req: FastifyRequest,
    @Param('orderId') orderId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const principal = await resolveStorefrontPrincipal(req, this.customerAuth);
    if (!principal.userId && !principal.guestSessionId) {
      reply.code(401);
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      return { data: await this.reorderService.reorder(orderId, principal) };
    } catch (err) {
      return this.#customerErr(reply, err);
    }
  }

  #customerErr(reply: FastifyReply, err: unknown): unknown {
    if (err instanceof UnauthorizedException) {
      reply.code(401);
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    reply.code(err instanceof UnauthorizedException ? 401 : 404);
    return {
      error: {
        code:
          err instanceof UnauthorizedException
            ? ErrorCodes.AUTH_UNAUTHENTICATED
            : ErrorCodes.NOT_FOUND,
        message:
          err instanceof UnauthorizedException ? 'Authentication required.' : 'Order not found.',
        requestId: REQUEST_ID,
      },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Post('orders')
  @HttpCode(201)
  async create(
    @Req() req: { authenticatedUserId?: string },
    @Body() body: unknown,
  ): Promise<unknown> {
    const userId = req.authenticatedUserId;
    if (!userId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    const parsed = safeValidate(createOrderSchema, body);
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
    const order = await this.orders.create({
      userId,
      checkoutSessionId: parsed.data.checkoutSessionId,
      merchandiseNetMinor: BigInt(parsed.data.merchandiseNetMinor),
      deliveryFeeMinor: parsed.data.deliveryFeeMinor ? BigInt(parsed.data.deliveryFeeMinor) : 0n,
      loyaltyRedeemedMinor: parsed.data.loyaltyRedeemedMinor
        ? BigInt(parsed.data.loyaltyRedeemedMinor)
        : 0n,
      finalPayableMinor: BigInt(parsed.data.finalPayableMinor),
      currency: parsed.data.currency,
      deliveryAddress: parsed.data.deliveryAddress,
      branchId: parsed.data.branchId,
      initialStatus: parsed.data.initialStatus ?? 'PAID',
      actorUserId: userId,
      items: parsed.data.items.map((i) => ({
        productId: i.productId,
        productVariantId: i.productVariantId,
        productNameSnapshot: i.productNameSnapshot,
        quantity: i.quantity,
        unitPriceMinorSnapshot: BigInt(i.unitPriceMinorSnapshot),
        lineGrossMinorSnapshot: BigInt(i.lineGrossMinorSnapshot),
      })),
    });
    return { data: serializeOrder(order) };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('orders.read')
  @Get('admin/orders/summary')
  async listAdminSummary(
    @Query('branchId') branchId: string | undefined,
    @Req() req: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    if (!branchId) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'branchId query parameter is required.',
          requestId: REQUEST_ID,
        },
      };
    }
    assertStaffBranchAccess(branchId, req.principal);
    const summary = await this.orders.summaryByBranch(branchId);
    return { data: serializeOrderSummary(summary), meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('orders.read')
  @Get('admin/orders')
  async listAdmin(@Req() req: FastifyRequest): Promise<unknown> {
    const parsed = safeValidate(orderListQuerySchema, req.query);
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
    const statuses = parsed.data.statuses
      ? (parsed.data.statuses
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter((s) => (ORDER_STATUSES as readonly string[]).includes(s)) as OrderStatus[])
      : undefined;
    const principal = (req as FastifyRequest & { principal?: StaffBranchPrincipal }).principal;
    const branchId =
      principal?.actorType === 'STAFF' && !principal.isSuperAdmin
        ? [...(principal.branchIds ?? [])][0]
        : parsed.data.branchId;
    const page = await this.orders.listWithFilters({
      branchId,
      statuses,
      fulfillmentMode: parsed.data.mode,
      createdFrom: parsed.data.from ? new Date(parsed.data.from) : undefined,
      createdTo: parsed.data.to ? new Date(parsed.data.to) : undefined,
      minMinor: parsed.data.minMinor !== undefined ? BigInt(parsed.data.minMinor) : undefined,
      maxMinor: parsed.data.maxMinor !== undefined ? BigInt(parsed.data.maxMinor) : undefined,
      query: parsed.data.q,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });
    return {
      data: page.rows.map(serializeOrder),
      meta: { requestId: REQUEST_ID, nextCursor: page.nextCursor, total: page.total },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('orders.read')
  @Get('admin/orders/:orderId')
  async getAdmin(
    @Param('orderId') orderId: string,
    @Req() req: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    try {
      const order = await this.orders.get(orderId);
      assertStaffBranchAccess(order.branchId, req.principal);
      return { data: serializeOrder(order) };
    } catch {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Order not found.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('orders.update_status')
  @Post('admin/orders/:orderId/transitions')
  @HttpCode(200)
  async transition(
    @Param('orderId') orderId: string,
    @Req() req: FastifyRequest & { authenticatedUserId?: string; principal?: StaffBranchPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(transitionSchema, body);
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
    const currentOrder = await this.orders.get(orderId).catch(() => null);
    if (!currentOrder) {
      return {
        error: { code: ErrorCodes.NOT_FOUND, message: 'Order not found.', requestId: REQUEST_ID },
      };
    }
    assertStaffBranchAccess(currentOrder.branchId, req.principal);
    try {
      const order = await this.orders.transition(orderId, {
        toStatus: parsed.data.toStatus,
        reason: parsed.data.reason,
        actorUserId: req.authenticatedUserId ?? null,
      });
      return { data: serializeOrder(order) };
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { code?: string } }).response?.code ??
            ErrorCodes.ORDER_INVALID_TRANSITION)
          : ErrorCodes.ORDER_INVALID_TRANSITION;
      return {
        error: {
          code,
          message: err instanceof Error ? err.message : 'Transition failed.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('orders.read')
  @Post('admin/orders/:orderId/pickup-token')
  @HttpCode(201)
  async issuePickupToken(
    @Param('orderId') orderId: string,
    @Req() req: FastifyRequest & { principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    try {
      const order = await this.orders.get(orderId);
      if (!order) {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Order not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      assertStaffBranchAccess(order.branchId, req.principal);
      const issued = await this.pickupTokens.issueForOrder(orderId);
      return {
        data: {
          token: issued.token,
          prefix: issued.record.tokenPrefix,
          expiresAt: issued.record.expiresAt.toISOString(),
          order: {
            id: order.id,
            displayNumber: order.displayNumber,
          },
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: err instanceof Error ? err.message : 'Pickup token oluşturulamadı.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Post('orders/pickup-tokens/:prefix/scan')
  @HttpCode(200)
  async scanPickupToken(
    @Param('prefix') prefix: string,
    @Req() req: FastifyRequest & { authenticatedUserId?: string; principal?: StaffBranchPrincipal },
  ): Promise<unknown> {
    const courierId = req.authenticatedUserId;
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const consumed = await this.pickupTokens.consumeByPrefix(prefix, courierId);
      const order = await this.orders.get(consumed.orderId);
      return {
        data: {
          orderId: consumed.orderId,
          displayNumber: order?.displayNumber ?? null,
          consumedAt: consumed.consumedAt?.toISOString() ?? null,
          courierId,
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { code?: string } }).response?.code ?? null)
          : null;
      return {
        error: {
          code: status ?? ErrorCodes.NOT_FOUND,
          message: err instanceof Error ? err.message : 'Tarama başarısız.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('orders.reassign_branch')
  @Post('admin/orders/:orderId/reassign-branch')
  @HttpCode(200)
  async reassign(
    @Param('orderId') orderId: string,
    @Req() req: FastifyRequest & { authenticatedUserId?: string; principal?: StaffBranchPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(reassignSchema, body);
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
    const currentOrder = await this.orders.get(orderId).catch(() => null);
    if (!currentOrder) {
      return {
        error: { code: ErrorCodes.NOT_FOUND, message: 'Order not found.', requestId: REQUEST_ID },
      };
    }
    assertStaffBranchAccess(currentOrder.branchId, req.principal);
    try {
      const order = await this.orders.reassignBranch(orderId, parsed.data.branchId, {
        actorUserId: req.authenticatedUserId ?? null,
        reason: parsed.data.reason,
      });
      return { data: serializeOrder(order) };
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { code?: string } }).response?.code ??
            ErrorCodes.ORDER_BRANCH_REASSIGNMENT_NOT_ALLOWED)
          : ErrorCodes.ORDER_BRANCH_REASSIGNMENT_NOT_ALLOWED;
      return {
        error: {
          code,
          message: err instanceof Error ? err.message : 'Reassignment failed.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('orders.read')
  @Get('admin/kitchen')
  async kitchenBoard(@Query('branchId') branchId?: string): Promise<unknown> {
    if (!branchId) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'branchId query parameter is required.',
          requestId: REQUEST_ID,
        },
      };
    }
    return { data: (await this.orders.listKitchenBoard(branchId)).map(serializeOrder) };
  }
}
