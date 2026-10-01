import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { PromotionService, type PromotionKind } from './promotion.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const createPromotionSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(128),
  kind: z.enum(['FIXED_CART_MINOR', 'PERCENT_CART', 'DELIVERY_FEE_WAIVER']),
  discountMinor: z.string().regex(/^\d+$/).optional(),
  discountPercentBps: z.number().int().min(0).max(10000).optional(),
  minMerchandiseMinor: z.string().regex(/^\d+$/).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  branchIds: z.array(z.string().uuid()).optional(),
  usageLimitTotal: z.number().int().min(1).optional(),
  usageLimitPerCustomer: z.number().int().min(1).optional(),
  combinable: z.boolean().optional(),
  firstOrderOnly: z.boolean().optional(),
});

@Controller({ path: 'admin' })
export class AdminPromotionController {
  constructor(@Inject(PromotionService) private readonly promotions: PromotionService) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('promotions.read')
  @Get('promotions')
  async list(): Promise<unknown> {
    const rows = await this.promotions.list(true);
    return {
      data: rows.map((p) => ({
        ...p,
        discountMinor: p.discountMinor?.toString() ?? null,
        minMerchandiseMinor: p.minMerchandiseMinor.toString(),
      })),
      meta: { requestId: REQUEST_ID },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('promotions.read')
  @Get('promotions/:promotionId')
  async get(@Param('promotionId') promotionId: string): Promise<unknown> {
    try {
      const p = await this.promotions.get(promotionId);
      return {
        data: {
          ...p,
          discountMinor: p.discountMinor?.toString() ?? null,
          minMerchandiseMinor: p.minMerchandiseMinor.toString(),
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Promotion not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('promotions.write')
  @Post('promotions')
  @HttpCode(201)
  async create(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(createPromotionSchema, body);
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
    const p = await this.promotions.create({
      code: parsed.data.code,
      name: parsed.data.name,
      kind: parsed.data.kind as PromotionKind,
      discountMinor: parsed.data.discountMinor ? BigInt(parsed.data.discountMinor) : undefined,
      discountPercentBps: parsed.data.discountPercentBps,
      minMerchandiseMinor: parsed.data.minMerchandiseMinor
        ? BigInt(parsed.data.minMerchandiseMinor)
        : undefined,
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : undefined,
      validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : undefined,
      branchIds: parsed.data.branchIds,
      usageLimitTotal: parsed.data.usageLimitTotal,
      usageLimitPerCustomer: parsed.data.usageLimitPerCustomer,
      combinable: parsed.data.combinable,
      firstOrderOnly: parsed.data.firstOrderOnly,
    });
    return {
      data: {
        ...p,
        discountMinor: p.discountMinor?.toString() ?? null,
        minMerchandiseMinor: p.minMerchandiseMinor.toString(),
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('promotions.write')
  @Patch('promotions/:promotionId')
  async patch(@Param('promotionId') promotionId: string, @Body() body: unknown): Promise<unknown> {
    const schema = z.object({ isActive: z.boolean() });
    const parsed = safeValidate(schema, body);
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
      const p = await this.promotions.setActive(promotionId, parsed.data.isActive);
      return {
        data: {
          ...p,
          discountMinor: p.discountMinor?.toString() ?? null,
          minMerchandiseMinor: p.minMerchandiseMinor.toString(),
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Promotion not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }
}
