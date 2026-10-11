import { randomUUID } from 'node:crypto';

import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { decodeBase64Image, detectImage } from '../storage/detect-image.js';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../storage/object-storage.port.js';

import {
  DEFAULT_HOME_SLIDE_SETTINGS,
  HOME_SLIDE_SETTINGS_KEY,
  parseHomeSlideSettings,
  type HomeSlideSettings,
} from './home-slider-settings.js';

/**
 * Catalog domain service — Prisma-backed at runtime; in-memory fallback
 * for isolated unit tests that construct the service without Prisma.
 */

export interface CategoryDto {
  id: string;
  parentCategoryId: string | null;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductDto {
  /**
   * Primary product image, resolved from the lowest-sorting ProductMedia row.
   * Additive and optional: callers that do not need it keep working unchanged.
   */
  imageUrl?: string;
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  basePriceMinor: bigint;
  currency: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminHomeSlideDto {
  id: string;
  categoryName: string;
  slug: string;
  name: string;
  basePriceMinor: bigint;
  currency: string;
  displayOrder: number;
  imageUrl: string | null;
  heroImageUrl: string | null;
  heroDescription: string | null;
  isFeatured: boolean;
  isActive: boolean;
  isHero: boolean;
  heroDisplayOrder: number;
}

export interface AdminHomeSlidesState {
  products: AdminHomeSlideDto[];
  settings: HomeSlideSettings;
}

/** Admin branch availability list — existing override semantics, not a new product feature. */
export interface BranchProductAvailabilityRow {
  productId: string;
  name: string;
  slug: string;
  isActive: boolean;
  isAvailable: boolean;
  reason: string | null;
}

export interface AllergenDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface AdminAllergenDto extends AllergenDto {
  products: { id: string; name: string; isActive: boolean }[];
}

export interface CreateCategoryInput {
  parentCategoryId?: string;
  slug: string;
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateProductInput {
  categoryId: string;
  slug: string;
  name: string;
  description?: string;
  basePriceMinor: bigint;
  currency?: string;
  displayOrder?: number;
}

export interface UpdateProductInput {
  categoryId?: string;
  name?: string;
  description?: string | null;
  basePriceMinor?: bigint;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ProductMediaDto {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  displayOrder: number;
}

export interface ModifierGroupDto {
  id: string;
  name: string;
  selectionMin: number;
  selectionMax: number;
  isActive: boolean;
  modifiers: ModifierOptionDto[];
  products: ModifierProductDto[];
}

export interface ModifierOptionDto {
  id: string;
  name: string;
  priceDeltaMinor: string;
  isActive: boolean;
}

export interface ModifierProductDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  displayOrder: number;
}

export interface CreateAllergenInput {
  name: string;
  description?: string;
}

export interface UpdateAllergenInput {
  name?: string;
  description?: string | null;
}

export interface CreateModifierGroupInput {
  name: string;
  selectionMin?: number;
  selectionMax?: number;
}

export interface UpdateModifierGroupInput {
  name?: string;
  selectionMin?: number;
  selectionMax?: number;
  isActive?: boolean;
}

export interface CreateModifierOptionInput {
  name: string;
  priceDeltaMinor: bigint;
}

export interface UpdateModifierOptionInput {
  name?: string;
  priceDeltaMinor?: bigint;
  isActive?: boolean;
}

export interface AddProductMediaInput {
  url: string;
  altText?: string;
  displayOrder?: number;
}

export interface UploadProductMediaInput {
  fileBase64: string;
  altText?: string;
  displayOrder?: number;
}

export interface StorefrontModifierDto {
  id: string;
  name: string;
  priceDeltaMinor: bigint;
}

export interface StorefrontModifierGroupDto {
  id: string;
  name: string;
  selectionMin: number;
  selectionMax: number;
  modifiers: StorefrontModifierDto[];
}

export interface StorefrontProductVariantDto {
  id: string;
  sku: string;
  name: string;
  priceMinor: bigint;
  displayOrder: number;
}

export interface StorefrontRemovalOptionDto {
  id: string;
  name: string;
}

export interface StorefrontAllergenRefDto {
  id: string;
  code: string;
  name: string;
}

export interface StorefrontRecommendationDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  basePriceMinor: bigint;
  currency: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface StorefrontProductDetailOptions {
  branchId?: string;
  includeRecommendations?: boolean;
}

export interface StorefrontProductDetailDto extends ProductDto {
  media: ProductMediaDto[];
  modifierGroups: StorefrontModifierGroupDto[];
  allergenIds: string[];
  allergens: StorefrontAllergenRefDto[];
  variants: StorefrontProductVariantDto[];
  removalOptions: StorefrontRemovalOptionDto[];
  categoryName: string | null;
  categorySlug: string | null;
  isAvailable: boolean;
  kcal: number | null;
  proteinGrams: number | null;
  weightGrams: number | null;
  volumeMl: number | null;
  spiceLevel: number | null;
  badge: string | null;
  eyebrow: string | null;
  averageRatingBps: number | null;
  ratingCount: number;
  recommendations: StorefrontRecommendationDto[];
}

const STOREFRONT_DEFAULT_BRANCH_ID = '01900000-0000-7000-8000-faaaaaaaaaaa';

@Injectable()
export class CatalogService {
  readonly #categories = new Map<string, CategoryDto>();
  readonly #products = new Map<string, ProductDto>();
  readonly #allergens = new Map<string, AllergenDto>();
  readonly #allergenProductLinks = new Map<string, Set<string>>();
  readonly #branchAvailability = new Map<
    string,
    { branchId: string; productId: string; isAvailable: boolean; reason: string | null }
  >();
  readonly #modifierGroups = new Map<string, ModifierGroupDto>();
  readonly #modifierOptions = new Map<string, ModifierOptionDto>();
  readonly #modifierOptionGroupIds = new Map<string, string>();
  readonly #modifierProductLinks = new Map<string, Map<string, number>>();
  readonly #productMedia = new Map<string, ProductMediaDto>();
  readonly #slugs = new Set<string>();
  readonly #builderGroups: StorefrontModifierGroupDto[] = [];
  #homeSlideSettings: HomeSlideSettings = { ...DEFAULT_HOME_SLIDE_SETTINGS };
  #mediaSeq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
    @Optional() @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort | null = null,
  ) {
    if (!this.prisma) {
      this.#seedDevData();
    }
  }

  #seedDevData(): void {
    const burgerId = '01900000-0000-7000-8000-aaaaaaaaaaaa';
    this.#categories.set(burgerId, {
      id: burgerId,
      parentCategoryId: null,
      slug: 'burgers',
      name: 'Burgers',
      description: 'Beef, chicken, and veggie burgers',
      displayOrder: 1,
      isActive: true,
    });
    this.#slugs.add('burgers');
    const sidesId = '01900000-0000-7000-8000-bbbbbbbbbbbb';
    this.#categories.set(sidesId, {
      id: sidesId,
      parentCategoryId: null,
      slug: 'sides',
      name: 'Sides',
      description: 'Fries, onion rings, salads',
      displayOrder: 2,
      isActive: true,
    });
    this.#slugs.add('sides');

    const cheeseburgerId = '01900000-0000-7000-8000-cccccccccccc';
    this.#products.set(cheeseburgerId, {
      id: cheeseburgerId,
      categoryId: burgerId,
      slug: 'classic-cheeseburger',
      name: 'Classic Cheeseburger',
      description: 'Beef patty, cheddar, lettuce, tomato, special sauce',
      basePriceMinor: 12990n,
      currency: 'TRY',
      displayOrder: 1,
      isActive: true,
    });
    this.#slugs.add('classic-cheeseburger');

    const builderId = '01900000-0000-7000-8000-c1000000000d';
    this.#products.set(builderId, {
      id: builderId,
      categoryId: burgerId,
      slug: 'ozel-burger',
      name: 'Özel Burger',
      description: 'Köfte, sos ve ekstraları sen seç. Fiyat sunucu doğrulamalıdır.',
      basePriceMinor: 14990n,
      currency: 'TRY',
      displayOrder: 99,
      isActive: true,
    });
    this.#slugs.add('ozel-burger');
    this.#builderGroups.push(
      {
        id: '01900000-0000-7000-8000-0e0100000001',
        name: 'Köfte gramajı',
        selectionMin: 1,
        selectionMax: 1,
        modifiers: [
          {
            id: '01900000-0000-7000-8000-0e0200000001',
            name: '100 g köfte (standart)',
            priceDeltaMinor: 0n,
          },
          {
            id: '01900000-0000-7000-8000-0e0200000002',
            name: '130 g köfte',
            priceDeltaMinor: 3000n,
          },
        ],
      },
      {
        id: '01900000-0000-7000-8000-0e0100000003',
        name: 'Sos seçimi',
        selectionMin: 1,
        selectionMax: 1,
        modifiers: [
          {
            id: '01900000-0000-7000-8000-0e0200000008',
            name: 'Klasik özel sos',
            priceDeltaMinor: 0n,
          },
          { id: '01900000-0000-7000-8000-0e0200000009', name: 'BBQ', priceDeltaMinor: 0n },
        ],
      },
    );

    const glutenId = '01900000-0000-7000-8000-dddddddddddd';
    this.#allergens.set(glutenId, {
      id: glutenId,
      code: 'GLUTEN',
      name: 'Gluten',
      description: null,
    });
    const dairyId = '01900000-0000-7000-8000-eeeeeeeeeeee';
    this.#allergens.set(dairyId, { id: dairyId, code: 'DAIRY', name: 'Dairy', description: null });
  }

  async listCategories(parentId?: string, includeInactive = false): Promise<CategoryDto[]> {
    if (!this.prisma) {
      return [...this.#categories.values()]
        .filter(
          (c) =>
            (includeInactive || c.isActive) &&
            (parentId === undefined || c.parentCategoryId === parentId),
        )
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }
    const rows = await this.prisma.category.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(parentId !== undefined ? { parentCategoryId: parentId } : {}),
      },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((c) => ({
      id: c.id,
      parentCategoryId: c.parentCategoryId,
      slug: c.slug,
      name: c.name,
      description: c.description,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    }));
  }

  async getCategory(id: string): Promise<CategoryDto> {
    if (!this.prisma) {
      const c = this.#categories.get(id);
      if (!c) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Category not found.',
        });
      }
      return c;
    }
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Category not found.',
      });
    }
    return {
      id: c.id,
      parentCategoryId: c.parentCategoryId,
      slug: c.slug,
      name: c.name,
      description: c.description,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    };
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryDto> {
    if (!this.prisma) {
      if (this.#slugs.has(input.slug)) {
        throw new NotFoundException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Slug already exists.',
        });
      }
      const id = `01900000-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0').slice(0, 12)}`;
      const created: CategoryDto = {
        id,
        parentCategoryId: input.parentCategoryId ?? null,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        displayOrder: input.displayOrder ?? 0,
        isActive: true,
      };
      this.#categories.set(id, created);
      this.#slugs.add(input.slug);
      return created;
    }
    const existing = await this.prisma.category.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new NotFoundException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Slug already exists.',
      });
    }
    const c = await this.prisma.category.create({
      data: {
        parentCategoryId: input.parentCategoryId ?? null,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        displayOrder: input.displayOrder ?? 0,
        isActive: true,
      },
    });
    return {
      id: c.id,
      parentCategoryId: c.parentCategoryId,
      slug: c.slug,
      name: c.name,
      description: c.description,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    };
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    if (!this.prisma) {
      const c = this.#categories.get(id);
      if (!c) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Category not found.',
        });
      }
      const updated: CategoryDto = {
        ...c,
        name: input.name ?? c.name,
        description: input.description !== undefined ? input.description : c.description,
        displayOrder: input.displayOrder ?? c.displayOrder,
        isActive: input.isActive ?? c.isActive,
      };
      this.#categories.set(id, updated);
      return updated;
    }
    try {
      const c = await this.prisma.category.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          displayOrder: input.displayOrder,
          isActive: input.isActive,
        },
      });
      return {
        id: c.id,
        parentCategoryId: c.parentCategoryId,
        slug: c.slug,
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder,
        isActive: c.isActive,
      };
    } catch {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Category not found.',
      });
    }
  }

  async listProducts(
    categoryId?: string,
    includeInactive = false,
    options?: { q?: string; branchId?: string },
  ): Promise<ProductDto[]> {
    if (!this.prisma) {
      const q = options?.q?.toLowerCase();
      return [...this.#products.values()]
        .filter(
          (p) =>
            (includeInactive || p.isActive) &&
            (categoryId === undefined || p.categoryId === categoryId) &&
            (q === undefined ||
              p.name.toLowerCase().includes(q) ||
              p.slug.toLowerCase().includes(q) ||
              (p.description ?? '').toLowerCase().includes(q)),
        )
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }
    const q = options?.q;
    const rows = await this.prisma.product.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(options?.branchId
          ? {
              NOT: {
                branchAvailability: {
                  some: { branchId: options.branchId, isAvailable: false },
                },
              },
            }
          : {}),
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        media: { orderBy: { displayOrder: 'asc' }, take: 1, select: { url: true } },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      slug: p.slug,
      name: p.name,
      description: p.description,
      basePriceMinor: p.basePriceMinor,
      currency: p.currency,
      displayOrder: p.displayOrder,
      isActive: p.isActive,
      imageUrl: p.media[0]?.url,
    }));
  }

  async getProduct(id: string): Promise<ProductDto> {
    if (!this.prisma) {
      const p = this.#products.get(id);
      if (!p) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Product not found.',
        });
      }
      return p;
    }
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Product not found.',
      });
    }
    return {
      id: p.id,
      categoryId: p.categoryId,
      slug: p.slug,
      name: p.name,
      description: p.description,
      basePriceMinor: p.basePriceMinor,
      currency: p.currency,
      displayOrder: p.displayOrder,
      isActive: p.isActive,
    };
  }

  async createProduct(input: CreateProductInput): Promise<ProductDto> {
    if (!this.prisma) {
      if (this.#slugs.has(input.slug)) {
        throw new NotFoundException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Slug already exists.',
        });
      }
      const id = `01900000-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0').slice(0, 12)}`;
      const created: ProductDto = {
        id,
        categoryId: input.categoryId,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        basePriceMinor: input.basePriceMinor,
        currency: input.currency ?? 'TRY',
        displayOrder: input.displayOrder ?? 0,
        isActive: true,
      };
      this.#products.set(id, created);
      this.#slugs.add(input.slug);
      return created;
    }
    const existing = await this.prisma.product.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new NotFoundException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Slug already exists.',
      });
    }
    const p = await this.prisma.product.create({
      data: {
        categoryId: input.categoryId,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        basePriceMinor: input.basePriceMinor,
        currency: input.currency ?? 'TRY',
        displayOrder: input.displayOrder ?? 0,
        isActive: true,
      },
    });
    return {
      id: p.id,
      categoryId: p.categoryId,
      slug: p.slug,
      name: p.name,
      description: p.description,
      basePriceMinor: p.basePriceMinor,
      currency: p.currency,
      displayOrder: p.displayOrder,
      isActive: p.isActive,
    };
  }

  async listAllergens(): Promise<AllergenDto[]> {
    if (!this.prisma) {
      return [...this.#allergens.values()];
    }
    const rows = await this.prisma.allergen.findMany({ orderBy: { code: 'asc' } });
    return rows.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
    }));
  }

  async listAdminAllergens(): Promise<AdminAllergenDto[]> {
    if (!this.prisma) {
      return [...this.#allergens.values()]
        .map((allergen) => ({
          ...allergen,
          products: [...(this.#allergenProductLinks.get(allergen.id) ?? [])]
            .map((id) => this.#products.get(id))
            .filter((product): product is ProductDto => product !== undefined)
            .map((product) => ({ id: product.id, name: product.name, isActive: product.isActive })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }
    const rows = await this.prisma.allergen.findMany({
      orderBy: { name: 'asc' },
      include: {
        products: {
          include: { product: { select: { id: true, name: true, isActive: true } } },
        },
      },
    });
    return rows.map((allergen) => ({
      id: allergen.id,
      code: allergen.code,
      name: allergen.name,
      description: allergen.description,
      products: allergen.products
        .map(({ product }) => product)
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    }));
  }

  async isProductAvailableAt(branchId: string, productId: string): Promise<boolean> {
    if (!this.prisma) {
      const override = this.#branchAvailability.get(`${branchId}:${productId}`);
      return override ? override.isAvailable : true;
    }
    const row = await this.prisma.branchProductAvailability.findUnique({
      where: { branchId_productId: { branchId, productId } },
    });
    return row ? row.isAvailable : true;
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<ProductDto> {
    if (!this.prisma) {
      const p = this.#products.get(id);
      if (!p) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Product not found.',
        });
      }
      const updated: ProductDto = {
        ...p,
        categoryId: input.categoryId ?? p.categoryId,
        name: input.name ?? p.name,
        description: input.description !== undefined ? input.description : p.description,
        basePriceMinor: input.basePriceMinor ?? p.basePriceMinor,
        displayOrder: input.displayOrder ?? p.displayOrder,
        isActive: input.isActive ?? p.isActive,
      };
      this.#products.set(id, updated);
      return updated;
    }
    try {
      const p = await this.prisma.product.update({
        where: { id },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          basePriceMinor: input.basePriceMinor,
          displayOrder: input.displayOrder,
          isActive: input.isActive,
        },
      });
      return {
        id: p.id,
        categoryId: p.categoryId,
        slug: p.slug,
        name: p.name,
        description: p.description,
        basePriceMinor: p.basePriceMinor,
        currency: p.currency,
        displayOrder: p.displayOrder,
        isActive: p.isActive,
      };
    } catch {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Product not found.',
      });
    }
  }

  async listAdminHomeSlides(): Promise<AdminHomeSlideDto[]> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Vitrin ayarları için veritabanı bağlantısı gerekli.');
    }
    const products = await this.prisma.product.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      include: {
        category: { select: { name: true } },
        media: { orderBy: { displayOrder: 'asc' }, take: 1 },
        merchandising: true,
      },
    });
    return products.map((product) => ({
      id: product.id,
      categoryName: product.category.name,
      slug: product.slug,
      name: product.name,
      basePriceMinor: product.basePriceMinor,
      currency: product.currency,
      displayOrder: product.displayOrder,
      imageUrl: product.media[0]?.url ?? null,
      heroImageUrl: product.merchandising?.heroImageUrl ?? null,
      heroDescription: product.merchandising?.heroDescription ?? null,
      isFeatured: product.merchandising?.isFeatured ?? false,
      isActive: product.isActive,
      isHero: product.merchandising?.isHero ?? false,
      heroDisplayOrder: product.merchandising?.heroDisplayOrder ?? 0,
    }));
  }

  async getAdminHomeSlideSettings(): Promise<HomeSlideSettings> {
    if (!this.prisma) return { ...this.#homeSlideSettings };
    const setting = await this.prisma.businessSetting.findUnique({
      where: { key: HOME_SLIDE_SETTINGS_KEY },
      select: { valueJson: true },
    });
    return parseHomeSlideSettings(setting?.valueJson);
  }

  async replaceAdminHomeSlides(
    productIds: string[],
    settings: HomeSlideSettings,
    updatedByUserId?: string,
  ): Promise<AdminHomeSlidesState> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Vitrin ayarları için veritabanı bağlantısı gerekli.');
    }
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Aynı ürün vitrine birden fazla eklenemez.');
    }

    const valueJson: Prisma.InputJsonValue = {
      transitionDurationSeconds: settings.transitionDurationSeconds,
      loop: settings.loop,
    };
    await this.prisma.$transaction(async (tx) => {
      const validProducts = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true },
      });
      if (validProducts.length !== productIds.length) {
        throw new BadRequestException('Yalnızca aktif ve mevcut ürünler vitrine eklenebilir.');
      }

      await tx.productMerchandising.updateMany({
        where: { isHero: true },
        data: { isHero: false, heroDisplayOrder: 0 },
      });
      for (const [heroDisplayOrder, productId] of productIds.entries()) {
        await tx.productMerchandising.upsert({
          where: { productId },
          create: { productId, isHero: true, heroDisplayOrder },
          update: { isHero: true, heroDisplayOrder },
        });
      }
      await tx.businessSetting.upsert({
        where: { key: HOME_SLIDE_SETTINGS_KEY },
        create: {
          key: HOME_SLIDE_SETTINGS_KEY,
          valueType: 'json',
          valueJson,
          category: 'storefront',
          description: 'Ana sayfa vitrin slayt geçiş süresi ve döngü ayarları.',
          mutable: true,
          updatedByUserId: updatedByUserId ?? null,
        },
        update: {
          valueJson,
          updatedByUserId: updatedByUserId ?? null,
        },
      });
    });

    return {
      products: await this.listAdminHomeSlides(),
      settings,
    };
  }

  async deleteProduct(id: string, opts: { force?: boolean } = {}): Promise<void> {
    if (!this.prisma) {
      const existing = this.#products.get(id);
      if (!existing) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Product not found.',
        });
      }
      if (!opts.force) {
        // In-memory store has no order linkage to inspect; mirror the
        // production rule and only allow force=true for full removal.
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message:
            'Ürün aktif siparişlerde kullanılıyor olabilir; force=true ile silmeyi onaylayın.',
        });
      }
      this.#products.delete(id);
      this.#slugs.delete(existing.slug);
      for (const links of this.#allergenProductLinks.values()) links.delete(id);
      return;
    }
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Product not found.',
      });
    }
    const orderRefs = await this.prisma.orderItem.count({
      where: { productId: id },
    });
    if (orderRefs > 0 && !opts.force) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Ürün ${orderRefs} sipariş satırında geçiyor. Kalıcı olarak silmek için force=true zorunlu; aksi halde arşivlemek için PATCH isActive=false kullanın.`,
      });
    }
    await this.prisma.$transaction([
      this.prisma.productMedia.deleteMany({ where: { productId: id } }),
      this.prisma.productVariant.deleteMany({ where: { productId: id } }),
      this.prisma.productModifierGroup.deleteMany({ where: { productId: id } }),
      this.prisma.productAllergen.deleteMany({ where: { productId: id } }),
      this.prisma.branchProductAvailability.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);
  }

  async createAllergen(input: CreateAllergenInput): Promise<AllergenDto> {
    const code = `ALLERGEN_${randomUUID().replaceAll('-', '').toUpperCase()}`;
    if (!this.prisma) {
      const id = uuidv7();
      const created: AllergenDto = {
        id,
        code,
        name: input.name,
        description: input.description ?? null,
      };
      this.#allergens.set(id, created);
      return created;
    }
    const a = await this.prisma.allergen.create({
      data: {
        code,
        name: input.name,
        description: input.description ?? null,
      },
    });
    return { id: a.id, code: a.code, name: a.name, description: a.description };
  }

  async updateAllergen(id: string, input: UpdateAllergenInput): Promise<AllergenDto> {
    if (!this.prisma) {
      const existing = this.#allergens.get(id);
      if (!existing) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
      }
      const updated = { ...existing, ...input };
      this.#allergens.set(id, updated);
      return updated;
    }
    const existing = await this.prisma.allergen.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
    }
    const updated = await this.prisma.allergen.update({ where: { id }, data: input });
    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
    };
  }

  async deleteAllergen(id: string): Promise<void> {
    if (!this.prisma) {
      if (!this.#allergens.has(id)) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
      }
      if (this.#allergenProductLinks.get(id)?.size) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Alerjeni silmeden önce bağlı ürünlerden kaldırın.',
        });
      }
      this.#allergens.delete(id);
      this.#allergenProductLinks.delete(id);
      return;
    }
    const deleted = await this.prisma.allergen.deleteMany({
      where: { id, products: { none: {} } },
    });
    if (deleted.count) return;
    const exists = await this.prisma.allergen.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
    }
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Alerjeni silmeden önce bağlı ürünlerden kaldırın.',
    });
  }

  async linkAllergenProduct(allergenId: string, productId: string): Promise<void> {
    await this.getProduct(productId);
    if (!this.prisma) {
      if (!this.#allergens.has(allergenId)) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
      }
      const links = this.#allergenProductLinks.get(allergenId) ?? new Set<string>();
      links.add(productId);
      this.#allergenProductLinks.set(allergenId, links);
      return;
    }
    const allergen = await this.prisma.allergen.findUnique({
      where: { id: allergenId },
      select: { id: true },
    });
    if (!allergen) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
    }
    await this.prisma.productAllergen.upsert({
      where: { productId_allergenId: { productId, allergenId } },
      create: { productId, allergenId },
      update: {},
    });
  }

  async unlinkAllergenProduct(allergenId: string, productId: string): Promise<void> {
    if (!this.prisma) {
      if (!this.#allergens.has(allergenId)) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
      }
      this.#allergenProductLinks.get(allergenId)?.delete(productId);
      return;
    }
    const allergen = await this.prisma.allergen.findUnique({
      where: { id: allergenId },
      select: { id: true },
    });
    if (!allergen) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Alerjen bulunamadı.' });
    }
    await this.prisma.productAllergen.deleteMany({ where: { productId, allergenId } });
  }

  async listModifierGroups(includeInactive = false): Promise<ModifierGroupDto[]> {
    if (!this.prisma) {
      return [...this.#modifierGroups.values()]
        .filter((g) => includeInactive || g.isActive)
        .map((group) => ({
          ...group,
          modifiers: [...this.#modifierOptions.values()].filter(
            (option) => this.#modifierOptionGroupIds.get(option.id) === group.id,
          ),
          products: [...(this.#modifierProductLinks.get(group.id)?.entries() ?? [])]
            .map(([productId, displayOrder]) => {
              const product = this.#products.get(productId);
              return product
                ? {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    isActive: product.isActive,
                    displayOrder,
                  }
                : null;
            })
            .filter((product): product is ModifierProductDto => product !== null),
        }));
    }
    const rows = await this.prisma.modifierGroup.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        modifiers: { orderBy: [{ isActive: 'desc' }, { name: 'asc' }] },
        productGroups: { include: { product: true }, orderBy: { displayOrder: 'asc' } },
      },
    });
    return rows.map((g) => ({
      id: g.id,
      name: g.name,
      selectionMin: g.selectionMin,
      selectionMax: g.selectionMax,
      isActive: g.isActive,
      modifiers: g.modifiers.map((modifier) => ({
        id: modifier.id,
        name: modifier.name,
        priceDeltaMinor: modifier.priceDeltaMinor.toString(),
        isActive: modifier.isActive,
      })),
      products: g.productGroups.map(({ product, displayOrder }) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        isActive: product.isActive,
        displayOrder,
      })),
    }));
  }

  async createModifierGroup(input: CreateModifierGroupInput): Promise<ModifierGroupDto> {
    if (!this.prisma) {
      const id = `01900000-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0').slice(0, 12)}`;
      const created: ModifierGroupDto = {
        id,
        name: input.name,
        selectionMin: input.selectionMin ?? 0,
        selectionMax: input.selectionMax ?? 1,
        isActive: true,
        modifiers: [],
        products: [],
      };
      this.#modifierGroups.set(id, created);
      return created;
    }
    const g = await this.prisma.modifierGroup.create({
      data: {
        name: input.name,
        selectionMin: input.selectionMin ?? 0,
        selectionMax: input.selectionMax ?? 1,
        isActive: true,
      },
    });
    return {
      id: g.id,
      name: g.name,
      selectionMin: g.selectionMin,
      selectionMax: g.selectionMax,
      isActive: g.isActive,
      modifiers: [],
      products: [],
    };
  }

  async updateModifierGroup(
    id: string,
    input: UpdateModifierGroupInput,
  ): Promise<ModifierGroupDto> {
    const existing = await this.getModifierGroup(id);
    const min = input.selectionMin ?? existing.selectionMin;
    const max = input.selectionMax ?? existing.selectionMax;
    if (min > max) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Minimum selection cannot exceed maximum selection.',
      });
    }
    if (!this.prisma) {
      const updated = { ...existing, ...input, selectionMin: min, selectionMax: max };
      this.#modifierGroups.set(id, updated);
      return updated;
    }
    const row = await this.prisma.modifierGroup.update({ where: { id }, data: input });
    const full = await this.getModifierGroup(id);
    return {
      ...full,
      name: row.name,
      selectionMin: row.selectionMin,
      selectionMax: row.selectionMax,
      isActive: row.isActive,
    };
  }

  async getModifierGroup(id: string): Promise<ModifierGroupDto> {
    const group = (await this.listModifierGroups(true)).find((item) => item.id === id);
    if (!group) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Modifier group not found.',
      });
    }
    return group;
  }

  async createModifierOption(
    groupId: string,
    input: CreateModifierOptionInput,
  ): Promise<ModifierOptionDto> {
    await this.getModifierGroup(groupId);
    if (!this.prisma) {
      const option = {
        id: uuidv7(),
        name: input.name,
        priceDeltaMinor: input.priceDeltaMinor.toString(),
        isActive: true,
      };
      this.#modifierOptions.set(option.id, option);
      this.#modifierOptionGroupIds.set(option.id, groupId);
      return option;
    }
    const row = await this.prisma.modifier.create({
      data: { modifierGroupId: groupId, name: input.name, priceDeltaMinor: input.priceDeltaMinor },
    });
    return {
      id: row.id,
      name: row.name,
      priceDeltaMinor: row.priceDeltaMinor.toString(),
      isActive: row.isActive,
    };
  }

  async updateModifierOption(
    groupId: string,
    optionId: string,
    input: UpdateModifierOptionInput,
  ): Promise<ModifierOptionDto> {
    const group = await this.getModifierGroup(groupId);
    if (!group.modifiers.some((item) => item.id === optionId)) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Modifier option not found.',
      });
    }
    if (!this.prisma) {
      const current = this.#modifierOptions.get(optionId);
      if (!current) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Modifier option not found.',
        });
      }
      const updated = {
        ...current,
        ...input,
        priceDeltaMinor: input.priceDeltaMinor?.toString() ?? current.priceDeltaMinor,
      };
      this.#modifierOptions.set(optionId, updated);
      return updated;
    }
    const row = await this.prisma.modifier.update({
      where: { id: optionId, modifierGroupId: groupId },
      data: input,
    });
    return {
      id: row.id,
      name: row.name,
      priceDeltaMinor: row.priceDeltaMinor.toString(),
      isActive: row.isActive,
    };
  }

  async linkModifierGroupToProduct(
    groupId: string,
    productId: string,
    displayOrder = 0,
  ): Promise<void> {
    await this.getModifierGroup(groupId);
    await this.getProduct(productId);
    if (!this.prisma) {
      const links = this.#modifierProductLinks.get(groupId) ?? new Map<string, number>();
      links.set(productId, displayOrder);
      this.#modifierProductLinks.set(groupId, links);
      return;
    }
    await this.prisma.productModifierGroup.upsert({
      where: { productId_modifierGroupId: { productId, modifierGroupId: groupId } },
      create: { productId, modifierGroupId: groupId, displayOrder },
      update: { displayOrder },
    });
  }

  async unlinkModifierGroupFromProduct(groupId: string, productId: string): Promise<void> {
    await this.getModifierGroup(groupId);
    if (!this.prisma) {
      this.#modifierProductLinks.get(groupId)?.delete(productId);
      return;
    }
    await this.prisma.productModifierGroup.deleteMany({
      where: { productId, modifierGroupId: groupId },
    });
  }

  async addProductMedia(productId: string, input: AddProductMediaInput): Promise<ProductMediaDto> {
    await this.getProduct(productId);
    if (!this.prisma) {
      this.#mediaSeq += 1;
      const id = `01900000-0000-7000-b000-${this.#mediaSeq.toString(16).padStart(12, '0').slice(0, 12)}`;
      const created: ProductMediaDto = {
        id,
        productId,
        url: input.url,
        altText: input.altText ?? null,
        displayOrder: input.displayOrder ?? 0,
      };
      this.#productMedia.set(id, created);
      return created;
    }
    const m = await this.prisma.productMedia.create({
      data: {
        productId,
        url: input.url,
        altText: input.altText ?? null,
        displayOrder: input.displayOrder ?? 0,
      },
    });
    return {
      id: m.id,
      productId: m.productId,
      url: m.url,
      altText: m.altText,
      displayOrder: m.displayOrder,
    };
  }

  async listProductMedia(productId: string): Promise<ProductMediaDto[]> {
    await this.getProduct(productId);
    if (!this.prisma) {
      return [...this.#productMedia.values()]
        .filter((row) => row.productId === productId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }
    const rows = await this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((m) => ({
      id: m.id,
      productId: m.productId,
      url: m.url,
      altText: m.altText,
      displayOrder: m.displayOrder,
    }));
  }

  async uploadProductMedia(
    productId: string,
    input: UploadProductMediaInput,
  ): Promise<ProductMediaDto> {
    await this.getProduct(productId);
    if (!this.storage) {
      throw new ServiceUnavailableException({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Object storage is not configured.',
      });
    }
    const body = decodeBase64Image(input.fileBase64);
    const detected = body ? detectImage(body) : null;
    if (!body || !detected) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Image must be JPEG, PNG, WebP, or GIF and at most 10 MB.',
      });
    }
    const key = `products/${randomUUID()}.${detected.extension}`;
    try {
      await this.storage.putObject({
        key,
        body,
        contentType: detected.contentType,
      });
    } catch {
      throw new ServiceUnavailableException({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Image storage is unavailable.',
      });
    }
    return this.addProductMedia(productId, {
      url: this.storage.publicUrl(key),
      altText: input.altText,
      displayOrder: input.displayOrder,
    });
  }

  async getBuilderProduct(
    options: StorefrontProductDetailOptions = {},
  ): Promise<StorefrontProductDetailDto> {
    if (!this.prisma) {
      const product = [...this.#products.values()].find((p) => p.slug === 'ozel-burger');
      if (!product) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Builder product not found.',
        });
      }
      const detail = await this.getStorefrontProductDetail(product.id, options);
      return { ...detail, modifierGroups: this.#builderGroups };
    }
    const merch = await this.prisma.productMerchandising.findFirst({
      where: { isBuilderBase: true, product: { isActive: true } },
      select: { productId: true },
    });
    if (!merch) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Builder product not found.',
      });
    }
    return this.getStorefrontProductDetail(merch.productId, options);
  }

  async hasBuilderProduct(): Promise<boolean> {
    if (!this.prisma) {
      return [...this.#products.values()].some((p) => p.slug === 'ozel-burger' && p.isActive);
    }
    const merch = await this.prisma.productMerchandising.findFirst({
      where: { isBuilderBase: true, product: { isActive: true } },
      select: { productId: true },
    });
    return Boolean(merch);
  }

  async getStorefrontProductDetail(
    idOrSlug: string,
    options: StorefrontProductDetailOptions = {},
  ): Promise<StorefrontProductDetailDto> {
    const product = await this.getProductByIdOrSlug(idOrSlug);
    if (!this.prisma) {
      const media = [...this.#productMedia.values()].filter((m) => m.productId === product.id);
      const category = this.#categories.get(product.categoryId);
      const allergens = [...this.#allergenProductLinks.entries()]
        .filter(([, productIds]) => productIds.has(product.id))
        .map(([allergenId]) => this.#allergens.get(allergenId))
        .filter((allergen): allergen is AllergenDto => allergen !== undefined);
      return {
        ...product,
        media,
        modifierGroups: [],
        allergenIds: allergens.map((allergen) => allergen.id),
        allergens: allergens.map((allergen) => ({
          id: allergen.id,
          code: allergen.code,
          name: allergen.name,
        })),
        variants: [],
        removalOptions: [],
        categoryName: category?.name ?? null,
        categorySlug: category?.slug ?? null,
        isAvailable:
          product.isActive &&
          (options.branchId ? await this.isProductAvailableAt(options.branchId, product.id) : true),
        kcal: null,
        proteinGrams: null,
        weightGrams: null,
        volumeMl: null,
        spiceLevel: null,
        badge: null,
        eyebrow: null,
        averageRatingBps: null,
        ratingCount: 0,
        recommendations: [],
      };
    }
    const branchId = options.branchId ?? STOREFRONT_DEFAULT_BRANCH_ID;
    const includeRecommendations = options.includeRecommendations !== false;
    const row = await this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: { select: { name: true, slug: true } },
        merchandising: true,
        media: { orderBy: { displayOrder: 'asc' } },
        modifierGroups: {
          orderBy: { displayOrder: 'asc' },
          include: {
            modifierGroup: {
              include: {
                modifiers: { where: { isActive: true }, orderBy: { name: 'asc' } },
              },
            },
          },
        },
        allergens: { include: { allergen: true } },
        variants: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
        ingredientRemovals: { where: { isActive: true }, orderBy: { name: 'asc' } },
        branchAvailability: true,
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Product not found.',
      });
    }
    const modifierGroups: StorefrontModifierGroupDto[] = row.modifierGroups
      .filter((pmg) => pmg.modifierGroup.isActive)
      .map((pmg) => ({
        id: pmg.modifierGroup.id,
        name: pmg.modifierGroup.name,
        selectionMin: pmg.modifierGroup.selectionMin,
        selectionMax: pmg.modifierGroup.selectionMax,
        modifiers: pmg.modifierGroup.modifiers.map((m) => ({
          id: m.id,
          name: m.name,
          priceDeltaMinor: m.priceDeltaMinor,
        })),
      }));
    const availability = row.branchAvailability.find((item) => item.branchId === branchId);
    const merch = row.merchandising;
    return {
      id: row.id,
      categoryId: row.categoryId,
      slug: row.slug,
      name: row.name,
      description: row.description,
      basePriceMinor: row.basePriceMinor,
      currency: row.currency,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
      media: row.media.map((m) => ({
        id: m.id,
        productId: m.productId,
        url: m.url,
        altText: m.altText,
        displayOrder: m.displayOrder,
      })),
      modifierGroups,
      allergenIds: row.allergens.map((a) => a.allergenId),
      allergens: row.allergens.map((a) => ({
        id: a.allergen.id,
        code: a.allergen.code,
        name: a.allergen.name,
      })),
      variants: row.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        priceMinor: v.priceMinor,
        displayOrder: v.displayOrder,
      })),
      removalOptions: row.ingredientRemovals.map((r) => ({
        id: r.id,
        name: r.name,
      })),
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      isAvailable: row.isActive && (availability ? availability.isAvailable : true),
      kcal: merch?.kcal ?? null,
      proteinGrams: merch?.proteinGrams ?? null,
      weightGrams: merch?.weightGrams ?? null,
      volumeMl: merch?.volumeMl ?? null,
      spiceLevel: merch?.spiceLevel ?? null,
      badge: merch?.badge ?? null,
      eyebrow: merch?.eyebrow ?? null,
      averageRatingBps: merch?.averageRatingBps ?? null,
      ratingCount: merch?.ratingCount ?? 0,
      recommendations: includeRecommendations
        ? await this.#loadRecommendations(row.id, row.categoryId)
        : [],
    };
  }

  async #loadRecommendations(
    productId: string,
    categoryId: string,
  ): Promise<StorefrontRecommendationDto[]> {
    if (!this.prisma) return [];
    const featured = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: productId },
        merchandising: { isFeatured: true },
      },
      orderBy: { displayOrder: 'asc' },
      include: { media: { orderBy: { displayOrder: 'asc' }, take: 1 } },
      take: 8,
    });
    const sameCategory = featured.filter((p) => p.categoryId === categoryId);
    const other = featured.filter((p) => p.categoryId !== categoryId);
    let picked = [...sameCategory, ...other].slice(0, 3);
    if (picked.length === 0) {
      picked = await this.prisma.product.findMany({
        where: { isActive: true, id: { not: productId }, categoryId },
        orderBy: { displayOrder: 'asc' },
        include: { media: { orderBy: { displayOrder: 'asc' }, take: 1 } },
        take: 3,
      });
    }
    return picked.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      basePriceMinor: p.basePriceMinor,
      currency: p.currency,
      imageUrl: p.media[0]?.url ?? null,
      imageAlt: p.media[0]?.altText ?? p.name,
    }));
  }

  private async getProductByIdOrSlug(idOrSlug: string): Promise<ProductDto> {
    if (!this.prisma) {
      const byId = this.#products.get(idOrSlug);
      if (byId) return byId;
      for (const p of this.#products.values()) {
        if (p.slug === idOrSlug) return p;
      }
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Product not found.',
      });
    }
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );
    const p = await this.prisma.product.findFirst({
      where: uuidLike ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
    });
    if (!p) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Product not found.',
      });
    }
    return {
      id: p.id,
      categoryId: p.categoryId,
      slug: p.slug,
      name: p.name,
      description: p.description,
      basePriceMinor: p.basePriceMinor,
      currency: p.currency,
      displayOrder: p.displayOrder,
      isActive: p.isActive,
    };
  }

  async listBranchProductAvailability(branchId: string): Promise<BranchProductAvailabilityRow[]> {
    const products = await this.listProducts(undefined, true);
    if (!this.prisma) {
      return products.map((p) => {
        const override = this.#branchAvailability.get(`${branchId}:${p.id}`);
        return {
          productId: p.id,
          name: p.name,
          slug: p.slug,
          isActive: p.isActive,
          isAvailable: override ? override.isAvailable : true,
          reason: override?.reason ?? null,
        };
      });
    }
    const overrides = await this.prisma.branchProductAvailability.findMany({ where: { branchId } });
    const byProduct = new Map(overrides.map((row) => [row.productId, row]));
    return products.map((p) => {
      const row = byProduct.get(p.id);
      return {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        isActive: p.isActive,
        isAvailable: row ? row.isAvailable : true,
        reason: row?.reason ?? null,
      };
    });
  }

  async setProductAvailability(
    branchId: string,
    productId: string,
    isAvailable: boolean,
    reason?: string,
  ): Promise<void> {
    if (!this.prisma) {
      this.#branchAvailability.set(`${branchId}:${productId}`, {
        branchId,
        productId,
        isAvailable,
        reason: reason ?? null,
      });
      return;
    }
    await this.prisma.branchProductAvailability.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, isAvailable, reason: reason ?? null },
      update: { isAvailable, reason: reason ?? null },
    });
  }
}
