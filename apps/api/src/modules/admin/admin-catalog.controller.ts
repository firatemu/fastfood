import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';
import {
  CatalogService,
  type CreateCategoryInput,
  type CreateProductInput,
  type UploadProductMediaInput,
} from '../catalog/catalog.service.js';
import {
  MAX_HOME_SLIDE_DURATION_SECONDS,
  MIN_HOME_SLIDE_DURATION_SECONDS,
} from '../catalog/home-slider-settings.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const createCategorySchema = z.object({
  parentCategoryId: z.string().uuid().optional(),
  slug: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  basePriceMinor: z.string().regex(/^-?\d+$/),
  currency: z.string().length(3).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const updateProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(2048).optional().nullable(),
  basePriceMinor: z
    .string()
    .regex(/^-?\d+$/)
    .optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const createAllergenSchema = z.object({
  name: z.string().trim().min(1).max(128),
  description: z.string().trim().max(512).optional(),
});

const updateAllergenSchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    description: z.string().trim().max(512).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'En az bir alan gerekli.');

const createModifierGroupSchema = z.object({
  name: z.string().min(1).max(128),
  selectionMin: z.number().int().min(0).optional(),
  selectionMax: z.number().int().min(0).optional(),
});

const updateModifierGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    selectionMin: z.number().int().min(0).optional(),
    selectionMax: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const createModifierOptionSchema = z.object({
  name: z.string().trim().min(1).max(128),
  priceDeltaMinor: z.string().regex(/^\d+$/),
});

const updateModifierOptionSchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    priceDeltaMinor: z.string().regex(/^\d+$/).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const modifierGroupListQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional(),
});
const linkModifierProductSchema = z.object({ displayOrder: z.number().int().min(0).optional() });

const addMediaSchema = z.object({
  url: z.string().url().max(2048),
  altText: z.string().max(255).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const uploadMediaSchema = z.object({
  fileBase64: z.string().min(1),
  altText: z.string().max(255).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const categoryListQuerySchema = z.object({
  parentId: z.string().uuid().optional(),
});

const productListQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
});

const replaceHomeSlidesSchema = z.object({
  productIds: z.array(z.string().uuid()).superRefine((productIds, context) => {
    if (new Set(productIds).size !== productIds.length) {
      context.addIssue({ code: 'custom', message: 'Aynı ürün birden fazla seçilemez.' });
    }
  }),
  settings: z.object({
    transitionDurationSeconds: z
      .number()
      .int()
      .min(MIN_HOME_SLIDE_DURATION_SECONDS)
      .max(MAX_HOME_SLIDE_DURATION_SECONDS),
    loop: z.boolean(),
  }),
});

@Injectable()
@Controller({ path: 'admin' })
export class AdminCatalogController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.read')
  @Get('categories')
  async listCategories(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(categoryListQuerySchema, query ?? {});
    const filter = parsed.ok ? parsed.data : {};
    const categories = await this.catalogService.listCategories(filter.parentId, true);
    return { data: categories, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @Post('categories')
  @HttpCode(201)
  async createCategory(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(createCategorySchema, body);
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
      const category = await this.catalogService.createCategory(parsed.data as CreateCategoryInput);
      return { data: category, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string; getResponse?: () => unknown };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Slug already exists.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @Patch('categories/:categoryId')
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const schema = z.object({
      name: z.string().min(1).max(128).optional(),
      description: z.string().max(1024).optional().nullable(),
      displayOrder: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    });
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
      const category = await this.catalogService.updateCategory(categoryId, parsed.data);
      return { data: category, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Category not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.read')
  @Get('products')
  async listProducts(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(productListQuerySchema, query ?? {});
    const filter = parsed.ok ? parsed.data : {};
    const products = await this.catalogService.listProducts(filter.categoryId, true);
    return {
      data: products.map((p) => ({ ...p, basePriceMinor: p.basePriceMinor.toString() })),
      meta: { requestId: REQUEST_ID },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.read')
  @Get('home-slides')
  async listHomeSlides(): Promise<unknown> {
    const [products, settings] = await Promise.all([
      this.catalogService.listAdminHomeSlides(),
      this.catalogService.getAdminHomeSlideSettings(),
    ]);
    return {
      data: {
        products: products.map((slide) => ({
          ...slide,
          basePriceMinor: slide.basePriceMinor.toString(),
        })),
        settings,
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @Put('home-slides')
  @HttpCode(200)
  async replaceHomeSlides(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const parsed = safeValidate(replaceHomeSlidesSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Vitrin slayt sıralaması geçersiz.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const state = await this.catalogService.replaceAdminHomeSlides(
      parsed.data.productIds,
      parsed.data.settings,
      req.principal?.id,
    );
    return {
      data: {
        products: state.products.map((slide) => ({
          ...slide,
          basePriceMinor: slide.basePriceMinor.toString(),
        })),
        settings: state.settings,
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.read')
  @Get('products/:productId')
  async getProduct(@Param('productId') productId: string): Promise<unknown> {
    try {
      const product = await this.catalogService.getProduct(productId);
      return {
        data: { ...product, basePriceMinor: product.basePriceMinor.toString() },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @Patch('products/:productId')
  @HttpCode(200)
  async patchProduct(
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(updateProductSchema, body);
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
      const product = await this.catalogService.updateProduct(productId, {
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description,
        basePriceMinor: parsed.data.basePriceMinor ? BigInt(parsed.data.basePriceMinor) : undefined,
        displayOrder: parsed.data.displayOrder,
        isActive: parsed.data.isActive,
      });
      return {
        data: { ...product, basePriceMinor: product.basePriceMinor.toString() },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @Delete('products/:productId')
  @HttpCode(200)
  async deleteProduct(
    @Param('productId') productId: string,
    @Query() query: Record<string, string | undefined>,
  ): Promise<unknown> {
    const parsed = safeValidate(z.object({ force: z.string().optional() }), query ?? {});
    if (!parsed.ok) {
      throw new BadRequestException('Invalid delete query.');
    }
    try {
      await this.catalogService.deleteProduct(productId, {
        force: parsed.data.force === 'true',
      });
      return { data: { id: productId, deleted: true }, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as {
        name?: string;
        getResponse?: () => { code?: string; message?: string } | unknown;
      };
      if (e.name === 'NotFoundException') {
        const response = e.getResponse?.() as { code?: string; message?: string } | undefined;
        return {
          error: {
            code: response?.code ?? ErrorCodes.NOT_FOUND,
            message: response?.message ?? 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      if (e.name === 'BadRequestException') {
        const response = e.getResponse?.() as { code?: string; message?: string } | undefined;
        return {
          error: {
            code: response?.code ?? ErrorCodes.VALIDATION_ERROR,
            message: response?.message ?? 'Ürün silinemedi.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.read')
  @Get('products/:productId/media')
  async listMedia(@Param('productId') productId: string): Promise<unknown> {
    try {
      const media = await this.catalogService.listProductMedia(productId);
      return { data: media, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.media.write')
  @Post('products/:productId/media/upload')
  @HttpCode(201)
  async uploadMedia(
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(uploadMediaSchema, body);
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
      const media = await this.catalogService.uploadProductMedia(
        productId,
        parsed.data as UploadProductMediaInput,
      );
      return { data: media, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      if (e.name === 'BadRequestException') {
        return {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Image must be JPEG, PNG, WebP, or GIF and at most 10 MB.',
            requestId: REQUEST_ID,
          },
        };
      }
      if (e.name === 'ServiceUnavailableException') {
        return {
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: e.message || 'Image storage is unavailable.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.media.write')
  @Post('products/:productId/media')
  @HttpCode(201)
  async addMedia(@Param('productId') productId: string, @Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(addMediaSchema, body);
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
      const media = await this.catalogService.addProductMedia(productId, parsed.data);
      return { data: media, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.read')
  @Get('allergens')
  async listAllergens(): Promise<unknown> {
    const allergens = await this.catalogService.listAdminAllergens();
    return { data: allergens, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiOperation({ summary: 'Create an allergen with a generated internal code' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, description: { type: 'string' } },
    },
  })
  @Post('allergens')
  @HttpCode(201)
  async createAllergen(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(createAllergenSchema, body);
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
    const allergen = await this.catalogService.createAllergen(parsed.data);
    return { data: allergen, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiOperation({ summary: 'Update allergen name or description' })
  @ApiParam({ name: 'allergenId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { name: { type: 'string' }, description: { type: 'string', nullable: true } },
    },
  })
  @Patch('allergens/:allergenId')
  async updateAllergen(
    @Param('allergenId') allergenId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(updateAllergenSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Alerjen bilgileri geçersiz.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const allergen = await this.catalogService.updateAllergen(allergenId, parsed.data);
    return { data: allergen, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiOperation({ summary: 'Delete an allergen that is not linked to products' })
  @ApiParam({ name: 'allergenId', type: 'string' })
  @Delete('allergens/:allergenId')
  @HttpCode(200)
  async deleteAllergen(@Param('allergenId') allergenId: string): Promise<unknown> {
    await this.catalogService.deleteAllergen(allergenId);
    return { data: { id: allergenId, deleted: true }, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiOperation({ summary: 'Link an allergen to a product' })
  @ApiParam({ name: 'allergenId', type: 'string' })
  @ApiParam({ name: 'productId', type: 'string' })
  @Post('allergens/:allergenId/products/:productId')
  @HttpCode(200)
  async linkAllergenProduct(
    @Param('allergenId') allergenId: string,
    @Param('productId') productId: string,
  ): Promise<unknown> {
    await this.catalogService.linkAllergenProduct(allergenId, productId);
    return { data: { allergenId, productId, linked: true }, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiOperation({ summary: 'Unlink an allergen from a product' })
  @ApiParam({ name: 'allergenId', type: 'string' })
  @ApiParam({ name: 'productId', type: 'string' })
  @Delete('allergens/:allergenId/products/:productId')
  @HttpCode(200)
  async unlinkAllergenProduct(
    @Param('allergenId') allergenId: string,
    @Param('productId') productId: string,
  ): Promise<unknown> {
    await this.catalogService.unlinkAllergenProduct(allergenId, productId);
    return { data: { allergenId, productId, linked: false }, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.read')
  @ApiTags('AdminCatalog')
  @ApiOperation({ summary: 'List modifier groups with options and product links' })
  @ApiQuery({ name: 'includeInactive', required: false, schema: { type: 'boolean' } })
  @Get('modifier-groups')
  async listModifierGroups(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(modifierGroupListQuerySchema, query ?? {});
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
    const groups = await this.catalogService.listModifierGroups(
      parsed.data.includeInactive === 'true',
    );
    return { data: groups, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiTags('AdminCatalog')
  @ApiOperation({ summary: 'Create a modifier group' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        selectionMin: { type: 'integer' },
        selectionMax: { type: 'integer' },
      },
    },
  })
  @Post('modifier-groups')
  @HttpCode(201)
  async createModifierGroup(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(createModifierGroupSchema, body);
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
    const group = await this.catalogService.createModifierGroup(parsed.data);
    return { data: group, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiTags('AdminCatalog')
  @ApiOperation({ summary: 'Update modifier group rules or active state' })
  @ApiParam({ name: 'groupId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        selectionMin: { type: 'integer' },
        selectionMax: { type: 'integer' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @Patch('modifier-groups/:groupId')
  async updateModifierGroup(
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(updateModifierGroupSchema, body);
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
    const group = await this.catalogService.updateModifierGroup(groupId, parsed.data);
    return { data: group, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiTags('AdminCatalog')
  @ApiOperation({ summary: 'Add a modifier option to a group' })
  @ApiParam({ name: 'groupId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'priceDeltaMinor'],
      properties: {
        name: { type: 'string' },
        priceDeltaMinor: {
          type: 'string',
          pattern: '^\\d+$',
          description: 'Integer minor-unit amount',
        },
      },
    },
  })
  @Post('modifier-groups/:groupId/modifiers')
  @HttpCode(201)
  async createModifierOption(
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(createModifierOptionSchema, body);
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
    const modifier = await this.catalogService.createModifierOption(groupId, {
      name: parsed.data.name,
      priceDeltaMinor: BigInt(parsed.data.priceDeltaMinor),
    });
    return { data: modifier, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiTags('AdminCatalog')
  @ApiOperation({ summary: 'Update a modifier option or active state' })
  @ApiParam({ name: 'groupId', type: 'string' })
  @ApiParam({ name: 'modifierId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        priceDeltaMinor: { type: 'string', pattern: '^\\d+$' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @Patch('modifier-groups/:groupId/modifiers/:modifierId')
  async updateModifierOption(
    @Param('groupId') groupId: string,
    @Param('modifierId') modifierId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(updateModifierOptionSchema, body);
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
    const modifier = await this.catalogService.updateModifierOption(groupId, modifierId, {
      name: parsed.data.name,
      priceDeltaMinor:
        parsed.data.priceDeltaMinor === undefined ? undefined : BigInt(parsed.data.priceDeltaMinor),
      isActive: parsed.data.isActive,
    });
    return { data: modifier, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiTags('AdminCatalog')
  @ApiOperation({ summary: 'Attach a modifier group to a product' })
  @ApiParam({ name: 'groupId', type: 'string' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiBody({
    schema: { type: 'object', properties: { displayOrder: { type: 'integer', minimum: 0 } } },
  })
  @Post('modifier-groups/:groupId/products/:productId')
  @HttpCode(200)
  async linkModifierProduct(
    @Param('groupId') groupId: string,
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(linkModifierProductSchema, body ?? {});
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
    await this.catalogService.linkModifierGroupToProduct(
      groupId,
      productId,
      parsed.data.displayOrder ?? 0,
    );
    return { data: { groupId, productId, linked: true }, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @ApiTags('AdminCatalog')
  @ApiOperation({ summary: 'Detach a modifier group from a product' })
  @ApiParam({ name: 'groupId', type: 'string' })
  @ApiParam({ name: 'productId', type: 'string' })
  @Delete('modifier-groups/:groupId/products/:productId')
  @HttpCode(200)
  async unlinkModifierProduct(
    @Param('groupId') groupId: string,
    @Param('productId') productId: string,
  ): Promise<unknown> {
    await this.catalogService.unlinkModifierGroupFromProduct(groupId, productId);
    return { data: { groupId, productId, linked: false }, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('catalog.products.write')
  @Post('products')
  @HttpCode(201)
  async createProduct(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(createProductSchema, body);
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
    const basePriceMinor = BigInt(parsed.data.basePriceMinor);
    try {
      const product = await this.catalogService.createProduct({
        categoryId: parsed.data.categoryId,
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
        basePriceMinor,
        currency: parsed.data.currency,
        displayOrder: parsed.data.displayOrder,
      } as CreateProductInput);
      return {
        data: { ...product, basePriceMinor: product.basePriceMinor.toString() },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Slug already exists.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }
}
