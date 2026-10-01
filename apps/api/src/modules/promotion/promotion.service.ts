import { ErrorCodes, formatTryMinor } from '@fastfood/contracts';
import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

export type PromotionKind = 'FIXED_CART_MINOR' | 'PERCENT_CART' | 'DELIVERY_FEE_WAIVER';

export interface PromotionDto {
  id: string;
  code: string | null;
  name: string;
  kind: PromotionKind;
  discountMinor: bigint | null;
  discountPercentBps: number | null;
  minMerchandiseMinor: bigint;
  validFrom: string | null;
  validTo: string | null;
  branchIds: string[] | null;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  combinable: boolean;
  firstOrderOnly: boolean;
  listedOnStorefront: boolean;
  customerHeadline: string | null;
  customerDescription: string | null;
  isActive: boolean;
}

export type PublicDealEligibility = 'eligible' | 'first_order_only' | 'expired';

export interface PublicDealDto {
  id: string;
  code: string | null;
  headline: string;
  description: string | null;
  kind: PromotionKind;
  discountSummary: string;
  discountMinor: string | null;
  discountPercentBps: number | null;
  minMerchandiseMinor: string;
  validFrom: string | null;
  validTo: string | null;
  firstOrderOnly: boolean;
  branchRestricted: boolean;
  eligibility: PublicDealEligibility;
}

export interface CreatePromotionInput {
  code?: string;
  name: string;
  kind: PromotionKind;
  discountMinor?: bigint;
  discountPercentBps?: number;
  minMerchandiseMinor?: bigint;
  validFrom?: Date;
  validTo?: Date;
  branchIds?: string[];
  usageLimitTotal?: number;
  usageLimitPerCustomer?: number;
  combinable?: boolean;
  firstOrderOnly?: boolean;
  listedOnStorefront?: boolean;
  customerHeadline?: string;
  customerDescription?: string;
}

@Injectable()
export class PromotionService {
  readonly #promotions = new Map<string, PromotionDto>();
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-c000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  async list(includeInactive = false): Promise<PromotionDto[]> {
    if (!this.prisma) {
      return [...this.#promotions.values()].filter((p) => includeInactive || p.isActive);
    }
    const rows = await this.prisma.promotion.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.#mapRow(r));
  }

  async get(id: string): Promise<PromotionDto> {
    if (!this.prisma) {
      const p = this.#promotions.get(id);
      if (!p) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Promotion not found.',
        });
      }
      return p;
    }
    const r = await this.prisma.promotion.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Promotion not found.',
      });
    }
    return this.#mapRow(r);
  }

  async create(input: CreatePromotionInput): Promise<PromotionDto> {
    if (!this.prisma) {
      const id = this.#newId();
      const created: PromotionDto = {
        id,
        code: input.code ?? null,
        name: input.name,
        kind: input.kind,
        discountMinor: input.discountMinor ?? null,
        discountPercentBps: input.discountPercentBps ?? null,
        minMerchandiseMinor: input.minMerchandiseMinor ?? 0n,
        validFrom: input.validFrom?.toISOString() ?? null,
        validTo: input.validTo?.toISOString() ?? null,
        branchIds: input.branchIds ?? null,
        usageLimitTotal: input.usageLimitTotal ?? null,
        usageLimitPerCustomer: input.usageLimitPerCustomer ?? null,
        combinable: input.combinable ?? false,
        firstOrderOnly: input.firstOrderOnly ?? false,
        listedOnStorefront: input.listedOnStorefront ?? false,
        customerHeadline: input.customerHeadline ?? null,
        customerDescription: input.customerDescription ?? null,
        isActive: true,
      };
      this.#promotions.set(id, created);
      return created;
    }
    const r = await this.prisma.promotion.create({
      data: {
        code: input.code ?? null,
        name: input.name,
        kind: input.kind,
        discountMinor: input.discountMinor ?? null,
        discountPercentBps: input.discountPercentBps ?? null,
        minMerchandiseMinor: input.minMerchandiseMinor ?? 0n,
        validFrom: input.validFrom ?? null,
        validTo: input.validTo ?? null,
        branchIdsJson: input.branchIds ?? undefined,
        usageLimitTotal: input.usageLimitTotal ?? null,
        usageLimitPerCustomer: input.usageLimitPerCustomer ?? null,
        combinable: input.combinable ?? false,
        firstOrderOnly: input.firstOrderOnly ?? false,
        listedOnStorefront: input.listedOnStorefront ?? false,
        customerHeadline: input.customerHeadline ?? null,
        customerDescription: input.customerDescription ?? null,
        isActive: true,
      },
    });
    return this.#mapRow(r);
  }

  async validateCode(code: string): Promise<PromotionDto | null> {
    const normalized = code.trim().toUpperCase();
    const now = new Date();
    if (!this.prisma) {
      const p =
        [...this.#promotions.values()].find(
          (x) => x.isActive && x.code?.toUpperCase() === normalized,
        ) ?? null;
      if (!p) return null;
      if (p.validFrom && new Date(p.validFrom) > now) return null;
      if (p.validTo && new Date(p.validTo) < now) return null;
      return p;
    }
    const r = await this.prisma.promotion.findFirst({
      where: { isActive: true, code: { equals: normalized, mode: 'insensitive' } },
    });
    if (!r) return null;
    if (r.validFrom && r.validFrom > now) return null;
    if (r.validTo && r.validTo < now) return null;
    return this.#mapRow(r);
  }

  /**
   * Server-authoritative discount application (document 11 + 37).
   * Client-supplied discounts must not override this result.
   */
  computeDiscount(
    promo: PromotionDto,
    input: { merchandiseGrossMinor: bigint; deliveryFeeMinor: bigint },
  ): { cartDiscountMinor: bigint; deliveryFeeMinor: bigint } {
    if (input.merchandiseGrossMinor < promo.minMerchandiseMinor) {
      return { cartDiscountMinor: 0n, deliveryFeeMinor: input.deliveryFeeMinor };
    }
    if (promo.kind === 'FIXED_CART_MINOR') {
      const amount = promo.discountMinor ?? 0n;
      const cartDiscountMinor =
        amount > input.merchandiseGrossMinor ? input.merchandiseGrossMinor : amount;
      return { cartDiscountMinor, deliveryFeeMinor: input.deliveryFeeMinor };
    }
    if (promo.kind === 'PERCENT_CART') {
      const bps = promo.discountPercentBps ?? 0;
      const cartDiscountMinor = (input.merchandiseGrossMinor * BigInt(bps) + 5000n) / 10000n;
      return { cartDiscountMinor, deliveryFeeMinor: input.deliveryFeeMinor };
    }
    if (promo.kind === 'DELIVERY_FEE_WAIVER') {
      return { cartDiscountMinor: 0n, deliveryFeeMinor: 0n };
    }
    return { cartDiscountMinor: 0n, deliveryFeeMinor: input.deliveryFeeMinor };
  }

  async listPublicDeals(now = new Date()): Promise<PublicDealDto[]> {
    const active = await this.list(false);
    return active
      .filter((p) => p.listedOnStorefront && this.#inWindow(p, now))
      .map((p) => this.toPublicDeal(p, now));
  }

  toPublicDeal(p: PromotionDto, now = new Date()): PublicDealDto {
    const inWindow = this.#inWindow(p, now);
    return {
      id: p.id,
      code: p.code,
      headline: p.customerHeadline ?? p.name,
      description: p.customerDescription,
      kind: p.kind,
      discountSummary: this.#discountSummary(p),
      discountMinor: p.discountMinor != null ? p.discountMinor.toString() : null,
      discountPercentBps: p.discountPercentBps,
      minMerchandiseMinor: p.minMerchandiseMinor.toString(),
      validFrom: p.validFrom,
      validTo: p.validTo,
      firstOrderOnly: p.firstOrderOnly,
      branchRestricted: Boolean(p.branchIds && p.branchIds.length > 0),
      eligibility: !inWindow ? 'expired' : p.firstOrderOnly ? 'first_order_only' : 'eligible',
    };
  }

  #inWindow(p: PromotionDto, now: Date): boolean {
    if (p.validFrom && Date.parse(p.validFrom) > now.getTime()) return false;
    if (p.validTo && Date.parse(p.validTo) < now.getTime()) return false;
    return true;
  }

  #discountSummary(p: PromotionDto): string {
    if (p.kind === 'PERCENT_CART' && p.discountPercentBps != null) {
      const pct = p.discountPercentBps / 100;
      const label = p.discountPercentBps % 100 === 0 ? pct.toFixed(0) : pct.toFixed(1);
      return `%${label} sepet indirimi`;
    }
    if (p.kind === 'FIXED_CART_MINOR' && p.discountMinor != null) {
      return `${formatTryMinor(p.discountMinor)} sepet indirimi`;
    }
    if (p.kind === 'DELIVERY_FEE_WAIVER') return 'Teslimat ücreti muafiyeti';
    return p.name;
  }

  async setActive(id: string, isActive: boolean): Promise<PromotionDto> {
    if (!this.prisma) {
      const p = this.#promotions.get(id);
      if (!p) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Promotion not found.',
        });
      }
      const updated = { ...p, isActive };
      this.#promotions.set(id, updated);
      return updated;
    }
    try {
      const r = await this.prisma.promotion.update({
        where: { id },
        data: { isActive },
      });
      return this.#mapRow(r);
    } catch {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Promotion not found.',
      });
    }
  }

  #mapRow(r: {
    id: string;
    code: string | null;
    name: string;
    kind: string;
    discountMinor: bigint | null;
    discountPercentBps: number | null;
    minMerchandiseMinor: bigint;
    validFrom: Date | null;
    validTo: Date | null;
    branchIdsJson: unknown;
    usageLimitTotal: number | null;
    usageLimitPerCustomer: number | null;
    combinable: boolean;
    firstOrderOnly: boolean;
    listedOnStorefront?: boolean;
    customerHeadline?: string | null;
    customerDescription?: string | null;
    isActive: boolean;
  }): PromotionDto {
    const branchIds = Array.isArray(r.branchIdsJson)
      ? (r.branchIdsJson as string[])
      : r.branchIdsJson
        ? (r.branchIdsJson as string[])
        : null;
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      kind: r.kind as PromotionKind,
      discountMinor: r.discountMinor,
      discountPercentBps: r.discountPercentBps,
      minMerchandiseMinor: r.minMerchandiseMinor,
      validFrom: r.validFrom?.toISOString() ?? null,
      validTo: r.validTo?.toISOString() ?? null,
      branchIds,
      usageLimitTotal: r.usageLimitTotal,
      usageLimitPerCustomer: r.usageLimitPerCustomer,
      combinable: r.combinable,
      firstOrderOnly: r.firstOrderOnly,
      listedOnStorefront: r.listedOnStorefront ?? false,
      customerHeadline: r.customerHeadline ?? null,
      customerDescription: r.customerDescription ?? null,
      isActive: r.isActive,
    };
  }
}
