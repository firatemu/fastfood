import { Inject, Injectable, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';

export interface AdminCustomerListItem {
  userId: string;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  status: string;
  createdAt: string | null;
  pointsBalance?: string;
}

@Injectable()
export class AdminCustomerService {
  readonly #customers: AdminCustomerListItem[] = [];

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
    @Optional() @Inject(LoyaltyService) private readonly loyalty: LoyaltyService | null = null,
  ) {}

  /** Unit-test helper — seeds in-memory customers without Prisma. */
  static createForTest(
    loyalty: LoyaltyService,
    seed: AdminCustomerListItem[],
  ): AdminCustomerService {
    const svc = new AdminCustomerService(null, loyalty);
    svc.#customers.push(...seed);
    return svc;
  }

  async list(limit = 50, branchId?: string): Promise<AdminCustomerListItem[]> {
    if (!this.prisma) {
      if (branchId) return [];
      return this.#customers.slice(0, limit);
    }
    const branchUserIds = branchId
      ? (
          await this.prisma.order.findMany({
            where: { branchId, userId: { not: null } },
            select: { userId: true },
            distinct: ['userId'],
          })
        ).flatMap((order) => (order.userId ? [order.userId] : []))
      : undefined;
    if (branchUserIds && branchUserIds.length === 0) return [];
    const rows = await this.prisma.customerProfile.findMany({
      where: branchUserIds ? { userId: { in: branchUserIds } } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((c) => ({
      userId: c.userId,
      phone: c.phoneNormalized,
      phoneVerified: c.phoneVerified,
      email: c.emailNormalized,
      emailVerified: c.emailVerified,
      displayName: c.user.displayName,
      status: c.user.status,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async get(userId: string, branchId?: string): Promise<AdminCustomerListItem | null> {
    if (branchId && this.prisma) {
      const order = await this.prisma.order.findFirst({
        where: { userId, branchId },
        select: { id: true },
      });
      if (!order) return null;
    } else if (branchId) {
      return null;
    }
    let base: AdminCustomerListItem | null = null;
    if (!this.prisma) {
      base = this.#customers.find((c) => c.userId === userId) ?? null;
    } else {
      const c = await this.prisma.customerProfile.findUnique({
        where: { userId },
        include: { user: true },
      });
      if (!c) return null;
      base = {
        userId: c.userId,
        phone: c.phoneNormalized,
        phoneVerified: c.phoneVerified,
        email: c.emailNormalized,
        emailVerified: c.emailVerified,
        displayName: c.user.displayName,
        status: c.user.status,
        createdAt: c.createdAt.toISOString(),
      };
    }
    if (!base) return null;
    if (this.loyalty) {
      const points = await this.loyalty.getBalance(userId);
      return { ...base, pointsBalance: points.toString() };
    }
    return { ...base, pointsBalance: '0' };
  }
}
