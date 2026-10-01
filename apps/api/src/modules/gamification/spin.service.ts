import { randomBytes, randomInt } from 'node:crypto';

import { ErrorCodes } from '@fastfood/contracts';
import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { PromotionService, type PromotionKind } from '../promotion/promotion.service.js';

export type SpinPrizeKind = 'POINTS' | 'PERCENT_CART' | 'FIXED_CART_MINOR' | 'DELIVERY_FEE_WAIVER';

export interface SpinPrizeDef {
  id: string;
  campaignId: string;
  code: string;
  label: string;
  kind: SpinPrizeKind;
  weight: number;
  pointsDelta: bigint | null;
  discountMinor: bigint | null;
  discountPercentBps: number | null;
}

export interface SpinCampaignDef {
  id: string;
  code: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  dailySpinLimit: number;
  prizes: SpinPrizeDef[];
}

export interface SpinPlayResult {
  playId: string;
  userId: string;
  campaignId: string;
  periodKey: string;
  idempotencyKey: string;
  prize: {
    code: string;
    label: string;
    kind: SpinPrizeKind;
    pointsAwarded: string;
    couponCode: string | null;
  };
  replayed: boolean;
}

export interface SpinEligibility {
  campaign: { id: string; name: string; endsAt: string } | null;
  eligible: boolean;
  reason: 'READY' | 'NO_CAMPAIGN' | 'NOT_ACTIVE' | 'ALREADY_USED' | 'NO_PRIZES';
  spinsRemaining: number;
  lastPlay: SpinPlayResult | null;
  prizes: Array<{ code: string; label: string; kind: SpinPrizeKind }>;
}

const DEFAULT_CAMPAIGN_ID = '01900000-0000-7000-c100-000000000020';

@Injectable()
export class SpinService {
  readonly #campaigns = new Map<string, SpinCampaignDef>();
  readonly #plays: SpinPlayResult[] = [];
  readonly #locks = new Map<string, Promise<SpinPlayResult>>();
  #seq = 0;

  constructor(
    @Inject(LoyaltyService) private readonly loyalty: LoyaltyService,
    @Optional() @Inject(PromotionService) private readonly promotions: PromotionService | null = null,
    @Optional() @Inject(NotificationService) private readonly notifications: NotificationService | null = null,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {
    this.seedDefaultCampaign();
  }

  /** Test seam — replace campaign clock/prizes without Prisma. */
  replaceCampaign(campaign: SpinCampaignDef): void {
    this.#campaigns.clear();
    this.#campaigns.set(campaign.id, campaign);
  }

  async getEligibility(userId: string, now = new Date()): Promise<SpinEligibility> {
    const campaign = await this.activeCampaign(now);
    if (!campaign) {
      return {
        campaign: null,
        eligible: false,
        reason: 'NO_CAMPAIGN',
        spinsRemaining: 0,
        lastPlay: null,
        prizes: [],
      };
    }
    const prizes = campaign.prizes.filter((p) => p.weight > 0);
    if (prizes.length === 0) {
      return {
        campaign: { id: campaign.id, name: campaign.name, endsAt: campaign.endsAt.toISOString() },
        eligible: false,
        reason: 'NO_PRIZES',
        spinsRemaining: 0,
        lastPlay: null,
        prizes: [],
      };
    }
    const periodKey = istanbulDateKey(now);
    const lastPlay = await this.findPlay(userId, campaign.id, periodKey);
    const remaining = lastPlay ? 0 : campaign.dailySpinLimit;
    return {
      campaign: { id: campaign.id, name: campaign.name, endsAt: campaign.endsAt.toISOString() },
      eligible: remaining > 0,
      reason: remaining > 0 ? 'READY' : 'ALREADY_USED',
      spinsRemaining: remaining,
      lastPlay,
      prizes: prizes.map((p) => ({ code: p.code, label: p.label, kind: p.kind })),
    };
  }

  async spin(
    userId: string,
    idempotencyKey: string,
    now = new Date(),
  ): Promise<SpinPlayResult> {
    const campaign = await this.activeCampaign(now);
    const periodKey = campaign ? istanbulDateKey(now) : 'none';
    const lockKey = `${userId}:${campaign?.id ?? 'none'}:${periodKey}:${idempotencyKey}`;
    const periodLock = `${userId}:${campaign?.id ?? 'none'}:${periodKey}`;
    const inFlight = this.#locks.get(lockKey) ?? this.#locks.get(periodLock);
    if (inFlight) return inFlight;
    const run = this.executeSpin(userId, idempotencyKey, now);
    this.#locks.set(lockKey, run);
    this.#locks.set(periodLock, run);
    try {
      return await run;
    } finally {
      this.#locks.delete(lockKey);
      this.#locks.delete(periodLock);
    }
  }

  private async executeSpin(
    userId: string,
    idempotencyKey: string,
    now: Date,
  ): Promise<SpinPlayResult> {
    const replay = await this.findByIdempotency(userId, idempotencyKey);
    if (replay) return { ...replay, replayed: true };

    const campaign = await this.activeCampaign(now);
    if (!campaign) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No active Ateş Çarkı campaign.',
      });
    }
    const periodKey = istanbulDateKey(now);
    const existing = await this.findPlay(userId, campaign.id, periodKey);
    if (existing) return { ...existing, replayed: true };

    const prize = this.pickPrize(campaign.prizes);
    if (!prize) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Campaign has no prizes.',
      });
    }
    const awarded = await this.awardPrize(userId, prize);
    const result: SpinPlayResult = {
      playId: this.newId(),
      userId,
      campaignId: campaign.id,
      periodKey,
      idempotencyKey,
      prize: {
        code: prize.code,
        label: prize.label,
        kind: prize.kind,
        pointsAwarded: awarded.pointsAwarded.toString(),
        couponCode: awarded.couponCode,
      },
      replayed: false,
    };
    if (!this.prisma) {
      this.#plays.push({ ...result });
      await this.notifySpin(userId, result);
      return result;
    }
    try {
      const row = await this.prisma.spinPlay.create({
        data: {
          campaignId: campaign.id,
          prizeId: prize.id,
          userId,
          periodKey,
          idempotencyKey,
          couponCode: awarded.couponCode,
          promotionId: awarded.promotionId,
          pointsAwarded: awarded.pointsAwarded,
        },
      });
      result.playId = row.id;
      await this.notifySpin(userId, result);
      return result;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        const raced =
          (await this.findByIdempotency(userId, idempotencyKey)) ??
          (await this.findPlay(userId, campaign.id, periodKey));
        if (raced) return { ...raced, replayed: true };
      }
      throw err;
    }
  }

  private async awardPrize(
    userId: string,
    prize: SpinPrizeDef,
  ): Promise<{ pointsAwarded: bigint; couponCode: string | null; promotionId: string | null }> {
    if (prize.kind === 'POINTS') {
      const points = prize.pointsDelta ?? 0n;
      if (points > 0n) {
        await this.loyalty.credit({ userId, points, reason: 'spin_reward', entryType: 'CREDIT' });
      }
      return { pointsAwarded: points, couponCode: null, promotionId: null };
    }
    if (!this.promotions) {
      throw new BadRequestException({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Promotion service is required for this prize.',
      });
    }
    const couponCode = `BHSPIN${randomBytes(4).toString('hex').toUpperCase()}`;
    const kind: PromotionKind =
      prize.kind === 'PERCENT_CART'
        ? 'PERCENT_CART'
        : prize.kind === 'DELIVERY_FEE_WAIVER'
          ? 'DELIVERY_FEE_WAIVER'
          : 'FIXED_CART_MINOR';
    const created = await this.promotions.create({
      code: couponCode,
      name: `Ateş Çarkı — ${prize.label}`,
      kind,
      discountMinor: prize.discountMinor ?? undefined,
      discountPercentBps: prize.discountPercentBps ?? undefined,
      usageLimitPerCustomer: 1,
      usageLimitTotal: 1,
      combinable: false,
    });
    return { pointsAwarded: 0n, couponCode, promotionId: created.id };
  }

  private pickPrize(prizes: SpinPrizeDef[]): SpinPrizeDef | null {
    const active = prizes.filter((p) => p.weight > 0);
    const total = active.reduce((sum, p) => sum + p.weight, 0);
    if (total <= 0) return null;
    let cursor = randomInt(total);
    for (const prize of active) {
      if (cursor < prize.weight) return prize;
      cursor -= prize.weight;
    }
    return active[active.length - 1] ?? null;
  }

  private async activeCampaign(now: Date): Promise<SpinCampaignDef | null> {
    if (!this.prisma) {
      return (
        [...this.#campaigns.values()].find(
          (c) => c.isActive && c.startsAt <= now && c.endsAt >= now,
        ) ?? null
      );
    }
    const row = await this.prisma.spinCampaign.findFirst({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { prizes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isActive: row.isActive,
      dailySpinLimit: row.dailySpinLimit,
      prizes: row.prizes.map((p) => ({
        id: p.id,
        campaignId: p.campaignId,
        code: p.code,
        label: p.label,
        kind: p.kind as SpinPrizeKind,
        weight: p.weight,
        pointsDelta: p.pointsDelta,
        discountMinor: p.discountMinor,
        discountPercentBps: p.discountPercentBps,
      })),
    };
  }

  private async findPlay(
    userId: string,
    campaignId: string,
    periodKey: string,
  ): Promise<SpinPlayResult | null> {
    if (!this.prisma) {
      return (
        this.#plays.find(
          (p) => p.userId === userId && p.campaignId === campaignId && p.periodKey === periodKey,
        ) ?? null
      );
    }
    const row = await this.prisma.spinPlay.findUnique({
      where: { userId_campaignId_periodKey: { userId, campaignId, periodKey } },
      include: { prize: true },
    });
    return row ? this.mapPlay(row) : null;
  }

  private async findByIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<SpinPlayResult | null> {
    if (!this.prisma) {
      return this.#plays.find((p) => p.userId === userId && p.idempotencyKey === idempotencyKey) ?? null;
    }
    const row = await this.prisma.spinPlay.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: { prize: true },
    });
    return row ? this.mapPlay(row) : null;
  }

  private mapPlay(row: {
    id: string;
    userId: string;
    campaignId: string;
    periodKey: string;
    idempotencyKey: string;
    couponCode: string | null;
    pointsAwarded: bigint;
    prize: { code: string; label: string; kind: string };
  }): SpinPlayResult {
    return {
      playId: row.id,
      userId: row.userId,
      campaignId: row.campaignId,
      periodKey: row.periodKey,
      idempotencyKey: row.idempotencyKey,
      prize: {
        code: row.prize.code,
        label: row.prize.label,
        kind: row.prize.kind as SpinPrizeKind,
        pointsAwarded: row.pointsAwarded.toString(),
        couponCode: row.couponCode,
      },
      replayed: false,
    };
  }

  private async notifySpin(userId: string, result: SpinPlayResult): Promise<void> {
    if (!this.notifications) return;
    await this.notifications.enqueueAndSend({
      userId,
      channel: 'IN_APP',
      templateKey: 'loyalty.spin_reward',
      payloadJson: {
        title: 'Ateş Çarkı ödülün',
        body: result.prize.label,
        href: '/account/spin',
        couponCode: result.prize.couponCode,
      },
    });
  }

  private seedDefaultCampaign(): void {
    const startsAt = new Date('2026-01-01T00:00:00.000Z');
    const endsAt = new Date('2027-01-01T00:00:00.000Z');
    this.#campaigns.set(DEFAULT_CAMPAIGN_ID, {
      id: DEFAULT_CAMPAIGN_ID,
      code: 'ATES_CARKI',
      name: 'Ateş Çarkı',
      startsAt,
      endsAt,
      isActive: true,
      dailySpinLimit: 1,
      prizes: [
        {
          id: '01900000-0000-7000-c100-000000000021',
          campaignId: DEFAULT_CAMPAIGN_ID,
          code: 'PTS100',
          label: '100 BURGER HOME CLUB puan',
          kind: 'POINTS',
          weight: 50,
          pointsDelta: 100n,
          discountMinor: null,
          discountPercentBps: null,
        },
        {
          id: '01900000-0000-7000-c100-000000000022',
          campaignId: DEFAULT_CAMPAIGN_ID,
          code: 'PCT10',
          label: '%10 sepet indirimi',
          kind: 'PERCENT_CART',
          weight: 25,
          pointsDelta: null,
          discountMinor: null,
          discountPercentBps: 1000,
        },
        {
          id: '01900000-0000-7000-c100-000000000023',
          campaignId: DEFAULT_CAMPAIGN_ID,
          code: 'FREEDEL',
          label: 'Ücretsiz teslimat',
          kind: 'DELIVERY_FEE_WAIVER',
          weight: 15,
          pointsDelta: null,
          discountMinor: null,
          discountPercentBps: null,
        },
        {
          id: '01900000-0000-7000-c100-000000000024',
          campaignId: DEFAULT_CAMPAIGN_ID,
          code: 'PTS25',
          label: '25 BURGER HOME CLUB puan',
          kind: 'POINTS',
          weight: 10,
          pointsDelta: 25n,
          discountMinor: null,
          discountPercentBps: null,
        },
      ],
    });
  }

  private newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-c200-${this.#seq.toString(16).padStart(12, '0')}`;
  }
}

export function istanbulDateKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
