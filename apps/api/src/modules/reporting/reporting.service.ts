import { Inject, Injectable, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

export interface SalesReportRow {
  day: string;
  orderCount: number;
  grossMinor: bigint;
  refundedMinor: bigint;
  netMinor: bigint;
}

export interface BranchReportRow {
  branchId: string;
  orderCount: number;
  grossMinor: bigint;
}

export interface ProductReportRow {
  productId: string;
  quantity: number;
  grossMinor: bigint;
}

export interface CourierReportRow {
  courierId: string;
  deliveredCount: number;
  activeCount: number;
}

export interface BranchReportRange {
  from: Date;
  to: Date;
}

/**
 * Reporting aggregations from Order / PaymentAttempt / Refund / Delivery.
 */
@Injectable()
export class ReportingService {
  readonly #sales: SalesReportRow[] = [];
  readonly #branches: BranchReportRow[] = [];
  readonly #products: ProductReportRow[] = [];
  readonly #couriers: CourierReportRow[] = [];

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  seedDev(): void {
    if (this.#sales.length > 0) return;
    this.#sales.push({
      day: '2026-09-18',
      orderCount: 12,
      grossMinor: 180000n,
      refundedMinor: 5000n,
      netMinor: 175000n,
    });
    this.#branches.push({
      branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
      orderCount: 12,
      grossMinor: 180000n,
    });
    this.#products.push({
      productId: 'p-burger',
      quantity: 20,
      grossMinor: 150000n,
    });
    this.#couriers.push({
      courierId: '01900000-0000-7000-c000-000000000001',
      deliveredCount: 8,
      activeCount: 1,
    });
  }

  async sales(branchIds?: ReadonlySet<string>): Promise<SalesReportRow[]> {
    if (branchIds && branchIds.size === 0) return [];
    if (!this.prisma) {
      this.seedDev();
      if (branchIds && !branchIds.has('01900000-0000-7000-8000-faaaaaaaaaaa')) return [];
      return this.#sales.map((r) => ({ ...r }));
    }
    const orders = await this.prisma.order.findMany({
      where: branchIds ? { branchId: { in: [...branchIds] } } : undefined,
      select: { id: true, branchId: true, createdAt: true, finalPayableMinor: true },
    });
    const refunds = await this.prisma.refund.findMany({
      where: {
        status: { not: 'FAILED' },
        ...(branchIds ? { orderId: { in: orders.map((order) => order.id) } } : {}),
      },
      select: { createdAt: true, amountMinor: true },
    });
    const byDay = new Map<string, SalesReportRow>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const row = byDay.get(day) ?? {
        day,
        orderCount: 0,
        grossMinor: 0n,
        refundedMinor: 0n,
        netMinor: 0n,
      };
      row.orderCount += 1;
      row.grossMinor += o.finalPayableMinor;
      byDay.set(day, row);
    }
    for (const r of refunds) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const row = byDay.get(day) ?? {
        day,
        orderCount: 0,
        grossMinor: 0n,
        refundedMinor: 0n,
        netMinor: 0n,
      };
      row.refundedMinor += r.amountMinor;
      byDay.set(day, row);
    }
    return [...byDay.values()]
      .map((r) => ({ ...r, netMinor: r.grossMinor - r.refundedMinor }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  async branches(
    range?: BranchReportRange,
    branchIds?: ReadonlySet<string>,
  ): Promise<BranchReportRow[]> {
    if (branchIds && branchIds.size === 0) return [];
    if (!this.prisma) {
      this.seedDev();
      // The in-memory fixture has no order timestamps, so it cannot answer a
      // requested date range without fabricating a result.
      if (range) return [];
      return this.#branches
        .filter((r) => !branchIds || branchIds.has(r.branchId))
        .map((r) => ({ ...r }));
    }
    if (range) {
      const grouped = await this.prisma.order.groupBy({
        by: ['branchId'],
        where: {
          branchId: branchIds ? { in: [...branchIds] } : { not: null },
          createdAt: { gte: range.from, lt: range.to },
        },
        _count: { _all: true },
        _sum: { finalPayableMinor: true },
      });
      return grouped.flatMap((row) =>
        row.branchId
          ? [
              {
                branchId: row.branchId,
                orderCount: row._count._all,
                grossMinor: row._sum.finalPayableMinor ?? 0n,
              },
            ]
          : [],
      );
    }
    const orders = await this.prisma.order.findMany({
      where: {
        branchId: { not: null, ...(branchIds ? { in: [...branchIds] } : {}) },
      },
      select: { branchId: true, finalPayableMinor: true },
    });
    const byBranch = new Map<string, BranchReportRow>();
    for (const o of orders) {
      if (!o.branchId) continue;
      const row = byBranch.get(o.branchId) ?? {
        branchId: o.branchId,
        orderCount: 0,
        grossMinor: 0n,
      };
      row.orderCount += 1;
      row.grossMinor += o.finalPayableMinor;
      byBranch.set(o.branchId, row);
    }
    return [...byBranch.values()];
  }

  async products(branchIds?: ReadonlySet<string>): Promise<ProductReportRow[]> {
    if (branchIds && branchIds.size === 0) return [];
    if (!this.prisma) {
      this.seedDev();
      if (branchIds && !branchIds.has('01900000-0000-7000-8000-faaaaaaaaaaa')) return [];
      return this.#products.map((r) => ({ ...r }));
    }
    const items = await this.prisma.orderItem.findMany({
      where: branchIds ? { order: { branchId: { in: [...branchIds] } } } : undefined,
      select: {
        productId: true,
        quantity: true,
        lineGrossMinorSnapshot: true,
      },
    });
    const byProduct = new Map<string, ProductReportRow>();
    for (const item of items) {
      const row = byProduct.get(item.productId) ?? {
        productId: item.productId,
        quantity: 0,
        grossMinor: 0n,
      };
      row.quantity += item.quantity;
      row.grossMinor += item.lineGrossMinorSnapshot;
      byProduct.set(item.productId, row);
    }
    return [...byProduct.values()];
  }

  async couriers(branchIds?: ReadonlySet<string>): Promise<CourierReportRow[]> {
    if (branchIds && branchIds.size === 0) return [];
    if (!this.prisma) {
      this.seedDev();
      if (branchIds && !branchIds.has('01900000-0000-7000-8000-faaaaaaaaaaa')) return [];
      return this.#couriers.map((r) => ({ ...r }));
    }
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        courierId: { not: null },
        ...(branchIds ? { branchId: { in: [...branchIds] } } : {}),
      },
      select: { courierId: true, status: true },
    });
    const byCourier = new Map<string, CourierReportRow>();
    for (const d of deliveries) {
      if (!d.courierId) continue;
      const row = byCourier.get(d.courierId) ?? {
        courierId: d.courierId,
        deliveredCount: 0,
        activeCount: 0,
      };
      if (d.status === 'DELIVERED') row.deliveredCount += 1;
      if (d.status === 'ASSIGNED' || d.status === 'PICKED_UP' || d.status === 'ON_THE_WAY') {
        row.activeCount += 1;
      }
      byCourier.set(d.courierId, row);
    }
    return [...byCourier.values()];
  }
}
