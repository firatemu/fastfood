import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import { Controller, Get, HttpCode, Inject, Query } from '@nestjs/common';
import { z } from 'zod';

import { PromotionService } from './promotion.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const validateQuerySchema = z.object({
  code: z.string().min(1).max(64),
});

@Controller({ path: 'storefront/promotions' })
export class StorefrontPromotionController {
  constructor(@Inject(PromotionService) private readonly promotions: PromotionService) {}

  @Get()
  async listPublic(): Promise<unknown> {
    const deals = await this.promotions.listPublicDeals();
    return {
      data: deals,
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('validate')
  @HttpCode(200)
  async validate(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(validateQuerySchema, query ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Coupon code is required.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const promotion = await this.promotions.validateCode(parsed.data.code);
    if (!promotion) {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Promotion not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    return {
      data: {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        kind: promotion.kind,
        discountMinor: promotion.discountMinor?.toString() ?? null,
        discountPercentBps: promotion.discountPercentBps,
        minMerchandiseMinor: promotion.minMerchandiseMinor.toString(),
        combinable: promotion.combinable,
      },
      meta: { requestId: REQUEST_ID },
    };
  }
}
