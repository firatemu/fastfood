import { ErrorCodes } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { CatalogService } from '../catalog/catalog.service.js';

export interface FavoriteDto {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
  product: {
    id: string;
    slug: string;
    name: string;
    currency: string;
    basePriceMinor: bigint;
    isActive: boolean;
    isAvailable: boolean;
    imageUrl: string | null;
  } | null;
}

@Injectable()
export class FavoritesService {
  readonly #byUser = new Map<string, FavoriteDto[]>();
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
    @Optional() @Inject(CatalogService) private readonly catalog: CatalogService | null = null,
  ) {}

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-f000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  async list(userId: string, branchId?: string): Promise<FavoriteDto[]> {
    const rows = this.prisma
      ? await this.prisma.customerFavorite.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        })
      : [...(this.#byUser.get(userId) ?? [])];
    return Promise.all(rows.map((row) => this.#hydrate(row, branchId)));
  }

  async add(userId: string, productId: string): Promise<FavoriteDto> {
    const existing = await this.#find(userId, productId);
    if (existing) {
      return this.#hydrate(existing);
    }
    if (this.catalog) {
      await this.catalog.getProduct(productId);
    }
    if (!this.prisma) {
      const created: FavoriteDto = {
        id: this.#newId(),
        userId,
        productId,
        createdAt: new Date(),
        product: null,
      };
      const list = this.#byUser.get(userId) ?? [];
      list.unshift(created);
      this.#byUser.set(userId, list);
      return this.#hydrate(created);
    }
    const row = await this.prisma.customerFavorite.create({
      data: { userId, productId },
    });
    return this.#hydrate(row);
  }

  async remove(userId: string, favoriteId: string): Promise<void> {
    const owned = await this.getOwned(userId, favoriteId);
    if (!this.prisma) {
      const list = (this.#byUser.get(userId) ?? []).filter((item) => item.id !== owned.id);
      this.#byUser.set(userId, list);
      return;
    }
    await this.prisma.customerFavorite.delete({ where: { id: owned.id } });
  }

  async getOwned(userId: string, favoriteId: string): Promise<FavoriteDto> {
    if (!this.prisma) {
      const found = (this.#byUser.get(userId) ?? []).find((item) => item.id === favoriteId);
      if (!found) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Favorite not found.',
        });
      }
      return this.#hydrate(found);
    }
    const row = await this.prisma.customerFavorite.findUnique({ where: { id: favoriteId } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Favorite not found.',
      });
    }
    return this.#hydrate(row);
  }

  async #find(userId: string, productId: string): Promise<{
    id: string;
    userId: string;
    productId: string;
    createdAt: Date;
  } | null> {
    if (!this.prisma) {
      return (this.#byUser.get(userId) ?? []).find((item) => item.productId === productId) ?? null;
    }
    return this.prisma.customerFavorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  async #hydrate(
    row: { id: string; userId: string; productId: string; createdAt: Date },
    branchId?: string,
  ): Promise<FavoriteDto> {
    let product: FavoriteDto['product'] = null;
    if (this.catalog) {
      try {
        const detail = await this.catalog.getStorefrontProductDetail(row.productId, { branchId });
        const availableAtBranch = branchId
          ? await this.catalog.isProductAvailableAt(branchId, row.productId)
          : detail.isAvailable;
        product = {
          id: detail.id,
          slug: detail.slug,
          name: detail.name,
          currency: detail.currency,
          basePriceMinor: detail.basePriceMinor,
          isActive: detail.isActive,
          isAvailable: detail.isActive && availableAtBranch,
          imageUrl: detail.media[0]?.url ?? null,
        };
      } catch {
        product = {
          id: row.productId,
          slug: '',
          name: 'Ürün artık yok',
          currency: 'TRY',
          basePriceMinor: 0n,
          isActive: false,
          isAvailable: false,
          imageUrl: null,
        };
      }
    }
    return { ...row, product };
  }
}
