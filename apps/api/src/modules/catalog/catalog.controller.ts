import { safeValidate } from '@fastfood/validation';
import { Controller, Get, Inject, Injectable, Param, Query } from '@nestjs/common';
import { z } from 'zod';

import { CatalogService, type ProductDto, type StorefrontProductDetailDto } from './catalog.service.js';

/**
 * Public storefront catalog endpoints (document 06 + 29).
 *
 * Phase 4 ships the catalog read surface. The admin write surface
 * (POST /admin/products) lands under P4-006.
 */

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const categoryFilterSchema = z.object({
  parentId: z.string().uuid().optional(),
});

const productFilterSchema = z.object({
  categoryId: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(80).optional(),
  branchId: z.string().uuid().optional(),
});

const productDetailQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

function serializeStorefrontProduct(detail: StorefrontProductDetailDto) {
  return {
    id: detail.id,
    categoryId: detail.categoryId,
    slug: detail.slug,
    name: detail.name,
    description: detail.description,
    basePriceMinor: detail.basePriceMinor.toString(),
    currency: detail.currency,
    displayOrder: detail.displayOrder,
    isActive: detail.isActive,
    media: detail.media,
    modifierGroups: detail.modifierGroups.map((g) => ({
      id: g.id,
      name: g.name,
      selectionMin: g.selectionMin,
      selectionMax: g.selectionMax,
      modifiers: g.modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        priceDeltaMinor: m.priceDeltaMinor.toString(),
      })),
    })),
    allergenIds: detail.allergenIds,
    allergens: detail.allergens,
    variants: detail.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      priceMinor: v.priceMinor.toString(),
      displayOrder: v.displayOrder,
    })),
    removalOptions: detail.removalOptions,
    categoryName: detail.categoryName,
    categorySlug: detail.categorySlug,
    isAvailable: detail.isAvailable,
    kcal: detail.kcal,
    proteinGrams: detail.proteinGrams,
    weightGrams: detail.weightGrams,
    volumeMl: detail.volumeMl,
    spiceLevel: detail.spiceLevel,
    badge: detail.badge,
    eyebrow: detail.eyebrow,
    averageRatingBps: detail.averageRatingBps,
    ratingCount: detail.ratingCount,
    recommendations: detail.recommendations.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      basePriceMinor: item.basePriceMinor.toString(),
      currency: item.currency,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
    })),
  };
}

@Injectable()
@Controller({ path: 'storefront/catalog' })
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly service: CatalogService) {}

  @Get('builder')
  async getBuilder(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(productDetailQuerySchema, query ?? {});
    const branchId = parsed.ok ? parsed.data.branchId : undefined;
    const detail = await this.service.getBuilderProduct({ branchId });
    return {
      data: serializeStorefrontProduct(detail),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('categories')
  async listCategories(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(categoryFilterSchema, query ?? {});
    const filter = parsed.ok ? parsed.data : {};
    const categories = await this.service.listCategories(filter.parentId);
    return {
      data: categories,
      meta: {
        requestId: REQUEST_ID,
        pagination: {
          page: 1,
          pageSize: categories.length,
          totalItems: categories.length,
          totalPages: 1,
        },
      },
    };
  }

  @Get('products/:productIdOrSlug')
  async getProduct(
    @Param('productIdOrSlug') productIdOrSlug: string,
    @Query() query: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(productDetailQuerySchema, query ?? {});
    const branchId = parsed.ok ? parsed.data.branchId : undefined;
    const detail = await this.service.getStorefrontProductDetail(productIdOrSlug, { branchId });
    return {
      data: serializeStorefrontProduct(detail),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('products')
  async listProducts(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(productFilterSchema, query ?? {});
    const filter = parsed.ok ? parsed.data : {};
    const products = await this.service.listProducts(filter.categoryId, false, {
      q: filter.q,
      branchId: filter.branchId,
    });
    return {
      data: products.map((p: ProductDto) => ({
        ...p,
        basePriceMinor: p.basePriceMinor.toString(),
      })),
      meta: {
        requestId: REQUEST_ID,
        pagination: {
          page: 1,
          pageSize: products.length,
          totalItems: products.length,
          totalPages: 1,
        },
      },
    };
  }

  @Get('allergens')
  async listAllergens(): Promise<unknown> {
    const allergens = await this.service.listAllergens();
    return {
      data: allergens,
      meta: { requestId: REQUEST_ID },
    };
  }
}

// Reference the error code group so the import is not flagged as
// unused by linters; the production controller delegates errors via
// the canonical envelope using these codes.
