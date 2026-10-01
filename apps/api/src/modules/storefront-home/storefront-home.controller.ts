import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import { Body, Controller, Get, HttpCode, Inject, Post, Query } from '@nestjs/common';
import { z } from 'zod';

import {
  StorefrontHomeService,
  type HomeComboDto,
  type HomePayloadDto,
  type HomeReviewDto,
  type VitrineProductDto,
} from './storefront-home.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const homeQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(80).optional(),
});

const newsletterSchema = z.object({
  email: z.string().trim().email().max(255),
  source: z.string().trim().min(1).max(64).optional(),
});

function serializeProduct(p: VitrineProductDto) {
  return {
    ...p,
    basePriceMinor: p.basePriceMinor.toString(),
  };
}

function serializeCombo(combo: HomeComboDto | null) {
  if (!combo) return null;
  return {
    ...combo,
    bundlePriceMinor: combo.bundlePriceMinor.toString(),
    compareAtMinor: combo.compareAtMinor?.toString() ?? null,
  };
}

function serializeHome(payload: HomePayloadDto) {
  return {
    ...payload,
    hero: payload.hero ? serializeProduct(payload.hero) : null,
    heroSlides: payload.heroSlides.map(serializeProduct),
    products: payload.products.map(serializeProduct),
    combo: serializeCombo(payload.combo),
    reviews: payload.reviews satisfies HomeReviewDto[],
  };
}

@Controller({ path: 'storefront' })
export class StorefrontHomeController {
  constructor(@Inject(StorefrontHomeService) private readonly home: StorefrontHomeService) {}

  @Get('home')
  async getHome(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(homeQuerySchema, query ?? {});
    const filter = parsed.ok ? parsed.data : {};
    const payload = await this.home.getHome(filter);
    return {
      data: serializeHome(payload),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('newsletter')
  @HttpCode(200)
  async subscribe(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(newsletterSchema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Valid email is required.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const result = await this.home.subscribeNewsletter(parsed.data.email, parsed.data.source);
    return {
      data: result,
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('newsletter/unsubscribe')
  @HttpCode(200)
  async unsubscribe(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(newsletterSchema.pick({ email: true }), body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Valid email is required.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const result = await this.home.unsubscribeNewsletter(parsed.data.email);
    return {
      data: result,
      meta: { requestId: REQUEST_ID },
    };
  }
}
