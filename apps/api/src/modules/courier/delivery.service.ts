import { createHash, randomBytes } from 'node:crypto';

import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { OrderService } from '../order/order.service.js';

import {
  ACTIVE_DELIVERY_STATUSES,
  canDeliveryTransition,
  type DeliveryStatus,
} from './delivery-state-machine.js';

export interface CourierProfileDto {
  id: string;
  userId: string;
  displayName: string;
  phone: string | null;
  isActive: boolean;
  maxActiveDeliveries: number;
}

export interface DeliveryAssignmentDto {
  id: string;
  deliveryId: string;
  courierId: string;
  assignedBy: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface DeliveryBranchSummaryDto {
  id: string;
  code?: string;
  name: string;
  addressLine: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface DeliveryOrderItemSummaryDto {
  id: string;
  productName: string;
  quantity: number;
  modifiers?: string[];
  removals?: string[];
}

export interface DeliveryOrderSummaryDto {
  displayNumber: string;
  status: string;
  fulfillmentMode: string;
  scheduledFor: string | null;
  contactless: boolean;
  ecoPackaging: boolean;
  buildingAccessCode: string | null;
  deliveryNote: string | null;
  currency: string;
  finalPayableMinor: string;
  tipMinor: string;
  itemCount: number;
  items: DeliveryOrderItemSummaryDto[];
}

export interface DeliveryLatestLocationDto {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: Date;
}

export interface CourierMeBranchDto {
  id: string;
  code?: string;
  name: string;
  addressLine: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

export interface CourierMeProfileDto {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  phone: string | null;
  isActive: boolean;
  maxActiveDeliveries: number;
  activeDeliveriesCount: number;
  availableCapacitySlots: number;
  branches: CourierMeBranchDto[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeliveryDto {
  id: string;
  orderId: string;
  branchId: string;
  courierId: string | null;
  status: DeliveryStatus;
  recipientName: string | null;
  recipientPhone: string | null;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryNote: string | null;
  branch?: DeliveryBranchSummaryDto;
  order?: DeliveryOrderSummaryDto;
  latestLocation?: DeliveryLatestLocationDto | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  assignments: DeliveryAssignmentDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QrClaimTokenDto {
  id: string;
  deliveryId: string;
  token: string;
  expiresAt: Date;
}

export interface CourierLocationPointDto {
  id: string;
  courierId: string;
  deliveryId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: Date;
}

export interface CreateDeliveryInput {
  orderId: string;
  branchId: string;
  recipientName?: string;
  recipientPhone?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  deliveryNote?: string;
}

const DELIVERY_INCLUDE = {
  assignments: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class DeliveryService {
  readonly #couriers = new Map<string, CourierProfileDto>();
  readonly #byUser = new Map<string, string>();
  readonly #deliveries = new Map<string, DeliveryDto>();
  readonly #qrByHash = new Map<
    string,
    { deliveryId: string; expiresAt: Date; claimedAt: Date | null; claimedBy: string | null }
  >();
  readonly #locations: CourierLocationPointDto[] = [];
  #seq = 0;

  constructor(
    @Optional() @Inject(OrderService) private readonly orders: OrderService | null = null,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #newId(prefix = 'c'): string {
    this.#seq += 1;
    const hex = this.#seq.toString(16).padStart(12, '0').slice(0, 12);
    return `01900000-0000-7000-${prefix}000-${hex}`;
  }

  #mapDelivery(row: {
    id: string;
    orderId: string;
    branchId: string;
    courierId: string | null;
    status: string;
    recipientName: string | null;
    recipientPhone: string | null;
    addressLine: string | null;
    latitude: number | null;
    longitude: number | null;
    deliveryNote: string | null;
    pickedUpAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    assignments: Array<{
      id: string;
      deliveryId: string;
      courierId: string;
      assignedBy: string | null;
      reason: string | null;
      createdAt: Date;
    }>;
  }): DeliveryDto {
    return {
      id: row.id,
      orderId: row.orderId,
      branchId: row.branchId,
      courierId: row.courierId,
      status: row.status as DeliveryStatus,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      addressLine: row.addressLine,
      latitude: row.latitude,
      longitude: row.longitude,
      deliveryNote: row.deliveryNote,
      pickedUpAt: row.pickedUpAt,
      deliveredAt: row.deliveredAt,
      assignments: row.assignments.map((a) => ({ ...a })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Seeds the in-memory roster used when the API runs without a database.
   *
   * This is *not* how couriers are created: provisioning a real account —
   * username, password and the branch roster — belongs to
   * `CourierAdminService`, which owns the `users` / `staff_profiles` /
   * `courier_profiles` / `courier_branches` write. Reaching the database
   * from here would produce a courier that cannot sign in.
   */
  async registerCourier(input: {
    userId: string;
    displayName: string;
    phone?: string;
    maxActiveDeliveries?: number;
  }): Promise<CourierProfileDto> {
    if (this.prisma) throw new Error('DATABASE_REQUIRED');
    const existing = this.#byUser.get(input.userId);
    if (existing) return this.getCourier(existing);
    const id = this.#newId('c');
    const profile: CourierProfileDto = {
      id,
      userId: input.userId,
      displayName: input.displayName,
      phone: input.phone ?? null,
      isActive: true,
      maxActiveDeliveries: input.maxActiveDeliveries ?? 3,
    };
    this.#couriers.set(id, profile);
    this.#byUser.set(input.userId, id);
    return this.#cloneCourier(profile);
  }

  async getCourier(courierId: string): Promise<CourierProfileDto> {
    if (!this.prisma) {
      const c = this.#couriers.get(courierId);
      if (!c) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Courier not found.' });
      }
      return this.#cloneCourier(c);
    }
    const c = await this.prisma.courierProfile.findUnique({ where: { id: courierId } });
    if (!c) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Courier not found.' });
    }
    return {
      id: c.id,
      userId: c.userId,
      displayName: c.displayName,
      phone: c.phone,
      isActive: c.isActive,
      maxActiveDeliveries: c.maxActiveDeliveries,
    };
  }

  async getCourierByUser(userId: string): Promise<CourierProfileDto | null> {
    if (!this.prisma) {
      const id = this.#byUser.get(userId);
      return id ? this.getCourier(id) : null;
    }
    const c = await this.prisma.courierProfile.findUnique({ where: { userId } });
    if (!c) return null;
    return {
      id: c.id,
      userId: c.userId,
      displayName: c.displayName,
      phone: c.phone,
      isActive: c.isActive,
      maxActiveDeliveries: c.maxActiveDeliveries,
    };
  }

  async listCouriers(branchId?: string): Promise<CourierProfileDto[]> {
    if (!this.prisma) {
      const branchCourierIds = branchId
        ? new Set(
            [...this.#deliveries.values()]
              .filter((delivery) => delivery.branchId === branchId)
              .flatMap((delivery) => [
                ...(delivery.courierId ? [delivery.courierId] : []),
                ...delivery.assignments.map((assignment) => assignment.courierId),
              ]),
          )
        : null;
      return [...this.#couriers.values()]
        .filter((courier) => !branchCourierIds || branchCourierIds.has(courier.id))
        .map((courier) => this.#cloneCourier(courier));
    }
    const rows = await this.prisma.courierProfile.findMany({
      where: branchId ? { branchScopes: { some: { branchId } } } : undefined,
    });
    return rows.map((c) => ({
      id: c.id,
      userId: c.userId,
      displayName: c.displayName,
      phone: c.phone,
      isActive: c.isActive,
      maxActiveDeliveries: c.maxActiveDeliveries,
    }));
  }

  async isCourierLinkedToBranch(courierId: string, branchId: string): Promise<boolean> {
    if (!this.prisma) {
      return [...this.#deliveries.values()].some(
        (delivery) =>
          delivery.branchId === branchId &&
          (delivery.courierId === courierId ||
            delivery.assignments.some((assignment) => assignment.courierId === courierId)),
      );
    }
    const assignment = await this.prisma.courierBranch.findUnique({
      where: { courierId_branchId: { courierId, branchId } },
      select: { courierId: true },
    });
    return assignment !== null;
  }

  async createDelivery(input: CreateDeliveryInput): Promise<DeliveryDto> {
    if (!this.prisma) {
      const now = new Date();
      const delivery: DeliveryDto = {
        id: this.#newId('d'),
        orderId: input.orderId,
        branchId: input.branchId,
        courierId: null,
        status: 'UNASSIGNED',
        recipientName: input.recipientName ?? null,
        recipientPhone: input.recipientPhone ?? null,
        addressLine: input.addressLine ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        deliveryNote: input.deliveryNote ?? null,
        pickedUpAt: null,
        deliveredAt: null,
        assignments: [],
        createdAt: now,
        updatedAt: now,
      };
      this.#deliveries.set(delivery.id, delivery);
      return this.#clone(delivery);
    }
    const row = await this.prisma.delivery.create({
      data: {
        orderId: input.orderId,
        branchId: input.branchId,
        status: 'UNASSIGNED',
        recipientName: input.recipientName ?? null,
        recipientPhone: input.recipientPhone ?? null,
        addressLine: input.addressLine ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        deliveryNote: input.deliveryNote ?? null,
      },
      include: DELIVERY_INCLUDE,
    });
    return this.#mapDelivery(row);
  }

  async get(deliveryId: string): Promise<DeliveryDto> {
    if (!this.prisma) {
      const d = this.#deliveries.get(deliveryId);
      if (!d) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Delivery not found.' });
      }
      const [enriched] = await this.#enrichDeliveries([this.#clone(d)]);
      return enriched ?? this.#clone(d);
    }
    const d = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: DELIVERY_INCLUDE,
    });
    if (!d) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Delivery not found.' });
    }
    const [enriched] = await this.#enrichDeliveries([this.#mapDelivery(d)]);
    return enriched ?? this.#mapDelivery(d);
  }

  async getByOrderId(orderId: string): Promise<DeliveryDto | null> {
    if (!this.prisma) {
      for (const delivery of this.#deliveries.values()) {
        if (delivery.orderId === orderId) return this.#clone(delivery);
      }
      return null;
    }
    const row = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: DELIVERY_INCLUDE,
    });
    return row ? this.#mapDelivery(row) : null;
  }

  async getLatestLocation(deliveryId: string): Promise<CourierLocationPointDto | null> {
    if (!this.prisma) {
      const points = this.#locations.filter((point) => point.deliveryId === deliveryId);
      if (points.length === 0) return null;
      return [...points].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0] ?? null;
    }
    const row = await this.prisma.courierLocationPoint.findFirst({
      where: { deliveryId },
      orderBy: { recordedAt: 'desc' },
    });
    if (!row) return null;
    return {
      id: row.id,
      courierId: row.courierId,
      deliveryId: row.deliveryId,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyM: row.accuracyM,
      recordedAt: row.recordedAt,
    };
  }

  async listForCourier(courierId: string): Promise<DeliveryDto[]> {
    if (!this.prisma) {
      const list = [...this.#deliveries.values()]
        .filter((d) => d.courierId === courierId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map((d) => this.#clone(d));
      return this.#enrichDeliveries(list);
    }
    const rows = await this.prisma.delivery.findMany({
      where: { courierId },
      include: DELIVERY_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return this.#enrichDeliveries(rows.map((r) => this.#mapDelivery(r)));
  }

  async listUnassigned(branchId?: string): Promise<DeliveryDto[]> {
    if (!this.prisma) {
      const list = [...this.#deliveries.values()]
        .filter((d) => d.status === 'UNASSIGNED')
        .filter((d) => (branchId ? d.branchId === branchId : true))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((d) => this.#clone(d));
      return this.#enrichDeliveries(list);
    }
    const rows = await this.prisma.delivery.findMany({
      where: {
        status: 'UNASSIGNED',
        ...(branchId ? { branchId } : {}),
      },
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return this.#enrichDeliveries(rows.map((r) => this.#mapDelivery(r)));
  }

  async listAvailableForCourier(courierId: string): Promise<DeliveryDto[]> {
    await this.getCourier(courierId);
    if (!this.prisma) {
      return this.listUnassigned();
    }
    const scopes = this.prisma.courierBranch
      ? await this.prisma.courierBranch.findMany({
          where: { courierId },
          select: { branchId: true },
        })
      : [];
    const branchIds = scopes.map((scope) => scope.branchId);
    const rows = await this.prisma.delivery.findMany({
      where: {
        status: 'UNASSIGNED',
        ...(branchIds.length > 0 ? { branchId: { in: branchIds } } : {}),
      },
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return this.#enrichDeliveries(rows.map((r) => this.#mapDelivery(r)));
  }

  async getCourierMeProfile(courierId: string): Promise<CourierMeProfileDto> {
    if (!this.prisma) {
      const courier = await this.getCourier(courierId);
      const activeDeliveriesCount = [...this.#deliveries.values()].filter(
        (d) => d.courierId === courierId && ACTIVE_DELIVERY_STATUSES.has(d.status),
      ).length;
      return {
        ...courier,
        username: courier.userId,
        activeDeliveriesCount,
        availableCapacitySlots: Math.max(0, courier.maxActiveDeliveries - activeDeliveriesCount),
        branches: [],
      };
    }

    const row = await this.prisma.courierProfile.findUnique({
      where: { id: courierId },
      include: {
        branchScopes: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                addressLine: true,
                phone: true,
                latitude: true,
                longitude: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Courier not found.' });
    }
    const [user, activeDeliveriesCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: row.userId },
        select: { primaryIdentifier: true },
      }),
      this.prisma.delivery.count({
        where: {
          courierId: row.id,
          status: { in: [...ACTIVE_DELIVERY_STATUSES] },
        },
      }),
    ]);

    return {
      id: row.id,
      userId: row.userId,
      username: user?.primaryIdentifier ?? row.displayName,
      displayName: row.displayName,
      phone: row.phone,
      isActive: row.isActive,
      maxActiveDeliveries: row.maxActiveDeliveries,
      activeDeliveriesCount,
      availableCapacitySlots: Math.max(0, row.maxActiveDeliveries - activeDeliveriesCount),
      branches: row.branchScopes.map((scope) => ({
        id: scope.branch.id,
        code: scope.branch.code,
        name: scope.branch.name,
        addressLine: scope.branch.addressLine,
        phone: scope.branch.phone,
        latitude: scope.branch.latitude != null ? Number(scope.branch.latitude) : null,
        longitude: scope.branch.longitude != null ? Number(scope.branch.longitude) : null,
        isPrimary: scope.isPrimary,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async assign(
    deliveryId: string,
    courierId: string,
    input: { assignedBy?: string | null; reason?: string } = {},
  ): Promise<DeliveryDto> {
    const courier = await this.getCourier(courierId);
    if (!courier.isActive) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Courier is not active.',
      });
    }
    await this.#assertCapacity(courierId);
    const delivery = await this.get(deliveryId);
    if (delivery.status !== 'UNASSIGNED' && delivery.status !== 'ASSIGNED') {
      throw new BadRequestException({
        code: ErrorCodes.DELIVERY_ALREADY_ASSIGNED,
        message: `Cannot assign delivery in status ${delivery.status}.`,
      });
    }
    if (!this.prisma) {
      const mutable = this.#deliveries.get(deliveryId);
      if (!mutable) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Delivery not found.' });
      }
      mutable.courierId = courierId;
      mutable.status = 'ASSIGNED';
      mutable.assignments.push({
        id: this.#newId('a'),
        deliveryId: mutable.id,
        courierId,
        assignedBy: input.assignedBy ?? null,
        reason: input.reason ?? 'manual_assign',
        createdAt: new Date(),
      });
      mutable.updatedAt = new Date();
      await this.#syncOrder(mutable, 'COURIER_ASSIGNED', input.assignedBy ?? null);
      return this.#clone(mutable);
    }
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { courierId, status: 'ASSIGNED' },
    });
    await this.prisma.deliveryAssignment.create({
      data: {
        deliveryId,
        courierId,
        assignedBy: input.assignedBy ?? null,
        reason: input.reason ?? 'manual_assign',
      },
    });
    const result = await this.get(deliveryId);
    await this.#syncOrder(result, 'COURIER_ASSIGNED', input.assignedBy ?? null);
    return result;
  }

  async reassign(
    deliveryId: string,
    courierId: string,
    input: { assignedBy?: string | null; reason?: string } = {},
  ): Promise<DeliveryDto> {
    const delivery = await this.get(deliveryId);
    if (
      delivery.status === 'PICKED_UP' ||
      delivery.status === 'ON_THE_WAY' ||
      delivery.status === 'DELIVERED'
    ) {
      throw new BadRequestException({
        code: ErrorCodes.DELIVERY_ALREADY_ASSIGNED,
        message: 'Cannot reassign after pickup.',
      });
    }
    if (delivery.status === 'CANCELLED') {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_INVALID_TRANSITION,
        message: 'Cannot reassign a cancelled delivery.',
      });
    }
    if (!this.prisma) {
      const mutable = this.#deliveries.get(deliveryId);
      if (!mutable) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Delivery not found.' });
      }
      mutable.status = 'UNASSIGNED';
      mutable.courierId = null;
    } else {
      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: 'UNASSIGNED', courierId: null },
      });
    }
    return this.assign(deliveryId, courierId, {
      assignedBy: input.assignedBy,
      reason: input.reason ?? 'manual_reassign',
    });
  }

  async issueQrClaimToken(deliveryId: string, ttlMs = 15 * 60 * 1000): Promise<QrClaimTokenDto> {
    const delivery = await this.get(deliveryId);
    if (delivery.status !== 'UNASSIGNED' && delivery.status !== 'ASSIGNED') {
      throw new BadRequestException({
        code: ErrorCodes.QR_CLAIM_INVALID,
        message: 'Delivery is not eligible for QR claim.',
      });
    }
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + ttlMs);
    if (!this.prisma) {
      this.#qrByHash.set(tokenHash, {
        deliveryId: delivery.id,
        expiresAt,
        claimedAt: null,
        claimedBy: null,
      });
      return { id: this.#newId('q'), deliveryId: delivery.id, token, expiresAt };
    }
    const row = await this.prisma.qrClaimToken.create({
      data: { deliveryId: delivery.id, tokenHash, expiresAt },
    });
    return { id: row.id, deliveryId: delivery.id, token, expiresAt };
  }

  async claimByQr(rawToken: string, courierId: string): Promise<DeliveryDto> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    let deliveryId: string;
    if (!this.prisma) {
      const record = this.#qrByHash.get(tokenHash);
      if (!record) {
        throw new BadRequestException({
          code: ErrorCodes.QR_CLAIM_INVALID,
          message: 'QR claim token is invalid.',
        });
      }
      if (record.claimedAt) {
        throw new ConflictException({
          code: ErrorCodes.DELIVERY_ALREADY_ASSIGNED,
          message: 'QR claim token already used.',
        });
      }
      if (record.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException({
          code: ErrorCodes.QR_CLAIM_INVALID,
          message: 'QR claim token expired.',
        });
      }
      deliveryId = record.deliveryId;
      record.claimedAt = new Date();
      record.claimedBy = courierId;
    } else {
      const record = await this.prisma.qrClaimToken.findUnique({ where: { tokenHash } });
      if (!record) {
        throw new BadRequestException({
          code: ErrorCodes.QR_CLAIM_INVALID,
          message: 'QR claim token is invalid.',
        });
      }
      if (record.claimedAt) {
        throw new ConflictException({
          code: ErrorCodes.DELIVERY_ALREADY_ASSIGNED,
          message: 'QR claim token already used.',
        });
      }
      if (record.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException({
          code: ErrorCodes.QR_CLAIM_INVALID,
          message: 'QR claim token expired.',
        });
      }
      deliveryId = record.deliveryId;
      await this.prisma.qrClaimToken.update({
        where: { id: record.id },
        data: { claimedAt: new Date(), claimedByCourierId: courierId },
      });
    }
    const courier = await this.getCourier(courierId);
    if (!courier.isActive) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
        message: 'Courier is not active.',
      });
    }
    await this.#assertCapacity(courierId);
    const delivery = await this.get(deliveryId);
    if (delivery.courierId && delivery.courierId !== courierId) {
      throw new ConflictException({
        code: ErrorCodes.DELIVERY_ALREADY_ASSIGNED,
        message: 'Delivery already assigned.',
      });
    }
    if (delivery.status !== 'UNASSIGNED' && delivery.status !== 'ASSIGNED') {
      throw new BadRequestException({
        code: ErrorCodes.QR_CLAIM_INVALID,
        message: 'Delivery is not eligible for QR claim.',
      });
    }
    return this.assign(delivery.id, courierId, { reason: 'qr_claim', assignedBy: courier.userId });
  }

  async pickup(deliveryId: string, courierId: string): Promise<DeliveryDto> {
    return this.#courierTransition(deliveryId, courierId, 'PICKED_UP', async (d) => {
      if (!this.prisma) {
        d.pickedUpAt = new Date();
      } else {
        await this.prisma.delivery.update({
          where: { id: deliveryId },
          data: { pickedUpAt: new Date() },
        });
      }
      await this.#syncOrder(d, 'PICKED_UP', null);
    });
  }

  async onTheWay(deliveryId: string, courierId: string): Promise<DeliveryDto> {
    return this.#courierTransition(deliveryId, courierId, 'ON_THE_WAY', async (d) => {
      await this.#syncOrder(d, 'ON_THE_WAY', null);
    });
  }

  async deliver(deliveryId: string, courierId: string): Promise<DeliveryDto> {
    return this.#courierTransition(deliveryId, courierId, 'DELIVERED', async (d) => {
      if (!this.prisma) {
        d.deliveredAt = new Date();
      } else {
        await this.prisma.delivery.update({
          where: { id: deliveryId },
          data: { deliveredAt: new Date() },
        });
      }
      await this.#syncOrder(d, 'DELIVERED', null);
    });
  }

  async recordLocation(input: {
    courierId: string;
    deliveryId: string;
    latitude: number;
    longitude: number;
    accuracyM?: number;
  }): Promise<CourierLocationPointDto> {
    const delivery = await this.get(input.deliveryId);
    if (delivery.courierId !== input.courierId) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'Courier does not own this delivery.',
      });
    }
    if (!ACTIVE_DELIVERY_STATUSES.has(delivery.status)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Location updates require an active delivery.',
      });
    }
    if (!this.prisma) {
      const point: CourierLocationPointDto = {
        id: this.#newId('l'),
        courierId: input.courierId,
        deliveryId: input.deliveryId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyM: input.accuracyM ?? null,
        recordedAt: new Date(),
      };
      this.#locations.push(point);
      return { ...point };
    }
    const row = await this.prisma.courierLocationPoint.create({
      data: {
        courierId: input.courierId,
        deliveryId: input.deliveryId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyM: input.accuracyM ?? null,
      },
    });
    return {
      id: row.id,
      courierId: row.courierId,
      deliveryId: row.deliveryId,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyM: row.accuracyM,
      recordedAt: row.recordedAt,
    };
  }

  async performance(courierId: string): Promise<{
    courierId: string;
    deliveredCount: number;
    activeCount: number;
    assignedCount: number;
    cancelledCount: number;
    todayDeliveredCount: number;
    avgDeliveryMinutes: number | null;
    completionRatePercent: number;
    maxActiveDeliveries: number;
    totalTipMinor: string;
  }> {
    const all = this.prisma
      ? await this.prisma.delivery.findMany({ where: { courierId } })
      : [...this.#deliveries.values()].filter((d) => d.courierId === courierId);
    const courierProfile = this.prisma
      ? await this.prisma.courierProfile.findUnique({
          where: { id: courierId },
          select: { maxActiveDeliveries: true },
        })
      : (this.#couriers.get(courierId) ?? null);
    const maxActiveDeliveries = courierProfile?.maxActiveDeliveries ?? 3;

    const deliveredRows = all.filter((d) => d.status === 'DELIVERED');
    const cancelledCount = all.filter((d) => d.status === 'CANCELLED').length;
    const activeCount = all.filter((d) =>
      ACTIVE_DELIVERY_STATUSES.has(d.status as DeliveryStatus),
    ).length;

    const istanbulDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayKey = istanbulDateFormatter.format(new Date());
    const todayDeliveredCount = deliveredRows.filter(
      (d) => d.deliveredAt != null && istanbulDateFormatter.format(d.deliveredAt) === todayKey,
    ).length;

    const durationsMs = deliveredRows
      .map((d) => {
        if (!d.deliveredAt) return null;
        const start = d.pickedUpAt ?? d.createdAt;
        const diff = d.deliveredAt.getTime() - start.getTime();
        return diff >= 0 ? diff : null;
      })
      .filter((ms): ms is number => ms !== null);
    const avgDeliveryMinutes =
      durationsMs.length > 0
        ? Math.round((durationsMs.reduce((acc, ms) => acc + ms, 0) / durationsMs.length / 60_000) * 10) /
          10
        : null;

    const finishedCount = deliveredRows.length + cancelledCount;
    const completionRatePercent =
      finishedCount > 0 ? Math.round((deliveredRows.length / finishedCount) * 100) : 0;

    let totalTipMinor = 0n;
    if (this.prisma && deliveredRows.length > 0 && this.prisma.order) {
      const orders = await this.prisma.order.findMany({
        where: { id: { in: deliveredRows.map((d) => d.orderId) } },
        select: { tipMinor: true },
      });
      for (const order of orders) {
        totalTipMinor += order.tipMinor;
      }
    }

    return {
      courierId,
      deliveredCount: deliveredRows.length,
      activeCount,
      assignedCount: all.length,
      cancelledCount,
      todayDeliveredCount,
      avgDeliveryMinutes,
      completionRatePercent,
      maxActiveDeliveries,
      totalTipMinor: totalTipMinor.toString(),
    };
  }

  async mapsNavigationUrl(deliveryId: string): Promise<string> {
    const d = await this.get(deliveryId);
    if (d.latitude == null || d.longitude == null) {
      throw new BadRequestException({
        code: ErrorCodes.ADDRESS_LOCATION_REQUIRED,
        message: 'Delivery coordinates required for navigation.',
      });
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`;
  }

  async #courierTransition(
    deliveryId: string,
    courierId: string,
    to: DeliveryStatus,
    after: (d: DeliveryDto) => Promise<void>,
  ): Promise<DeliveryDto> {
    const delivery = await this.get(deliveryId);
    if (delivery.courierId !== courierId) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'Courier does not own this delivery.',
      });
    }
    if (!canDeliveryTransition(delivery.status, to)) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_INVALID_TRANSITION,
        message: `Cannot transition delivery from ${delivery.status} to ${to}.`,
      });
    }
    if (!this.prisma) {
      const mutable = this.#deliveries.get(deliveryId);
      if (!mutable) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Delivery not found.' });
      }
      mutable.status = to;
      mutable.updatedAt = new Date();
      await after(mutable);
      const [enriched] = await this.#enrichDeliveries([this.#clone(mutable)]);
      return enriched ?? this.#clone(mutable);
    }
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: to },
    });
    const result = await this.get(deliveryId);
    await after(result);
    return this.get(deliveryId);
  }

  async #enrichDeliveries(deliveries: DeliveryDto[]): Promise<DeliveryDto[]> {
    if (deliveries.length === 0) return [];

    if (!this.prisma) {
      return deliveries.map((delivery) => {
        const points = this.#locations.filter((point) => point.deliveryId === delivery.id);
        const latest = [...points].sort(
          (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
        )[0];
        return {
          ...delivery,
          latestLocation: latest
            ? {
                latitude: latest.latitude,
                longitude: latest.longitude,
                accuracyM: latest.accuracyM,
                recordedAt: latest.recordedAt,
              }
            : null,
        };
      });
    }

    const branchIds = [...new Set(deliveries.map((d) => d.branchId).filter(Boolean))];
    const orderIds = [...new Set(deliveries.map((d) => d.orderId).filter(Boolean))];
    const deliveryIds = deliveries.map((d) => d.id);

    const [branches, orders, locations] = await Promise.all([
      branchIds.length > 0 && this.prisma.branch
        ? this.prisma.branch.findMany({
            where: { id: { in: branchIds } },
            select: {
              id: true,
              code: true,
              name: true,
              addressLine: true,
              phone: true,
              latitude: true,
              longitude: true,
            },
          })
        : Promise.resolve([]),
      orderIds.length > 0 && this.prisma.order
        ? this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: {
              id: true,
              displayNumber: true,
              status: true,
              fulfillmentMode: true,
              scheduledFor: true,
              contactless: true,
              ecoPackaging: true,
              buildingAccessCode: true,
              deliveryNote: true,
              currency: true,
              finalPayableMinor: true,
              tipMinor: true,
              items: {
                select: {
                  id: true,
                  productNameSnapshot: true,
                  quantity: true,
                  modifiers: { select: { nameSnapshot: true } },
                  removals: { select: { nameSnapshot: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      deliveryIds.length > 0 && this.prisma.courierLocationPoint
        ? this.prisma.courierLocationPoint.findMany({
            where: { deliveryId: { in: deliveryIds } },
            orderBy: { recordedAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const branchMap = new Map<string, DeliveryBranchSummaryDto>();
    for (const branch of branches) {
      branchMap.set(branch.id, {
        id: branch.id,
        code: branch.code,
        name: branch.name,
        addressLine: branch.addressLine,
        phone: branch.phone,
        latitude: branch.latitude != null ? Number(branch.latitude) : null,
        longitude: branch.longitude != null ? Number(branch.longitude) : null,
      });
    }

    const orderMap = new Map<string, DeliveryOrderSummaryDto>();
    for (const order of orders) {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      orderMap.set(order.id, {
        displayNumber: order.displayNumber,
        status: order.status,
        fulfillmentMode: order.fulfillmentMode,
        scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
        contactless: order.contactless,
        ecoPackaging: order.ecoPackaging,
        buildingAccessCode: order.buildingAccessCode,
        deliveryNote: order.deliveryNote,
        currency: order.currency,
        finalPayableMinor: order.finalPayableMinor.toString(),
        tipMinor: order.tipMinor.toString(),
        itemCount,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productNameSnapshot,
          quantity: item.quantity,
          modifiers: item.modifiers.map((m) => m.nameSnapshot),
          removals: item.removals.map((r) => r.nameSnapshot),
        })),
      });
    }

    const locationMap = new Map<string, DeliveryLatestLocationDto>();
    for (const point of locations) {
      if (!locationMap.has(point.deliveryId)) {
        locationMap.set(point.deliveryId, {
          latitude: point.latitude,
          longitude: point.longitude,
          accuracyM: point.accuracyM,
          recordedAt: point.recordedAt,
        });
      }
    }

    return deliveries.map((delivery) => ({
      ...delivery,
      branch: branchMap.get(delivery.branchId),
      order: orderMap.get(delivery.orderId),
      latestLocation: locationMap.get(delivery.id) ?? null,
    }));
  }

  async #assertCapacity(courierId: string): Promise<void> {
    const courier = await this.getCourier(courierId);
    const all = this.prisma
      ? await this.prisma.delivery.findMany({ where: { courierId } })
      : [...this.#deliveries.values()].filter((d) => d.courierId === courierId);
    const active = all.filter((d) =>
      ACTIVE_DELIVERY_STATUSES.has(d.status as DeliveryStatus),
    ).length;
    if (active >= courier.maxActiveDeliveries) {
      throw new BadRequestException({
        code: ErrorCodes.DELIVERY_COURIER_LIMIT_REACHED,
        message: 'Courier active delivery limit reached.',
      });
    }
  }

  async #syncOrder(
    delivery: DeliveryDto,
    toStatus: 'COURIER_ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED',
    actorUserId: string | null,
  ): Promise<void> {
    if (!this.orders) return;
    try {
      const order = await this.orders.get(delivery.orderId);
      if (order.status === toStatus) return;
      await this.orders.transition(delivery.orderId, { toStatus, actorUserId });
    } catch {
      // Order may not exist during isolated unit tests.
    }
  }

  #clone(d: DeliveryDto): DeliveryDto {
    return {
      ...d,
      branch: d.branch ? { ...d.branch } : undefined,
      order: d.order
        ? {
            ...d.order,
            items: d.order.items.map((item) => ({
              ...item,
              modifiers: item.modifiers ? [...item.modifiers] : undefined,
              removals: item.removals ? [...item.removals] : undefined,
            })),
          }
        : undefined,
      latestLocation: d.latestLocation ? { ...d.latestLocation } : d.latestLocation,
      assignments: d.assignments.map((a) => ({ ...a })),
    };
  }

  #cloneCourier(c: CourierProfileDto): CourierProfileDto {
    return { ...c };
  }
}
