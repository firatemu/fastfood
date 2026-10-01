import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { BranchService, type ServiceAreaDto } from '../branch/branch.service.js';
import { RoutingService } from '../branch/routing/routing.service.js';
import { NotificationService } from '../notification/notification.service.js';

import { OrderOutboxService } from './order-outbox.service.js';
import {
  KITCHEN_BOARD_STATUSES,
  ORDER_STATUSES,
  canTransition,
  type OrderStatus,
  TERMINAL_STATUSES,
} from './order-state-machine.js';

/**
 * Increments a SP-prefixed display number (e.g. SP00007 → SP00008) and
 * clamps to the five-digit range. Falls back to SP00001 when the latest
 * number cannot be parsed.
 */
export function bumpDisplayNumber(latest: string | null | undefined): string {
  const fallback = 'SP00001';
  if (!latest) return fallback;
  const match = /^SP(\d{1,})$/u.exec(latest.trim().toUpperCase());
  if (!match || !match[1]) return fallback;
  const current = Number(match[1]);
  if (!Number.isFinite(current)) return fallback;
  const next = current + 1;
  if (next > 99_999) {
    throw new Error(`Order displayNumber overflow (latest=${latest}).`);
  }
  return `SP${next.toString().padStart(5, '0')}`;
}

export interface OrderItemModifierDto {
  modifierId: string;
  nameSnapshot: string;
  priceDeltaMinorSnapshot: bigint;
}

export interface OrderItemRemovalDto {
  ingredientId: string;
  nameSnapshot: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productVariantId: string | null;
  productNameSnapshot: string;
  quantity: number;
  unitPriceMinorSnapshot: bigint;
  lineGrossMinorSnapshot: bigint;
  modifiers: OrderItemModifierDto[];
  removals: OrderItemRemovalDto[];
}

export interface OrderEventDto {
  id: string;
  orderId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  payloadJson: Record<string, unknown> | null;
  createdAt: Date;
}

export interface OrderBranchAssignmentDto {
  id: string;
  orderId: string;
  branchId: string;
  reason: string | null;
  assignedBy: string | null;
  createdAt: Date;
}

export interface OrderDto {
  id: string;
  displayNumber: string;
  userId: string | null;
  branchId: string | null;
  checkoutSessionId: string | null;
  status: OrderStatus;
  currency: string;
  merchandiseNetMinor: bigint;
  deliveryFeeMinor: bigint;
  loyaltyRedeemedMinor: bigint;
  finalPayableMinor: bigint;
  fulfillmentMode: 'DELIVERY' | 'PICKUP';
  scheduledFor: Date | null;
  tipMinor: bigint;
  pickupDiscountMinor: bigint;
  ecoPackaging: boolean;
  contactless: boolean;
  buildingAccessCode: string | null;
  deliveryNote: string | null;
  deliveryAddressJson: {
    latitude: number;
    longitude: number;
    line1?: string;
  } | null;
  items: OrderItemDto[];
  events: OrderEventDto[];
  branchAssignments: OrderBranchAssignmentDto[];
  customer?: {
    userId: string;
    displayName: string | null;
    phone: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  userId?: string | null;
  checkoutSessionId?: string | null;
  currency?: string;
  merchandiseNetMinor: bigint;
  deliveryFeeMinor?: bigint;
  loyaltyRedeemedMinor?: bigint;
  finalPayableMinor: bigint;
  deliveryAddress?: {
    latitude: number;
    longitude: number;
    line1?: string;
  } | null;
  items: {
    productId: string;
    productVariantId?: string | null;
    productNameSnapshot: string;
    quantity: number;
    unitPriceMinorSnapshot: bigint;
    lineGrossMinorSnapshot: bigint;
    modifiers?: OrderItemModifierDto[];
    removals?: OrderItemRemovalDto[];
  }[];
  autoAssignBranch?: boolean;
  branchId?: string | null;
  initialStatus?: OrderStatus;
  actorUserId?: string | null;
  fulfillmentMode?: 'DELIVERY' | 'PICKUP';
  scheduledFor?: Date | null;
  tipMinor?: bigint;
  pickupDiscountMinor?: bigint;
  ecoPackaging?: boolean;
  contactless?: boolean;
  buildingAccessCode?: string | null;
  deliveryNote?: string | null;
}

export interface TransitionOrderInput {
  toStatus: OrderStatus;
  actorUserId?: string | null;
  reason?: string;
}

export interface OrderListFilters {
  branchId?: string;
  statuses?: readonly OrderStatus[];
  fulfillmentMode?: 'DELIVERY' | 'PICKUP';
  createdFrom?: Date;
  createdTo?: Date;
  minMinor?: bigint;
  maxMinor?: bigint;
  query?: string;
  cursor?: string;
  limit?: number;
}

export interface OrderListPage {
  rows: OrderDto[];
  nextCursor: string | null;
  total: number;
}

export interface OrderSummaryDto {
  counts: Record<OrderStatus, number>;
  kpis: {
    activeCount: number;
    prepCount: number;
    deliveredToday: number;
    grossTodayMinor: bigint;
    refundsTodayMinor: bigint;
    avgTicketMinor: bigint;
    cancellationRateBps: number;
  };
}

const ORDER_INCLUDE = {
  items: { include: { modifiers: true, removals: true } },
  events: { orderBy: { createdAt: 'asc' as const } },
  branchAssignments: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class OrderService {
  readonly #orders = new Map<string, OrderDto>();
  readonly #byUser = new Map<string, string[]>();
  #seq = 0;

  constructor(
    @Optional()
    @Inject(OrderOutboxService)
    private readonly outbox: OrderOutboxService | null = null,
    @Optional() @Inject(RoutingService) private readonly routing: RoutingService | null = null,
    @Optional() @Inject(BranchService) private readonly branches: BranchService | null = null,
    @Optional()
    @Inject(NotificationService)
    private readonly notifications: NotificationService | null = null,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-a000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  #mapRow(
    row: {
      id: string;
      userId: string | null;
      branchId: string | null;
      checkoutSessionId: string | null;
      status: string;
      currency: string;
      merchandiseNetMinor: bigint;
      deliveryFeeMinor: bigint;
      loyaltyRedeemedMinor: bigint;
      finalPayableMinor: bigint;
      displayNumber?: string | null;
      fulfillmentMode?: string;
      scheduledFor?: Date | null;
      tipMinor?: bigint;
      pickupDiscountMinor?: bigint;
      ecoPackaging?: boolean;
      contactless?: boolean;
      buildingAccessCode?: string | null;
      deliveryNote?: string | null;
      deliveryAddressJson: unknown;
      createdAt: Date;
      updatedAt: Date;
      items: Array<{
        id: string;
        productId: string;
        productVariantId: string | null;
        productNameSnapshot: string;
        quantity: number;
        unitPriceMinorSnapshot: bigint;
        lineGrossMinorSnapshot: bigint;
        modifiers: Array<{
          modifierId: string;
          nameSnapshot: string;
          priceDeltaMinorSnapshot: bigint;
        }>;
        removals: Array<{ ingredientId: string; nameSnapshot: string }>;
      }>;
      events: Array<{
        id: string;
        orderId: string;
        eventType: string;
        fromStatus: string | null;
        toStatus: string | null;
        actorUserId: string | null;
        payloadJson: unknown;
        createdAt: Date;
      }>;
      branchAssignments: Array<{
        id: string;
        orderId: string;
        branchId: string;
        reason: string | null;
        assignedBy: string | null;
        createdAt: Date;
      }>;
    },
    user?: { displayName: string | null; primaryIdentifier: string | null } | null,
    modifierMap?: Map<string, { name: string; priceDeltaMinor: bigint }>,
  ): OrderDto {
    return {
      id: row.id,
      displayNumber: row.displayNumber ?? '',
      userId: row.userId,
      branchId: row.branchId,
      checkoutSessionId: row.checkoutSessionId,
      status: row.status as OrderStatus,
      currency: row.currency,
      merchandiseNetMinor: row.merchandiseNetMinor,
      deliveryFeeMinor: row.deliveryFeeMinor,
      loyaltyRedeemedMinor: row.loyaltyRedeemedMinor,
      finalPayableMinor: row.finalPayableMinor,
      fulfillmentMode: row.fulfillmentMode === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
      scheduledFor: row.scheduledFor ?? null,
      tipMinor: row.tipMinor ?? 0n,
      pickupDiscountMinor: row.pickupDiscountMinor ?? 0n,
      ecoPackaging: Boolean(row.ecoPackaging),
      contactless: Boolean(row.contactless),
      buildingAccessCode: row.buildingAccessCode ?? null,
      deliveryNote: row.deliveryNote ?? null,
      deliveryAddressJson: (row.deliveryAddressJson as OrderDto['deliveryAddressJson']) ?? null,
      items: row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        unitPriceMinorSnapshot: item.unitPriceMinorSnapshot,
        lineGrossMinorSnapshot: item.lineGrossMinorSnapshot,
        modifiers: item.modifiers.map((m) => ({
          ...m,
          nameSnapshot:
            m.nameSnapshot && m.nameSnapshot.length > 0
              ? m.nameSnapshot
              : (modifierMap?.get(m.modifierId)?.name ?? 'Modifiye'),
          priceDeltaMinorSnapshot:
            m.priceDeltaMinorSnapshot && m.priceDeltaMinorSnapshot !== 0n
              ? m.priceDeltaMinorSnapshot
              : (modifierMap?.get(m.modifierId)?.priceDeltaMinor ?? 0n),
        })),
        removals: item.removals.map((r) => ({ ...r })),
      })),
      events: row.events.map((e) => ({
        id: e.id,
        orderId: e.orderId,
        eventType: e.eventType,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actorUserId: e.actorUserId,
        payloadJson: (e.payloadJson as Record<string, unknown> | null) ?? null,
        createdAt: e.createdAt,
      })),
      branchAssignments: row.branchAssignments.map((a) => ({ ...a })),
      customer: user
        ? {
            userId: row.userId ?? '',
            displayName: user.displayName ?? null,
            phone: user.primaryIdentifier ?? null,
          }
        : row.userId
          ? { userId: row.userId, displayName: null, phone: null }
          : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(input: CreateOrderInput): Promise<OrderDto> {
    if (!this.prisma) {
      return this.#createMemory(input);
    }
    const status: OrderStatus = input.initialStatus ?? 'CREATED';
    const displayNumber = await this.#nextDisplayNumber();
    const row = await this.prisma.order.create({
      data: {
        userId: input.userId ?? null,
        branchId: input.branchId ?? null,
        checkoutSessionId: input.checkoutSessionId ?? null,
        displayNumber,
        status,
        currency: input.currency ?? 'TRY',
        merchandiseNetMinor: input.merchandiseNetMinor,
        deliveryFeeMinor: input.deliveryFeeMinor ?? 0n,
        loyaltyRedeemedMinor: input.loyaltyRedeemedMinor ?? 0n,
        finalPayableMinor: input.finalPayableMinor,
        fulfillmentMode: input.fulfillmentMode ?? 'DELIVERY',
        scheduledFor: input.scheduledFor ?? null,
        tipMinor: input.tipMinor ?? 0n,
        pickupDiscountMinor: input.pickupDiscountMinor ?? 0n,
        ecoPackaging: input.ecoPackaging ?? false,
        contactless: input.contactless ?? false,
        buildingAccessCode: input.buildingAccessCode ?? null,
        deliveryNote: input.deliveryNote ?? null,
        deliveryAddressJson: (input.deliveryAddress ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            productVariantId: item.productVariantId ?? null,
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            unitPriceMinorSnapshot: item.unitPriceMinorSnapshot,
            lineGrossMinorSnapshot: item.lineGrossMinorSnapshot,
            modifiers: {
              create: (item.modifiers ?? []).map((m) => ({
                modifierId: m.modifierId,
                nameSnapshot: m.nameSnapshot,
                priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
              })),
            },
            removals: {
              create: (item.removals ?? []).map((r) => ({
                ingredientId: r.ingredientId,
                nameSnapshot: r.nameSnapshot,
              })),
            },
          })),
        },
        events: {
          create: [
            {
              eventType: 'OrderCreated',
              fromStatus: null,
              toStatus: status,
              actorUserId: input.actorUserId ?? input.userId ?? null,
              payloadJson: {
                checkoutSessionId: input.checkoutSessionId ?? null,
              } as Prisma.InputJsonValue,
            },
          ],
        },
      },
      include: ORDER_INCLUDE,
    });
    let order = this.#mapRow(row);
    const shouldAutoAssign = input.autoAssignBranch !== false && !order.branchId;
    if (shouldAutoAssign) {
      order = await this.assignBranchAutomatically(
        order.id,
        input.actorUserId ?? input.userId ?? null,
      );
    } else if (order.branchId) {
      await this.#recordBranchAssignmentDb(
        order.id,
        order.branchId,
        'explicit',
        input.actorUserId ?? null,
      );
      if (order.status === 'PAID' || order.status === 'CREATED') {
        order = await this.#setStatusDb(order.id, 'BRANCH_ASSIGNED', input.actorUserId ?? null, {
          reason: 'explicit_branch',
        });
      } else {
        order = await this.get(order.id);
      }
    }
    return order;
  }

  /**
   * Returns the next short human-readable order number in the SP##### form
   * by looking at the highest existing number. Used by both the Prisma
   * path (live database) and the in-memory fallback.
   */
  async #nextDisplayNumber(): Promise<string> {
    if (!this.prisma) return this.#nextDisplayNumberMemory();
    const latest = await this.prisma.order.findFirst({
      where: { displayNumber: { startsWith: 'SP' } },
      orderBy: { displayNumber: 'desc' },
      select: { displayNumber: true },
    });
    return bumpDisplayNumber(latest?.displayNumber ?? null);
  }

  #nextDisplayNumberMemory(): string {
    const highest = [...this.#orders.values()]
      .map((order) => order.displayNumber)
      .filter((value): value is string => typeof value === 'string')
      .reduce<string | null>((max, current) => (max && max >= current ? max : current), null);
    return bumpDisplayNumber(highest);
  }

  async #createMemory(input: CreateOrderInput): Promise<OrderDto> {
    const now = new Date();
    const id = this.#newId();
    const status: OrderStatus = input.initialStatus ?? 'CREATED';
    const displayNumber = this.#nextDisplayNumberMemory();
    const order: OrderDto = {
      id,
      displayNumber,
      userId: input.userId ?? null,
      branchId: input.branchId ?? null,
      checkoutSessionId: input.checkoutSessionId ?? null,
      status,
      currency: input.currency ?? 'TRY',
      merchandiseNetMinor: input.merchandiseNetMinor,
      deliveryFeeMinor: input.deliveryFeeMinor ?? 0n,
      loyaltyRedeemedMinor: input.loyaltyRedeemedMinor ?? 0n,
      finalPayableMinor: input.finalPayableMinor,
      fulfillmentMode: input.fulfillmentMode ?? 'DELIVERY',
      scheduledFor: input.scheduledFor ?? null,
      tipMinor: input.tipMinor ?? 0n,
      pickupDiscountMinor: input.pickupDiscountMinor ?? 0n,
      ecoPackaging: input.ecoPackaging ?? false,
      contactless: input.contactless ?? false,
      buildingAccessCode: input.buildingAccessCode ?? null,
      deliveryNote: input.deliveryNote ?? null,
      deliveryAddressJson: input.deliveryAddress ?? null,
      items: input.items.map((item) => ({
        id: this.#newId(),
        productId: item.productId,
        productVariantId: item.productVariantId ?? null,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        unitPriceMinorSnapshot: item.unitPriceMinorSnapshot,
        lineGrossMinorSnapshot: item.lineGrossMinorSnapshot,
        modifiers: item.modifiers ?? [],
        removals: item.removals ?? [],
      })),
      events: [
        {
          id: this.#newId(),
          orderId: id,
          eventType: 'OrderCreated',
          fromStatus: null,
          toStatus: status,
          actorUserId: input.actorUserId ?? input.userId ?? null,
          payloadJson: { checkoutSessionId: input.checkoutSessionId ?? null },
          createdAt: now,
        },
      ],
      branchAssignments: [],
      createdAt: now,
      updatedAt: now,
    };
    this.#orders.set(id, order);
    if (order.userId) {
      const list = this.#byUser.get(order.userId) ?? [];
      list.push(id);
      this.#byUser.set(order.userId, list);
    }
    const shouldAutoAssign = input.autoAssignBranch !== false && !order.branchId;
    if (shouldAutoAssign) {
      return this.assignBranchAutomatically(id, input.actorUserId ?? input.userId ?? null);
    }
    if (order.branchId) {
      this.#recordBranchAssignmentMemory(
        order,
        order.branchId,
        'explicit',
        input.actorUserId ?? null,
      );
      if (order.status === 'PAID' || order.status === 'CREATED') {
        await this.#setStatusMemory(order, 'BRANCH_ASSIGNED', input.actorUserId ?? null, {
          reason: 'explicit_branch',
        });
      }
    }
    return this.#clone(order);
  }

  async get(orderId: string): Promise<OrderDto> {
    if (!this.prisma) {
      const order = this.#orders.get(orderId);
      if (!order) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Order not found.',
        });
      }
      return this.#clone(order);
    }
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Order not found.',
      });
    }
    return this.#mapRowWithHydration(row);
  }

  async getByCheckoutSessionId(checkoutSessionId: string): Promise<OrderDto | null> {
    if (!this.prisma) {
      for (const order of this.#orders.values()) {
        if (order.checkoutSessionId === checkoutSessionId) return this.#clone(order);
      }
      return null;
    }
    const row = await this.prisma.order.findUnique({
      where: { checkoutSessionId },
      include: ORDER_INCLUDE,
    });
    return row ? this.#mapRowWithHydration(row) : null;
  }

  async #mapRowWithHydration(row: {
    id: string;
    userId: string | null;
    branchId: string | null;
    checkoutSessionId: string | null;
    status: string;
    currency: string;
    merchandiseNetMinor: bigint;
    deliveryFeeMinor: bigint;
    loyaltyRedeemedMinor: bigint;
    finalPayableMinor: bigint;
    displayNumber?: string | null;
    fulfillmentMode?: string;
    scheduledFor?: Date | null;
    tipMinor?: bigint;
    pickupDiscountMinor?: bigint;
    ecoPackaging?: boolean;
    contactless?: boolean;
    buildingAccessCode?: string | null;
    deliveryNote?: string | null;
    deliveryAddressJson: unknown;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      productId: string;
      productVariantId: string | null;
      productNameSnapshot: string;
      quantity: number;
      unitPriceMinorSnapshot: bigint;
      lineGrossMinorSnapshot: bigint;
      modifiers: Array<{
        modifierId: string;
        nameSnapshot: string;
        priceDeltaMinorSnapshot: bigint;
      }>;
      removals: Array<{ ingredientId: string; nameSnapshot: string }>;
    }>;
    events: Array<{
      id: string;
      orderId: string;
      eventType: string;
      fromStatus: string | null;
      toStatus: string | null;
      actorUserId: string | null;
      payloadJson: unknown;
      createdAt: Date;
    }>;
    branchAssignments: Array<{
      id: string;
      orderId: string;
      branchId: string;
      reason: string | null;
      assignedBy: string | null;
      createdAt: Date;
    }>;
  }): Promise<OrderDto> {
    if (!this.prisma) return this.#mapRow(row as never);
    const missingModifierIds = Array.from(
      new Set(
        row.items.flatMap((item) =>
          item.modifiers
            .filter((mod) => !mod.nameSnapshot || mod.nameSnapshot.length === 0)
            .map((mod) => mod.modifierId),
        ),
      ),
    );
    const modifierMap =
      missingModifierIds.length > 0
        ? new Map(
            (
              await this.prisma.modifier.findMany({
                where: { id: { in: missingModifierIds } },
                select: { id: true, name: true, priceDeltaMinor: true },
              })
            ).map((row_) => [row_.id, row_]),
          )
        : undefined;
    return this.#mapRow(row as never, undefined, modifierMap);
  }

  async listByUser(userId: string): Promise<OrderDto[]> {
    if (!this.prisma) {
      const ids = this.#byUser.get(userId) ?? [];
      return Promise.all(ids.map((id) => this.get(id)));
    }
    const rows = await this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.#mapRow(r));
  }

  async listByBranch(branchId: string, statuses?: readonly OrderStatus[]): Promise<OrderDto[]> {
    if (!this.prisma) {
      const allowed = statuses ? new Set(statuses) : null;
      return [...this.#orders.values()]
        .filter((o) => o.branchId === branchId)
        .filter((o) => (allowed ? allowed.has(o.status) : true))
        .map((o) => this.#clone(o));
    }
    const rows = await this.prisma.order.findMany({
      where: {
        branchId,
        ...(statuses ? { status: { in: [...statuses] } } : {}),
      },
      include: ORDER_INCLUDE,
    });
    return rows.map((r) => this.#mapRow(r));
  }

  async listWithFilters(filters: OrderListFilters): Promise<OrderListPage> {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    if (!this.prisma) {
      const allowed = filters.statuses ? new Set(filters.statuses) : null;
      const q = filters.query?.trim().toLowerCase() ?? '';
      const filtered = [...this.#orders.values()]
        .filter((o) => !filters.branchId || o.branchId === filters.branchId)
        .filter((o) => (allowed ? allowed.has(o.status) : true))
        .filter((o) =>
          filters.fulfillmentMode ? o.fulfillmentMode === filters.fulfillmentMode : true,
        )
        .filter((o) =>
          filters.createdFrom ? o.createdAt.getTime() >= filters.createdFrom.getTime() : true,
        )
        .filter((o) =>
          filters.createdTo ? o.createdAt.getTime() <= filters.createdTo.getTime() : true,
        )
        .filter((o) =>
          filters.minMinor !== undefined ? o.finalPayableMinor >= filters.minMinor : true,
        )
        .filter((o) =>
          filters.maxMinor !== undefined ? o.finalPayableMinor <= filters.maxMinor : true,
        )
        .filter((o) => {
          if (!q) return true;
          return (
            o.id.toLowerCase().includes(q) ||
            (o.userId ?? '').toLowerCase().includes(q) ||
            (o.checkoutSessionId ?? '').toLowerCase().includes(q)
          );
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const total = filtered.length;
      const startIndex = filters.cursor
        ? filtered.findIndex((o) => o.id === filters.cursor) + 1
        : 0;
      const slice = filtered.slice(startIndex, startIndex + limit);
      const nextCursor = startIndex + limit < total ? (slice[slice.length - 1]?.id ?? null) : null;
      return { rows: slice.map((o) => this.#clone(o)), nextCursor, total };
    }
    const where: Record<string, unknown> = filters.branchId ? { branchId: filters.branchId } : {};
    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: [...filters.statuses] };
    }
    if (filters.fulfillmentMode) {
      where.fulfillmentMode = filters.fulfillmentMode;
    }
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {
        ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
        ...(filters.createdTo ? { lte: filters.createdTo } : {}),
      };
    }
    if (filters.minMinor !== undefined || filters.maxMinor !== undefined) {
      where.finalPayableMinor = {
        ...(filters.minMinor !== undefined ? { gte: filters.minMinor } : {}),
        ...(filters.maxMinor !== undefined ? { lte: filters.maxMinor } : {}),
      };
    }
    const q = filters.query?.trim();
    if (q) {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { userId: { contains: q, mode: 'insensitive' } },
        { checkoutSessionId: { contains: q, mode: 'insensitive' } },
      ];
    }
    const cursor = filters.cursor ? { id: filters.cursor } : undefined;
    const skip = filters.cursor ? 1 : 0;
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor, skip } : {}),
      }),
      this.prisma.order.count({ where }),
    ]);
    const userIds = Array.from(
      new Set(rows.map((row) => row.userId).filter((value): value is string => Boolean(value))),
    );
    const userRows =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, displayName: true, primaryIdentifier: true },
          })
        : [];
    const userMap = new Map(userRows.map((row) => [row.id, row]));
    const modifierIds = Array.from(
      new Set(
        rows.flatMap((row) =>
          row.items.flatMap((item) =>
            item.modifiers
              .filter((mod) => !mod.nameSnapshot || mod.nameSnapshot.length === 0)
              .map((mod) => mod.modifierId),
          ),
        ),
      ),
    );
    const modifierRows =
      modifierIds.length > 0
        ? await this.prisma.modifier.findMany({
            where: { id: { in: modifierIds } },
            select: { id: true, name: true, priceDeltaMinor: true },
          })
        : [];
    const modifierMap = new Map(modifierRows.map((row) => [row.id, row]));
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;
    return {
      rows: page.map((r) => this.#mapRow(r, userMap.get(r.userId ?? ''), modifierMap)),
      nextCursor,
      total,
    };
  }

  async summaryByBranch(branchId: string, now: Date = new Date()): Promise<OrderSummaryDto> {
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    const baseCounts = (): Record<OrderStatus, number> => {
      const map = {} as Record<OrderStatus, number>;
      for (const status of ORDER_STATUSES) map[status] = 0;
      return map;
    };
    const activeStatuses = new Set<OrderStatus>([
      'PAYMENT_PENDING',
      'PAID',
      'BRANCH_ASSIGNED',
      'PREPARING',
      'READY_FOR_COURIER',
      'COURIER_ASSIGNED',
      'PICKED_UP',
      'ON_THE_WAY',
      'REFUND_PENDING',
      'PARTIALLY_REFUNDED',
    ]);
    const prepStatuses = new Set<OrderStatus>(['PREPARING', 'READY_FOR_COURIER']);
    const cancelledStatuses = new Set<OrderStatus>(['CANCELLED', 'REJECTED']);
    if (!this.prisma) {
      const orders = [...this.#orders.values()].filter((o) => o.branchId === branchId);
      const counts = baseCounts();
      let grossToday = 0n;
      let refundsToday = 0n;
      let ticketSum = 0n;
      let ticketCount = 0;
      let activeCount = 0;
      let prepCount = 0;
      let deliveredToday = 0;
      let cancelledCount = 0;
      for (const order of orders) {
        counts[order.status] = (counts[order.status] ?? 0) + 1;
        if (activeStatuses.has(order.status)) activeCount += 1;
        if (prepStatuses.has(order.status)) prepCount += 1;
        if (cancelledStatuses.has(order.status)) cancelledCount += 1;
        const inDay = order.createdAt >= startOfDay && order.createdAt < endOfDay;
        if (inDay) {
          if (order.status === 'DELIVERED' || order.status === 'PAID') {
            grossToday += order.finalPayableMinor;
          }
          if (order.status === 'DELIVERED') {
            deliveredToday += 1;
            ticketSum += order.finalPayableMinor;
            ticketCount += 1;
          }
          if (
            order.status === 'REFUNDED' ||
            order.status === 'PARTIALLY_REFUNDED' ||
            order.status === 'REFUND_PENDING'
          ) {
            refundsToday += order.finalPayableMinor;
          }
        }
      }
      const cancellationRateBps =
        orders.length === 0 ? 0 : Math.round((cancelledCount * 10000) / orders.length);
      return {
        counts,
        kpis: {
          activeCount,
          prepCount,
          deliveredToday,
          grossTodayMinor: grossToday,
          refundsTodayMinor: refundsToday,
          avgTicketMinor: ticketCount === 0 ? 0n : ticketSum / BigInt(ticketCount),
          cancellationRateBps,
        },
      };
    }
    const [allRows, todayRows] = await Promise.all([
      this.prisma.order.findMany({
        where: { branchId },
        select: { status: true },
      }),
      this.prisma.order.findMany({
        where: {
          branchId,
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
        select: {
          status: true,
          finalPayableMinor: true,
        },
      }),
    ]);
    const counts = baseCounts();
    let activeCount = 0;
    let prepCount = 0;
    let cancelledCount = 0;
    for (const row of allRows) {
      const status = row.status as OrderStatus;
      counts[status] = (counts[status] ?? 0) + 1;
      if (activeStatuses.has(status)) activeCount += 1;
      if (prepStatuses.has(status)) prepCount += 1;
      if (cancelledStatuses.has(status)) cancelledCount += 1;
    }
    let grossToday = 0n;
    let refundsToday = 0n;
    let ticketSum = 0n;
    let ticketCount = 0;
    let deliveredToday = 0;
    for (const row of todayRows) {
      const status = row.status as OrderStatus;
      if (status === 'DELIVERED' || status === 'PAID') grossToday += row.finalPayableMinor;
      if (status === 'DELIVERED') {
        deliveredToday += 1;
        ticketSum += row.finalPayableMinor;
        ticketCount += 1;
      }
      if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED' || status === 'REFUND_PENDING') {
        refundsToday += row.finalPayableMinor;
      }
    }
    const cancellationRateBps =
      allRows.length === 0 ? 0 : Math.round((cancelledCount * 10000) / allRows.length);
    return {
      counts,
      kpis: {
        activeCount,
        prepCount,
        deliveredToday,
        grossTodayMinor: grossToday,
        refundsTodayMinor: refundsToday,
        avgTicketMinor: ticketCount === 0 ? 0n : ticketSum / BigInt(ticketCount),
        cancellationRateBps,
      },
    };
  }

  async listKitchenBoard(branchId: string): Promise<OrderDto[]> {
    const orders = await this.listByBranch(branchId, [...KITCHEN_BOARD_STATUSES]);
    if (!this.prisma) return orders;

    const modifierIds = Array.from(
      new Set(
        orders.flatMap((order) =>
          order.items.flatMap((item) =>
            item.modifiers
              .filter(
                (modifier) => !modifier.nameSnapshot.trim() || modifier.nameSnapshot === 'Modifiye',
              )
              .map((modifier) => modifier.modifierId),
          ),
        ),
      ),
    );
    const removalIds = Array.from(
      new Set(
        orders.flatMap((order) =>
          order.items.flatMap((item) =>
            item.removals
              .filter((removal) => !removal.nameSnapshot.trim())
              .map((removal) => removal.ingredientId),
          ),
        ),
      ),
    );
    if (modifierIds.length === 0 && removalIds.length === 0) return orders;

    const [modifierRows, removalRows] = await Promise.all([
      this.prisma.modifier.findMany({
        where: { id: { in: modifierIds } },
        select: { id: true, name: true },
      }),
      this.prisma.ingredientRemovalOption.findMany({
        where: { id: { in: removalIds } },
        select: { id: true, name: true },
      }),
    ]);
    const modifierNames = new Map(modifierRows.map((row) => [row.id, row.name]));
    const removalNames = new Map(removalRows.map((row) => [row.id, row.name]));

    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        modifiers: item.modifiers.map((modifier) => ({
          ...modifier,
          nameSnapshot:
            !modifier.nameSnapshot.trim() || modifier.nameSnapshot === 'Modifiye'
              ? (modifierNames.get(modifier.modifierId) ?? modifier.nameSnapshot)
              : modifier.nameSnapshot,
        })),
        removals: item.removals.map((removal) => ({
          ...removal,
          nameSnapshot: removal.nameSnapshot.trim()
            ? removal.nameSnapshot
            : (removalNames.get(removal.ingredientId) ?? removal.nameSnapshot),
        })),
      })),
    }));
  }

  async timeline(orderId: string): Promise<OrderEventDto[]> {
    return (await this.get(orderId)).events;
  }

  async transition(orderId: string, input: TransitionOrderInput): Promise<OrderDto> {
    const order = await this.get(orderId);
    if (!canTransition(order.status, input.toStatus)) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_INVALID_TRANSITION,
        message: `Cannot transition order from ${order.status} to ${input.toStatus}.`,
      });
    }
    if (TERMINAL_STATUSES.has(order.status) && input.toStatus !== 'REFUND_PENDING') {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_INVALID_TRANSITION,
        message: `Order is in terminal status ${order.status}.`,
      });
    }
    if (!this.prisma) {
      const mutable = this.#orders.get(orderId);
      if (!mutable) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found.' });
      }
      await this.#setStatusMemory(mutable, input.toStatus, input.actorUserId ?? null, {
        reason: input.reason ?? null,
      });
      return this.#clone(mutable);
    }
    return this.#setStatusDb(orderId, input.toStatus, input.actorUserId ?? null, {
      reason: input.reason ?? null,
    });
  }

  async assignBranchAutomatically(
    orderId: string,
    actorUserId: string | null = null,
  ): Promise<OrderDto> {
    const order = await this.get(orderId);
    if (!order.deliveryAddressJson) {
      throw new BadRequestException({
        code: ErrorCodes.ADDRESS_LOCATION_REQUIRED,
        message: 'Delivery coordinates are required for branch assignment.',
      });
    }
    if (!this.routing || !this.branches) {
      throw new BadRequestException({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Routing dependencies are not available.',
      });
    }
    const serviceAreas: ServiceAreaDto[] = await this.branches.listServiceAreas();
    const assignment = this.routing.assignOrThrow(
      order.deliveryAddressJson.latitude,
      order.deliveryAddressJson.longitude,
      serviceAreas,
    );
    const previous = order.branchId;
    if (!this.prisma) {
      const mutable = this.#orders.get(orderId);
      if (!mutable) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found.' });
      }
      mutable.branchId = assignment.branchId;
      this.#recordBranchAssignmentMemory(
        mutable,
        assignment.branchId,
        'automatic_routing',
        actorUserId,
      );
      void this.outbox?.enqueueBranchAssigned({
        orderId: mutable.id,
        branchId: assignment.branchId,
        previousBranchId: previous,
        reason: 'automatic_routing',
        actorUserId,
      });
      if (mutable.status === 'PAID' || mutable.status === 'CREATED') {
        await this.#setStatusMemory(mutable, 'BRANCH_ASSIGNED', actorUserId, {
          reason: 'automatic_routing',
        });
      }
      mutable.updatedAt = new Date();
      return this.#clone(mutable);
    }
    await this.prisma.order.update({
      where: { id: orderId },
      data: { branchId: assignment.branchId },
    });
    await this.#recordBranchAssignmentDb(
      orderId,
      assignment.branchId,
      'automatic_routing',
      actorUserId,
    );
    void this.outbox?.enqueueBranchAssigned({
      orderId,
      branchId: assignment.branchId,
      previousBranchId: previous,
      reason: 'automatic_routing',
      actorUserId,
    });
    if (order.status === 'PAID' || order.status === 'CREATED') {
      return this.#setStatusDb(orderId, 'BRANCH_ASSIGNED', actorUserId, {
        reason: 'automatic_routing',
      });
    }
    return this.get(orderId);
  }

  async reassignBranch(
    orderId: string,
    branchId: string,
    input: { actorUserId?: string | null; reason?: string } = {},
  ): Promise<OrderDto> {
    const order = await this.get(orderId);
    if (TERMINAL_STATUSES.has(order.status)) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_BRANCH_REASSIGNMENT_NOT_ALLOWED,
        message: `Cannot reassign branch for order in status ${order.status}.`,
      });
    }
    if (order.status === 'PICKED_UP' || order.status === 'ON_THE_WAY') {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_BRANCH_REASSIGNMENT_NOT_ALLOWED,
        message: 'Cannot reassign branch after courier pickup.',
      });
    }
    const previous = order.branchId;
    if (previous === branchId) {
      return order;
    }
    const reason = input.reason ?? 'manual_reassignment';
    if (!this.prisma) {
      const mutable = this.#orders.get(orderId);
      if (!mutable) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found.' });
      }
      mutable.branchId = branchId;
      this.#recordBranchAssignmentMemory(mutable, branchId, reason, input.actorUserId ?? null);
      void this.outbox?.enqueueBranchAssigned({
        orderId: mutable.id,
        branchId,
        previousBranchId: previous,
        reason,
        actorUserId: input.actorUserId ?? null,
      });
      mutable.events.push({
        id: this.#newId(),
        orderId: mutable.id,
        eventType: 'OrderBranchReassigned',
        fromStatus: mutable.status,
        toStatus: mutable.status,
        actorUserId: input.actorUserId ?? null,
        payloadJson: { previousBranchId: previous, branchId, reason },
        createdAt: new Date(),
      });
      if (
        mutable.status === 'PAID' ||
        mutable.status === 'CREATED' ||
        mutable.status === 'BRANCH_ASSIGNED'
      ) {
        if (mutable.status !== 'BRANCH_ASSIGNED') {
          await this.#setStatusMemory(mutable, 'BRANCH_ASSIGNED', input.actorUserId ?? null, {
            reason,
          });
        }
      }
      mutable.updatedAt = new Date();
      return this.#clone(mutable);
    }
    await this.prisma.order.update({ where: { id: orderId }, data: { branchId } });
    await this.#recordBranchAssignmentDb(orderId, branchId, reason, input.actorUserId ?? null);
    await this.prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'OrderBranchReassigned',
        fromStatus: order.status,
        toStatus: order.status,
        actorUserId: input.actorUserId ?? null,
        payloadJson: { previousBranchId: previous, branchId, reason } as Prisma.InputJsonValue,
      },
    });
    void this.outbox?.enqueueBranchAssigned({
      orderId,
      branchId,
      previousBranchId: previous,
      reason,
      actorUserId: input.actorUserId ?? null,
    });
    if (
      order.status === 'PAID' ||
      order.status === 'CREATED' ||
      order.status === 'BRANCH_ASSIGNED'
    ) {
      if (order.status !== 'BRANCH_ASSIGNED') {
        return this.#setStatusDb(orderId, 'BRANCH_ASSIGNED', input.actorUserId ?? null, { reason });
      }
    }
    return this.get(orderId);
  }

  async #setStatusMemory(
    order: OrderDto,
    toStatus: OrderStatus,
    actorUserId: string | null,
    meta: { reason?: string | null } = {},
  ): Promise<void> {
    const from = order.status;
    order.status = toStatus;
    order.updatedAt = new Date();
    order.events.push({
      id: this.#newId(),
      orderId: order.id,
      eventType: 'OrderStatusChanged',
      fromStatus: from,
      toStatus,
      actorUserId,
      payloadJson: meta.reason ? { reason: meta.reason } : null,
      createdAt: order.updatedAt,
    });
    void this.outbox?.enqueueStatusChanged({
      orderId: order.id,
      fromStatus: from,
      toStatus,
      actorUserId,
    });
    void this.notifyCustomerStatus(order.userId, order.id, toStatus);
  }

  async #setStatusDb(
    orderId: string,
    toStatus: OrderStatus,
    actorUserId: string | null,
    meta: { reason?: string | null } = {},
  ): Promise<OrderDto> {
    if (!this.prisma) {
      throw new Error('Prisma is required for #setStatusDb');
    }
    const prisma = this.prisma;
    const current = await this.get(orderId);
    const from = current.status;
    await prisma.order.update({
      where: { id: orderId },
      data: { status: toStatus },
    });
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'OrderStatusChanged',
        fromStatus: from,
        toStatus,
        actorUserId,
        payloadJson: (meta.reason ? { reason: meta.reason } : undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
    void this.outbox?.enqueueStatusChanged({
      orderId,
      fromStatus: from,
      toStatus,
      actorUserId,
    });
    void this.notifyCustomerStatus(current.userId, orderId, toStatus);
    return this.get(orderId);
  }

  #recordBranchAssignmentMemory(
    order: OrderDto,
    branchId: string,
    reason: string | null,
    assignedBy: string | null,
  ): void {
    order.branchAssignments.push({
      id: this.#newId(),
      orderId: order.id,
      branchId,
      reason,
      assignedBy,
      createdAt: new Date(),
    });
  }

  async #recordBranchAssignmentDb(
    orderId: string,
    branchId: string,
    reason: string | null,
    assignedBy: string | null,
  ): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma is required for #recordBranchAssignmentDb');
    }
    await this.prisma.orderBranchAssignment.create({
      data: { orderId, branchId, reason, assignedBy },
    });
  }

  private async notifyCustomerStatus(
    userId: string | null,
    orderId: string,
    status: OrderStatus,
  ): Promise<void> {
    if (!userId || !this.notifications) return;
    const templateKey = customerOrderTemplate(status);
    if (!templateKey) return;
    await this.notifications.enqueueAndSend({
      userId,
      channel: 'IN_APP',
      templateKey,
      payloadJson: {
        title: 'Sipariş güncellemesi',
        body: customerOrderBody(status),
        href: `/orders/${orderId}`,
        orderId,
      },
    });
  }

  #clone(order: OrderDto): OrderDto {
    return {
      ...order,
      items: order.items.map((i) => ({
        ...i,
        modifiers: [...i.modifiers],
        removals: [...i.removals],
      })),
      events: order.events.map((e) => ({ ...e })),
      branchAssignments: order.branchAssignments.map((a) => ({ ...a })),
      deliveryAddressJson: order.deliveryAddressJson ? { ...order.deliveryAddressJson } : null,
    };
  }
}

function customerOrderTemplate(status: OrderStatus): string | null {
  if (status === 'PAID' || status === 'BRANCH_ASSIGNED') {
    return 'order.confirmed';
  }
  if (status === 'PREPARING') return 'order.preparing';
  if (status === 'READY_FOR_COURIER') return 'order.ready';
  if (status === 'COURIER_ASSIGNED' || status === 'PICKED_UP' || status === 'ON_THE_WAY') {
    return 'order.courier_assigned';
  }
  if (status === 'DELIVERED') return 'order.delivered';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'order.cancelled';
  return null;
}

function customerOrderBody(status: OrderStatus): string {
  if (status === 'PREPARING') return 'Siparişin ızgarada.';
  if (status === 'READY_FOR_COURIER') return 'Siparişin teslime hazır.';
  if (status === 'COURIER_ASSIGNED' || status === 'ON_THE_WAY' || status === 'PICKED_UP') {
    return 'Kurye siparişinle ilgileniyor.';
  }
  if (status === 'DELIVERED') return 'Siparişin teslim edildi.';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'Siparişin iptal edildi.';
  return 'Siparişin onaylandı.';
}
