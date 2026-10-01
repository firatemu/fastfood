import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { PromotionService, type PromotionDto } from '../promotion/promotion.service.js';

import {
  DEFAULT_CLUB_TIERS,
  LIFETIME_EXCLUDE_TYPES,
  WELCOME_PROMOTION_CODE,
  WELCOME_PROMOTION_NAME,
  type ClubTierDefinition,
  welcomeRewardMinor,
  welcomeValidDays,
} from './club.config.js';
import { LoyaltyService, type LoyaltyActivityItem } from './loyalty.service.js';

export interface ClubTierView {
  code: string;
  displayName: string;
  minLifetimeEarnedPoints: string;
}

export interface ClubSnapshot {
  programName: 'BURGER HOME CLUB';
  points: string;
  lifetimeEarnedPoints: string;
  currentTier: ClubTierView;
  nextTier: ClubTierView | null;
  pointsToNextTier: string | null;
  progressBps: number;
  welcome: {
    status: 'AVAILABLE' | 'GRANTED' | 'EXPIRED' | 'REDEEMED' | 'INELIGIBLE';
    promotionCode: string | null;
    discountMinor: string | null;
    expiresAt: string | null;
  };
  activity: LoyaltyActivityItem[];
}

export interface WelcomeGrantRecord {
  userId: string;
  promotionId: string;
  pointsGranted: bigint;
  grantedAt: Date;
  expiresAt: Date | null;
}

@Injectable()
export class ClubService {
  readonly #grants = new Map<string, WelcomeGrantRecord>();
  readonly #welcomeLocks = new Map<string, Promise<WelcomeGrantRecord>>();
  #welcomePromotion: PromotionDto | null = null;

  constructor(
    @Inject(LoyaltyService) private readonly loyalty: LoyaltyService,
    @Optional() @Inject(PromotionService) private readonly promotions: PromotionService | null = null,
    @Optional() @Inject(NotificationService) private readonly notifications: NotificationService | null = null,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  /** Customer-facing snapshot — may grant welcome. Not for Admin GET. */
  async getSnapshot(userId: string): Promise<ClubSnapshot> {
    await this.grantWelcomeIfEligible(userId);
    return this.inspectSnapshot(userId);
  }

  /** Admin read-only club view — does not grant welcome or mutate ledger. */
  async inspectSnapshot(userId: string): Promise<ClubSnapshot> {
    const [points, lifetime, tiers, activity] = await Promise.all([
      this.loyalty.getBalance(userId),
      this.loyalty.getLifetimeEarned(userId),
      this.listTiers(),
      this.loyalty.listCustomerActivity(userId, 20),
    ]);
    const current = this.resolveTier(lifetime, tiers);
    const next = this.nextTier(lifetime, tiers);
    const span = next
      ? next.minLifetimeEarnedPoints - current.minLifetimeEarnedPoints
      : 0n;
    const progressed = next ? lifetime - current.minLifetimeEarnedPoints : span;
    const progressBps =
      !next || span <= 0n
        ? 10000
        : Number((progressed * 10000n) / span);
    return {
      programName: 'BURGER HOME CLUB',
      points: points.toString(),
      lifetimeEarnedPoints: lifetime.toString(),
      currentTier: this.toView(current),
      nextTier: next ? this.toView(next) : null,
      pointsToNextTier: next
        ? (next.minLifetimeEarnedPoints - lifetime).toString()
        : null,
      progressBps: Math.min(10000, Math.max(0, progressBps)),
      welcome: await this.welcomeStatus(userId),
      activity,
    };
  }

  resolveTier(lifetimeEarned: bigint, tiers = DEFAULT_CLUB_TIERS): ClubTierDefinition {
    const sorted = [...tiers].sort((a, b) =>
      a.minLifetimeEarnedPoints === b.minLifetimeEarnedPoints
        ? a.sortOrder - b.sortOrder
        : a.minLifetimeEarnedPoints < b.minLifetimeEarnedPoints ? -1 : 1,
    );
    const fallback: ClubTierDefinition = {
      code: 'KOR',
      displayName: 'Kor',
      minLifetimeEarnedPoints: 0n,
      sortOrder: 0,
    };
    let current = sorted[0] ?? fallback;
    for (const tier of sorted) {
      if (lifetimeEarned >= tier.minLifetimeEarnedPoints) current = tier;
    }
    return current;
  }

  nextTier(
    lifetimeEarned: bigint,
    tiers = DEFAULT_CLUB_TIERS,
  ): ClubTierDefinition | null {
    const sorted = [...tiers].sort((a, b) =>
      a.minLifetimeEarnedPoints < b.minLifetimeEarnedPoints ? -1 : 1,
    );
    return sorted.find((t) => t.minLifetimeEarnedPoints > lifetimeEarned) ?? null;
  }

  async listTiers(): Promise<ClubTierDefinition[]> {
    if (!this.prisma) {
      return [...DEFAULT_CLUB_TIERS];
    }
    const rows = await this.prisma.loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) return [...DEFAULT_CLUB_TIERS];
    return rows.map((row) => ({
      code: row.code,
      displayName: row.displayName,
      minLifetimeEarnedPoints: row.minLifetimeEarnedPoints,
      sortOrder: row.sortOrder,
    }));
  }

  async grantWelcomeIfEligible(userId: string): Promise<WelcomeGrantRecord | null> {
    const existing = await this.findGrant(userId);
    if (existing) return existing;
    const inFlight = this.#welcomeLocks.get(userId);
    if (inFlight) return inFlight;
    const run = this.executeWelcomeGrant(userId);
    this.#welcomeLocks.set(userId, run);
    try {
      return await run;
    } finally {
      this.#welcomeLocks.delete(userId);
    }
  }

  async getApplicableWelcomePromotion(userId: string): Promise<PromotionDto | null> {
    const grant = await this.findGrant(userId);
    if (!grant) return null;
    if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) return null;
    if (await this.hasRedeemedWelcome(userId, grant.promotionId)) return null;
    if (!this.promotions) return this.#welcomePromotion;
    try {
      return await this.promotions.get(grant.promotionId);
    } catch {
      return this.promotions.validateCode(WELCOME_PROMOTION_CODE);
    }
  }

  private async executeWelcomeGrant(userId: string): Promise<WelcomeGrantRecord> {
    const again = await this.findGrant(userId);
    if (again) return again;
    const promotion = await this.ensureWelcomePromotion();
    const expiresAt = new Date(Date.now() + welcomeValidDays() * 24 * 60 * 60 * 1000);
    const record: WelcomeGrantRecord = {
      userId,
      promotionId: promotion.id,
      pointsGranted: 0n,
      grantedAt: new Date(),
      expiresAt,
    };
    if (!this.prisma) {
      this.#grants.set(userId, record);
      await this.notifyWelcome(userId, promotion);
      return record;
    }
    try {
      const created = await this.prisma.welcomeRewardGrant.create({
        data: {
          userId,
          promotionId: promotion.id,
          pointsGranted: 0n,
          expiresAt,
        },
      });
      const saved: WelcomeGrantRecord = {
        userId: created.userId,
        promotionId: created.promotionId,
        pointsGranted: created.pointsGranted,
        grantedAt: created.grantedAt,
        expiresAt: created.expiresAt,
      };
      await this.notifyWelcome(userId, promotion);
      return saved;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        const raced = await this.findGrant(userId);
        if (raced) return raced;
      }
      throw err;
    }
  }

  private async ensureWelcomePromotion(): Promise<PromotionDto> {
    if (!this.promotions) {
      throw new BadRequestException({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Promotion service is required for welcome reward.',
      });
    }
    const existing = await this.promotions.validateCode(WELCOME_PROMOTION_CODE);
    if (existing) {
      this.#welcomePromotion = existing;
      return existing;
    }
    const created = await this.promotions.create({
      code: WELCOME_PROMOTION_CODE,
      name: WELCOME_PROMOTION_NAME,
      kind: 'FIXED_CART_MINOR',
      discountMinor: welcomeRewardMinor(),
      usageLimitPerCustomer: 1,
      firstOrderOnly: true,
      combinable: false,
    });
    this.#welcomePromotion = created;
    return created;
  }

  private async findGrant(userId: string): Promise<WelcomeGrantRecord | null> {
    if (!this.prisma) return this.#grants.get(userId) ?? null;
    const row = await this.prisma.welcomeRewardGrant.findUnique({ where: { userId } });
    if (!row) return null;
    return {
      userId: row.userId,
      promotionId: row.promotionId,
      pointsGranted: row.pointsGranted,
      grantedAt: row.grantedAt,
      expiresAt: row.expiresAt,
    };
  }

  private async welcomeStatus(userId: string): Promise<ClubSnapshot['welcome']> {
    const grant = await this.findGrant(userId);
    const promo = this.promotions
      ? await this.promotions.validateCode(WELCOME_PROMOTION_CODE)
      : this.#welcomePromotion;
    const discountMinor = promo?.discountMinor?.toString() ?? welcomeRewardMinor().toString();
    if (!grant) {
      return {
        status: 'INELIGIBLE',
        promotionCode: WELCOME_PROMOTION_CODE,
        discountMinor,
        expiresAt: null,
      };
    }
    if (await this.hasRedeemedWelcome(userId, grant.promotionId)) {
      return {
        status: 'REDEEMED',
        promotionCode: WELCOME_PROMOTION_CODE,
        discountMinor,
        expiresAt: grant.expiresAt?.toISOString() ?? null,
      };
    }
    if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) {
      return {
        status: 'EXPIRED',
        promotionCode: WELCOME_PROMOTION_CODE,
        discountMinor,
        expiresAt: grant.expiresAt.toISOString(),
      };
    }
    return {
      status: 'AVAILABLE',
      promotionCode: WELCOME_PROMOTION_CODE,
      discountMinor,
      expiresAt: grant.expiresAt?.toISOString() ?? null,
    };
  }

  private async hasRedeemedWelcome(userId: string, promotionId: string): Promise<boolean> {
    if (!this.prisma) return false;
    const count = await this.prisma.couponRedemption.count({
      where: { userId, promotionId },
    });
    return count > 0;
  }

  private async notifyWelcome(userId: string, promotion: PromotionDto): Promise<void> {
    if (!this.notifications) return;
    await this.notifications.enqueueAndSend({
      userId,
      channel: 'IN_APP',
      templateKey: 'loyalty.welcome',
      payloadJson: {
        title: 'BURGER HOME CLUB hoş geldin ödülü',
        body: 'İlk siparişinde geçerli hoş geldin indirimi tanımlandı.',
        href: '/account/club',
        promotionCode: promotion.code,
      },
    });
  }

  private toView(tier: ClubTierDefinition): ClubTierView {
    return {
      code: tier.code,
      displayName: tier.displayName,
      minLifetimeEarnedPoints: tier.minLifetimeEarnedPoints.toString(),
    };
  }
}

export { LIFETIME_EXCLUDE_TYPES };
