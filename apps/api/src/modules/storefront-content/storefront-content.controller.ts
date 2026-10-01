import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { z } from 'zod';

import { StorefrontContentService } from './storefront-content.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const listQuerySchema = z.object({
  kind: z.enum(['STORY', 'LEGAL', 'ALLERGEN_DISCLAIMER', 'COMPANY']).optional(),
});

@Controller({ path: 'storefront/content' })
export class StorefrontContentController {
  constructor(
    @Inject(StorefrontContentService) private readonly content: StorefrontContentService,
  ) {}

  @Get()
  async list(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(listQuerySchema, query ?? {});
    const kind = parsed.ok ? parsed.data.kind : undefined;
    const data = await this.content.listPublished(kind);
    return { data, meta: { requestId: REQUEST_ID } };
  }

  @Get(':slug')
  async get(@Param('slug') slug: string): Promise<unknown> {
    try {
      const data = await this.content.getPublished(slug);
      return { data, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      if (err instanceof NotFoundException) {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Content not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }
}
