import { Inject, Injectable, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { BranchService, type BranchDto, type BranchOperatingHoursDto } from '../branch/branch.service.js';
import { CatalogService, type ProductDto } from '../catalog/catalog.service.js';
import {
  DEFAULT_HOME_SLIDE_SETTINGS,
  HOME_SLIDE_SETTINGS_KEY,
  parseHomeSlideSettings,
  type HomeSlideSettings,
} from '../catalog/home-slider-settings.js';
import { KITCHEN_BOARD_STATUSES } from '../order/order-state-machine.js';

export interface HeroSpecDto {
  key: string;
  label: string;
  value: string;
  hint: string | null;
}

export interface VitrineProductDto {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  basePriceMinor: bigint;
  currency: string;
  displayOrder: number;
  imageUrl: string | null;
  imageAlt: string | null;
  isFeatured: boolean;
  isHero: boolean;
  heroDisplayOrder: number;
  isAvailable: boolean;
  kcal: number | null;
  proteinGrams: number | null;
  weightGrams: number | null;
  volumeMl: number | null;
  spiceLevel: number | null;
  badge: string | null;
  accentLabel: string | null;
  eyebrow: string | null;
  heroDescription: string | null;
  heroImageUrl: string | null;
  soldCount: number;
  averageRatingBps: number | null;
  ratingCount: number;
  heroSpecs: HeroSpecDto[];
}

export interface HomeCategoryDto {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

export interface HomeComboItemDto {
  productId: string;
  quantity: number;
  name: string;
}

export interface HomeComboDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  bundlePriceMinor: bigint;
  compareAtMinor: bigint | null;
  currency: string;
  endsAt: string | null;
  savingsPercent: number | null;
  expired: boolean;
  items: HomeComboItemDto[];
}

export interface HomeReviewDto {
  id: string;
  authorDisplayName: string;
  authorInitials: string;
  body: string;
  rating: number;
  branchLabel: string | null;
  publishedAt: string;
}

export interface HomeSocialProofDto {
  averageRatingBps: number | null;
  reviewCount: number;
  happyCustomerCount: number;
}

export interface HomeBranchDto {
  id: string;
  name: string;
  addressLine: string;
  phone: string | null;
  isAcceptingOrders: boolean;
  estimatedDeliveryMinutesMin: number;
  estimatedDeliveryMinutesMax: number;
  hours: BranchOperatingHoursDto[];
}

export interface HomePayloadDto {
  branch: HomeBranchDto | null;
  kitchenLiveCount: number;
  hero: VitrineProductDto | null;
  heroSlides: VitrineProductDto[];
  heroSliderSettings: HomeSlideSettings;
  categories: HomeCategoryDto[];
  products: VitrineProductDto[];
  combo: HomeComboDto | null;
  reviews: HomeReviewDto[];
  socialProof: HomeSocialProofDto;
  builderAvailable: boolean;
}

export interface NewsletterResultDto {
  email: string;
  alreadySubscribed: boolean;
}

const DEFAULT_BRANCH_ID = '01900000-0000-7000-8000-faaaaaaaaaaa';

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const first = parts[0];
  if (!first) return '?';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? '';
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
}

function parseHeroSpecs(value: unknown): HeroSpecDto[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as { items?: unknown };
  if (!Array.isArray(record.items)) return [];
  const out: HeroSpecDto[] = [];
  for (const item of record.items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.key !== 'string' || typeof row.label !== 'string' || typeof row.value !== 'string') {
      continue;
    }
    out.push({
      key: row.key,
      label: row.label,
      value: row.value,
      hint: typeof row.hint === 'string' ? row.hint : null,
    });
  }
  return out;
}

function savingsPercent(bundle: bigint, compareAt: bigint | null): number | null {
  if (compareAt === null || compareAt <= 0n || bundle >= compareAt) return null;
  return Number((100n * (compareAt - bundle) + compareAt / 2n) / compareAt);
}

function emptyMerchandising(product: ProductDto, imageUrl: string | null): VitrineProductDto {
  return {
    id: product.id,
    categoryId: product.categoryId,
    slug: product.slug,
    name: product.name,
    description: product.description,
    basePriceMinor: product.basePriceMinor,
    currency: product.currency,
    displayOrder: product.displayOrder,
    imageUrl,
    imageAlt: product.name,
    isFeatured: false,
    isHero: false,
    heroDisplayOrder: 0,
    isAvailable: true,
    kcal: null,
    proteinGrams: null,
    weightGrams: null,
    volumeMl: null,
    spiceLevel: null,
    badge: null,
    accentLabel: null,
    eyebrow: null,
    heroDescription: null,
    heroImageUrl: null,
    soldCount: 0,
    averageRatingBps: null,
    ratingCount: 0,
    heroSpecs: [],
  };
}

@Injectable()
export class StorefrontHomeService {
  readonly #reviews = new Map<string, HomeReviewDto>();
  readonly #combos: HomeComboDto[] = [];
  readonly #newsletter = new Set<string>();
  readonly #merch = new Map<string, Partial<VitrineProductDto>>();

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
    @Optional() @Inject(CatalogService) private readonly catalog: CatalogService | null = null,
    @Optional() @Inject(BranchService) private readonly branches: BranchService | null = null,
  ) {
    if (!this.prisma) {
      this.#seedMemory();
    }
  }

  #seedMemory(): void {
    this.#reviews.set('rev-1', {
      id: '01900000-0000-7000-8000-rev000000001',
      authorDisplayName: 'Emre K.',
      authorInitials: 'EK',
      body: "Kadıköy'deki en iyi smash burger! Köftenin kenarlarındaki o çıtırlık Maillard reaksiyonunun zirvesi.",
      rating: 5,
      branchLabel: 'Moda Şubesi Siparişi',
      publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    });
  }

  async getHome(input: { branchId?: string; categoryId?: string; q?: string }): Promise<HomePayloadDto> {
    if (!this.prisma) {
      return this.#memoryHome(input);
    }
    return this.#prismaHome(input);
  }

  async subscribeNewsletter(emailRaw: string, source = 'ember_club', userId?: string): Promise<NewsletterResultDto> {
    const email = emailRaw.trim().toLowerCase();
    if (!this.prisma) {
      const already = this.#newsletter.has(email);
      this.#newsletter.add(email);
      return { email, alreadySubscribed: already };
    }
    const existing = await this.prisma.newsletterSubscription.findUnique({ where: { email } });
    if (existing && !existing.unsubscribedAt) {
      return { email, alreadySubscribed: true };
    }
    await this.prisma.newsletterSubscription.upsert({
      where: { email },
      create: { email, source, userId: userId ?? null },
      update: { unsubscribedAt: null, source, userId: userId ?? existing?.userId ?? null },
    });
    return { email, alreadySubscribed: false };
  }

  async unsubscribeNewsletter(emailRaw: string): Promise<{ email: string; unsubscribed: boolean }> {
    const email = emailRaw.trim().toLowerCase();
    if (!this.prisma) {
      const had = this.#newsletter.delete(email);
      return { email, unsubscribed: had };
    }
    const existing = await this.prisma.newsletterSubscription.findUnique({ where: { email } });
    if (!existing) {
      return { email, unsubscribed: false };
    }
    if (!existing.unsubscribedAt) {
      await this.prisma.newsletterSubscription.update({
        where: { email },
        data: { unsubscribedAt: new Date() },
      });
    }
    return { email, unsubscribed: true };
  }

  async #prismaHome(input: { branchId?: string; categoryId?: string; q?: string }): Promise<HomePayloadDto> {
    const db = this.prisma;
    if (!db) return this.#memoryHome(input);
    const branch = await this.#resolveBranch(input.branchId);
    const branchId = branch?.id;

    const [
      categories,
      products,
      comboRow,
      reviews,
      kitchenLiveCount,
      happyCustomerCount,
      socialRow,
      heroSliderSettingsRow,
    ] = await Promise.all([
        db.category.findMany({
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: { _count: { select: { products: { where: { isActive: true } } } } },
        }),
        db.product.findMany({
          where: {
            isActive: true,
            ...(input.q
              ? {
                  OR: [
                    { name: { contains: input.q, mode: 'insensitive' } },
                    { slug: { contains: input.q, mode: 'insensitive' } },
                    { description: { contains: input.q, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          orderBy: { displayOrder: 'asc' },
          include: {
            media: { orderBy: { displayOrder: 'asc' }, take: 1 },
            merchandising: true,
            branchAvailability: true,
          },
        }),
        db.storefrontComboOffer.findFirst({
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
              include: { product: { select: { id: true, name: true } } },
            },
          },
        }),
        db.storefrontPublishedReview.findMany({
          where: { isPublished: true },
          orderBy: { displayOrder: 'asc' },
        }),
        branchId
          ? db.order.count({
              where: { branchId, status: { in: [...KITCHEN_BOARD_STATUSES] } },
            })
          : Promise.resolve(0),
        db.order.findMany({
          where: { status: 'DELIVERED', userId: { not: null } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        db.storefrontSocialProof.findFirst(),
        db.businessSetting.findUnique({
          where: { key: HOME_SLIDE_SETTINGS_KEY },
          select: { valueJson: true },
        }),
      ]);

    const vitrine = products.map((p) => {
      const merch = p.merchandising;
      const media = p.media[0];
      const availability = p.branchAvailability.find((row) =>
        branchId ? row.branchId === branchId : true,
      );
      return {
        id: p.id,
        categoryId: p.categoryId,
        slug: p.slug,
        name: p.name,
        description: p.description,
        basePriceMinor: p.basePriceMinor,
        currency: p.currency,
        displayOrder: p.displayOrder,
        imageUrl: media?.url ?? null,
        imageAlt: media?.altText ?? p.name,
        isFeatured: merch?.isFeatured ?? false,
        isHero: merch?.isHero ?? false,
        heroDisplayOrder: merch?.heroDisplayOrder ?? 0,
        isAvailable: availability ? availability.isAvailable : true,
        kcal: merch?.kcal ?? null,
        proteinGrams: merch?.proteinGrams ?? null,
        weightGrams: merch?.weightGrams ?? null,
        volumeMl: merch?.volumeMl ?? null,
        spiceLevel: merch?.spiceLevel ?? null,
        badge: merch?.badge ?? null,
        accentLabel: merch?.accentLabel ?? null,
        eyebrow: merch?.eyebrow ?? null,
        heroDescription: merch?.heroDescription ?? null,
        heroImageUrl: merch?.heroImageUrl ?? null,
        soldCount: merch?.soldCount ?? 0,
        averageRatingBps: merch?.averageRatingBps ?? null,
        ratingCount: merch?.ratingCount ?? 0,
        heroSpecs: parseHeroSpecs(merch?.heroSpecJson),
      } satisfies VitrineProductDto;
    });

    const featured = vitrine.filter((p) => p.isFeatured);
    const categoryOrder = new Map(categories.map((c) => [c.id, c.displayOrder]));
    let catalogProducts = (featured.length > 0 ? featured : vitrine)
      .slice()
      .sort(
        (a, b) =>
          (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0) ||
          a.displayOrder - b.displayOrder,
      );
    if (input.categoryId) {
      catalogProducts = catalogProducts.filter((p) => p.categoryId === input.categoryId);
    }
    // Chips must describe what is on screen, otherwise the category rail is
    // empty whenever merchandising has no featured rows yet.
    const visibleCategoryIds = new Set(catalogProducts.map((p) => p.categoryId));
    const configuredSlides = vitrine
      .filter((p) => p.isHero)
      .sort(
        (a, b) =>
          a.heroDisplayOrder - b.heroDisplayOrder ||
          a.displayOrder - b.displayOrder ||
          a.id.localeCompare(b.id),
      )
      .map((product) => ({ ...product, imageUrl: product.heroImageUrl ?? product.imageUrl }));
    const heroSource = configuredSlides[0] ?? featured[0] ?? catalogProducts[0] ?? null;
    const hero = heroSource
      ? { ...heroSource, imageUrl: heroSource.heroImageUrl ?? heroSource.imageUrl }
      : null;
    const heroSlides = configuredSlides.length > 0 ? configuredSlides : hero ? [hero] : [];

    const reviewDtos: HomeReviewDto[] = reviews.map((r) => ({
      id: r.id,
      authorDisplayName: r.authorDisplayName,
      authorInitials: initialsFromName(r.authorDisplayName),
      body: r.body,
      rating: r.rating,
      branchLabel: r.branchLabel,
      publishedAt: r.publishedAt.toISOString(),
    }));

    const ratingSum = reviewDtos.reduce((n, r) => n + r.rating, 0);
    const merchWeight = catalogProducts.reduce((n, p) => n + p.ratingCount, 0);
    const merchRating =
      merchWeight > 0
        ? Math.round(
            catalogProducts.reduce(
              (n, p) => n + (p.averageRatingBps ?? 0) * p.ratingCount,
              0,
            ) / merchWeight,
          )
        : null;
    const averageRatingBps =
      socialRow?.averageRatingBps ??
      merchRating ??
      (reviewDtos.length > 0 ? Math.round((ratingSum / reviewDtos.length) * 100) : null);
    const publishedHappy = socialRow?.happyCustomerCount ?? 0;
    const deliveredHappy = happyCustomerCount.length;

    let combo: HomeComboDto | null = null;
    if (comboRow) {
      const endsAt = comboRow.endsAt?.toISOString() ?? null;
      combo = {
        id: comboRow.id,
        slug: comboRow.slug,
        name: comboRow.name,
        description: comboRow.description,
        imageUrl: comboRow.imageUrl,
        bundlePriceMinor: comboRow.bundlePriceMinor,
        compareAtMinor: comboRow.compareAtMinor,
        currency: comboRow.currency,
        endsAt,
        savingsPercent: savingsPercent(comboRow.bundlePriceMinor, comboRow.compareAtMinor),
        expired: comboRow.endsAt ? comboRow.endsAt.getTime() <= Date.now() : false,
        items: comboRow.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          name: item.product.name,
        })),
      };
    }

    const hours = branchId && this.branches ? await this.branches.getOperatingHours(branchId) : [];

    return {
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            addressLine: branch.addressLine,
            phone: branch.phone,
            isAcceptingOrders: branch.isAcceptingOrders,
            estimatedDeliveryMinutesMin: branch.estimatedDeliveryMinutesMin,
            estimatedDeliveryMinutesMax: branch.estimatedDeliveryMinutesMax,
            hours,
          }
        : null,
      kitchenLiveCount,
      hero,
      heroSlides,
      heroSliderSettings: parseHomeSlideSettings(heroSliderSettingsRow?.valueJson),
      categories: categories
        .filter((c) => visibleCategoryIds.has(c.id))
        .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        productCount: c._count.products,
      })),
      products: catalogProducts,
      combo,
      reviews: reviewDtos,
      socialProof: {
        averageRatingBps,
        reviewCount: reviewDtos.length,
        happyCustomerCount: Math.max(publishedHappy, deliveredHappy),
      },
      builderAvailable: this.catalog ? await this.catalog.hasBuilderProduct() : false,
    };
  }

  async #memoryHome(input: { branchId?: string; categoryId?: string; q?: string }): Promise<HomePayloadDto> {
    const products = this.catalog ? await this.catalog.listProducts(input.categoryId) : [];
    const categories = this.catalog ? await this.catalog.listCategories() : [];
    let filtered = products;
    if (input.q) {
      const q = input.q.toLowerCase();
      filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q),
      );
    }
    const vitrine = filtered.map((p) => {
      const extra = this.#merch.get(p.id);
      return {
        ...emptyMerchandising(p, extra?.imageUrl ?? null),
        ...extra,
        heroDisplayOrder: extra?.heroDisplayOrder ?? 0,
        id: p.id,
      };
    });
    const branch = this.branches ? (await this.branches.listBranches())[0] ?? null : null;
    const hours =
      branch && this.branches ? await this.branches.getOperatingHours(branch.id) : [];
    const reviews = [...this.#reviews.values()];
    const ratingSum = reviews.reduce((n, r) => n + r.rating, 0);
    const configuredSlides = vitrine
      .filter((p) => p.isHero)
      .sort(
        (a, b) =>
          a.heroDisplayOrder - b.heroDisplayOrder ||
          a.displayOrder - b.displayOrder ||
          a.id.localeCompare(b.id),
      )
      .map((product) => ({ ...product, imageUrl: product.heroImageUrl ?? product.imageUrl }));
    const heroSource = configuredSlides[0] ?? vitrine[0] ?? null;
    const hero = heroSource
      ? { ...heroSource, imageUrl: heroSource.heroImageUrl ?? heroSource.imageUrl }
      : null;
    return {
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            addressLine: branch.addressLine,
            phone: branch.phone,
            isAcceptingOrders: branch.isAcceptingOrders,
            estimatedDeliveryMinutesMin: branch.estimatedDeliveryMinutesMin,
            estimatedDeliveryMinutesMax: branch.estimatedDeliveryMinutesMax,
            hours,
          }
        : null,
      kitchenLiveCount: 0,
      hero,
      heroSlides: configuredSlides.length > 0 ? configuredSlides : hero ? [hero] : [],
      heroSliderSettings: { ...DEFAULT_HOME_SLIDE_SETTINGS },
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        productCount: products.filter((p) => p.categoryId === c.id).length,
      })),
      products: vitrine,
      combo: this.#combos[0] ?? null,
      reviews,
      socialProof: {
        averageRatingBps: reviews.length > 0 ? Math.round((ratingSum / reviews.length) * 100) : null,
        reviewCount: reviews.length,
        happyCustomerCount: reviews.length,
      },
      builderAvailable: this.catalog ? await this.catalog.hasBuilderProduct() : false,
    };
  }

  async #resolveBranch(branchId?: string): Promise<BranchDto | null> {
    if (!this.branches) return null;
    const id = branchId ?? DEFAULT_BRANCH_ID;
    try {
      return await this.branches.getBranch(id);
    } catch {
      const list = await this.branches.listBranches();
      return list[0] ?? null;
    }
  }
}
