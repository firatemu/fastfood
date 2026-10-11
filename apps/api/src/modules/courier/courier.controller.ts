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
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { DeliveryService } from './delivery.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000096';

const claimSchema = z.object({
  token: z.string().min(16).max(128),
});

const assignSchema = z.object({
  courierId: z.string().uuid(),
  reason: z.string().max(255).optional(),
});

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().positive().optional(),
});

const createDeliverySchema = z.object({
  orderId: z.string().uuid(),
  branchId: z.string().uuid(),
  recipientName: z.string().max(128).optional(),
  recipientPhone: z.string().max(32).optional(),
  addressLine: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  deliveryNote: z.string().max(512).optional(),
});

/**
 * Courier / delivery HTTP surface (document 29).
 */
@Controller()
export class CourierController {
  constructor(@Inject(DeliveryService) private readonly deliveries: DeliveryService) {}

  async #resolveCourierId(req: {
    authenticatedUserId?: string;
    courierId?: string;
  }): Promise<string | null> {
    if (req.courierId) return req.courierId;
    if (!req.authenticatedUserId) return null;
    const courier = await this.deliveries.getCourierByUser(req.authenticatedUserId);
    return courier?.id ?? null;
  }

  async #assertCourierBranchAccess(
    courierId: string,
    principal?: AuthenticatedPrincipal,
  ): Promise<void> {
    if (principal?.actorType !== 'STAFF' || principal.isSuperAdmin) return;
    const branchIds = [...(principal.branchIds ?? [])];
    const branchId = branchIds.length === 1 ? branchIds[0] : undefined;
    if (!branchId || !(await this.deliveries.isCourierLinkedToBranch(courierId, branchId))) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'The courier is outside your assigned branch.',
      });
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('couriers.assign')
  @Post('admin/deliveries')
  @HttpCode(201)
  async createDelivery(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(createDeliverySchema, body);
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
    return { data: await this.deliveries.createDelivery(parsed.data) };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('couriers.assign')
  @Post('admin/deliveries/:deliveryId/assign')
  async assign(
    @Param('deliveryId') deliveryId: string,
    @Req()
    req: {
      authenticatedUserId?: string;
      principal?: AuthenticatedPrincipal;
    },
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(assignSchema, body);
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
      await this.#assertCourierBranchAccess(parsed.data.courierId, req.principal);
      return {
        data: await this.deliveries.assign(deliveryId, parsed.data.courierId, {
          assignedBy: req.authenticatedUserId ?? null,
          reason: parsed.data.reason,
        }),
      };
    } catch (err) {
      return this.#err(err);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('couriers.assign')
  @Post('admin/deliveries/:deliveryId/reassign')
  async reassign(
    @Param('deliveryId') deliveryId: string,
    @Req()
    req: {
      authenticatedUserId?: string;
      principal?: AuthenticatedPrincipal;
    },
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(assignSchema, body);
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
      await this.#assertCourierBranchAccess(parsed.data.courierId, req.principal);
      return {
        data: await this.deliveries.reassign(deliveryId, parsed.data.courierId, {
          assignedBy: req.authenticatedUserId ?? null,
          reason: parsed.data.reason,
        }),
      };
    } catch (err) {
      return this.#err(err);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('couriers.assign')
  @Post('admin/deliveries/:deliveryId/qr-token')
  @HttpCode(201)
  async issueQr(@Param('deliveryId') deliveryId: string): Promise<unknown> {
    try {
      return { data: await this.deliveries.issueQrClaimToken(deliveryId) };
    } catch (err) {
      return this.#err(err);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Get('courier/deliveries')
  async listMine(
    @Req() req: { authenticatedUserId?: string; courierId?: string },
  ): Promise<unknown> {
    const courierId = await this.#resolveCourierId(req);
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Courier authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    return { data: await this.deliveries.listForCourier(courierId) };
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Get('courier/deliveries/:deliveryId')
  async getOne(
    @Param('deliveryId') deliveryId: string,
    @Req() req: { authenticatedUserId?: string; courierId?: string },
  ): Promise<unknown> {
    const courierId = await this.#resolveCourierId(req);
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Courier authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const d = await this.deliveries.get(deliveryId);
      if (d.courierId !== courierId) {
        return {
          error: {
            code: ErrorCodes.AUTH_SCOPE_DENIED,
            message: 'Delivery not in courier scope.',
            requestId: REQUEST_ID,
          },
        };
      }
      return {
        data: {
          ...d,
          navigationUrl: await this.deliveries.mapsNavigationUrl(deliveryId),
        },
      };
    } catch (err) {
      return this.#err(err);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Post('courier/claims/qr')
  @HttpCode(200)
  async claimQr(
    @Req() req: { authenticatedUserId?: string; courierId?: string },
    @Body() body: unknown,
  ): Promise<unknown> {
    const courierId = await this.#resolveCourierId(req);
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Courier authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    const parsed = safeValidate(claimSchema, body);
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
      return { data: await this.deliveries.claimByQr(parsed.data.token, courierId) };
    } catch (err) {
      return this.#err(err);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Post('courier/deliveries/:deliveryId/pickup')
  pickup(
    @Param('deliveryId') deliveryId: string,
    @Req() req: { authenticatedUserId?: string; courierId?: string },
  ): unknown {
    return this.#ownedAction(req, deliveryId, (id) => this.deliveries.pickup(deliveryId, id));
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Post('courier/deliveries/:deliveryId/on-the-way')
  onTheWay(
    @Param('deliveryId') deliveryId: string,
    @Req() req: { authenticatedUserId?: string; courierId?: string },
  ): unknown {
    return this.#ownedAction(req, deliveryId, (id) => this.deliveries.onTheWay(deliveryId, id));
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Post('courier/deliveries/:deliveryId/deliver')
  deliver(
    @Param('deliveryId') deliveryId: string,
    @Req() req: { authenticatedUserId?: string; courierId?: string },
  ): unknown {
    return this.#ownedAction(req, deliveryId, (id) => this.deliveries.deliver(deliveryId, id));
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Post('courier/deliveries/:deliveryId/location')
  async location(
    @Param('deliveryId') deliveryId: string,
    @Req() req: { authenticatedUserId?: string; courierId?: string },
    @Body() body: unknown,
  ): Promise<unknown> {
    const courierId = await this.#resolveCourierId(req);
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Courier authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    const parsed = safeValidate(locationSchema, body);
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
      return {
        data: await this.deliveries.recordLocation({
          courierId,
          deliveryId,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          accuracyM: parsed.data.accuracyM,
        }),
      };
    } catch (err) {
      return this.#err(err);
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Get('courier/me/performance')
  async performance(
    @Req() req: { authenticatedUserId?: string; courierId?: string },
  ): Promise<unknown> {
    const courierId = await this.#resolveCourierId(req);
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Courier authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    return { data: await this.deliveries.performance(courierId) };
  }

  @UseGuards(AuthGuard, AccountStatusGuard)
  @Get('courier/deliveries/:deliveryId/navigation')
  async navigation(
    @Param('deliveryId') deliveryId: string,
    @Req() req: { authenticatedUserId?: string; courierId?: string },
    @Query('unused') _unused?: string,
  ): Promise<unknown> {
    const courierId = await this.#resolveCourierId(req);
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Courier authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const d = await this.deliveries.get(deliveryId);
      if (d.courierId !== courierId) {
        return {
          error: {
            code: ErrorCodes.AUTH_SCOPE_DENIED,
            message: 'Delivery not in courier scope.',
            requestId: REQUEST_ID,
          },
        };
      }
      return { data: { url: await this.deliveries.mapsNavigationUrl(deliveryId) } };
    } catch (err) {
      return this.#err(err);
    }
  }

  async #ownedAction(
    req: { authenticatedUserId?: string; courierId?: string },
    _deliveryId: string,
    fn: (courierId: string) => Promise<unknown> | unknown,
  ): Promise<unknown> {
    const courierId = await this.#resolveCourierId(req);
    if (!courierId) {
      return {
        error: {
          code: ErrorCodes.AUTH_UNAUTHENTICATED,
          message: 'Courier authentication required.',
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      return { data: await fn(courierId) };
    } catch (err) {
      return this.#err(err);
    }
  }

  #err(err: unknown): unknown {
    const code =
      err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { code?: string } }).response?.code ?? ErrorCodes.INTERNAL_ERROR)
        : ErrorCodes.INTERNAL_ERROR;
    return {
      error: {
        code,
        message: err instanceof Error ? err.message : 'Request failed.',
        requestId: REQUEST_ID,
      },
    };
  }
}
