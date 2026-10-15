import { ErrorCodes } from '@fastfood/contracts';
import { ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

import { generateCirclePolygon } from './routing/routing.service.js';

/**
 * Branch domain service — Prisma-backed at runtime; in-memory fallback
 * for isolated unit tests.
 */

export interface BranchOperatingHoursDto {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface ServiceAreaDto {
  id: string;
  branchId: string;
  name: string;
  polygonGeoJson: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  priority: number;
  isActive: boolean;
}

export interface BranchDto {
  id: string;
  code: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  isActive: boolean;
  isAcceptingOrders: boolean;
  minOrderMinor: bigint;
  deliveryFeeMinor: bigint;
  estimatedDeliveryMinutesMin: number;
  estimatedDeliveryMinutesMax: number;
  storyBody: string | null;
  imageUrl: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  administrator?: {
    userId: string;
    displayName: string | null;
    status: string;
  } | null;
}

export interface CreateBranchInput {
  code: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  phone?: string;
  minOrderMinor?: bigint;
  deliveryFeeMinor?: bigint;
}

export interface UpdateBranchInput {
  name?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
  isAcceptingOrders?: boolean;
  minOrderMinor?: bigint;
  deliveryFeeMinor?: bigint;
  isSuperAdmin?: boolean;
}

export interface CreateServiceAreaInput {
  name: string;
  polygonGeoJson: ServiceAreaDto['polygonGeoJson'];
  priority?: number;
}

function timeToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0));
}

function dateToTime(d: Date): string {
  return d.toISOString().slice(11, 16);
}

@Injectable()
export class BranchService {
  readonly #branches = new Map<string, BranchDto>();
  readonly #serviceAreas = new Map<string, ServiceAreaDto>();
  readonly #operatingHours = new Map<string, BranchOperatingHoursDto[]>();
  readonly #codes = new Set<string>();

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {
    if (!this.prisma) {
      this.#seedDevData();
    }
  }

  #seedDevData(): void {
    const downtownId = '01900000-0000-7000-8000-faaaaaaaaaaa';
    this.#branches.set(downtownId, {
      id: downtownId,
      code: 'IST-DT',
      name: 'Istanbul Downtown',
      addressLine: 'Istiklal Caddesi 1',
      latitude: 41.0369,
      longitude: 28.9847,
      phone: '+902121234567',
      isActive: true,
      isAcceptingOrders: true,
      minOrderMinor: 5000n,
      deliveryFeeMinor: 1500n,
      estimatedDeliveryMinutesMin: 25,
      estimatedDeliveryMinutesMax: 35,
      storyBody: null,
      imageUrl: null,
      pickupEnabled: true,
      deliveryEnabled: true,
    });
    this.#codes.add('IST-DT');

    this.#serviceAreas.set('sa-1', {
      id: '01900000-0000-7000-8000-fbbbbbbbbbbb',
      branchId: downtownId,
      name: 'Downtown core',
      polygonGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [28.97, 41.02],
            [29.0, 41.02],
            [29.0, 41.05],
            [28.97, 41.05],
            [28.97, 41.02],
          ],
        ],
      },
      priority: 1,
      isActive: true,
    });

    this.#operatingHours.set(downtownId, [
      { dayOfWeek: 1, opensAt: '09:00', closesAt: '23:00', isClosed: false },
      { dayOfWeek: 2, opensAt: '09:00', closesAt: '23:00', isClosed: false },
      { dayOfWeek: 3, opensAt: '09:00', closesAt: '23:00', isClosed: false },
      { dayOfWeek: 4, opensAt: '09:00', closesAt: '23:00', isClosed: false },
      { dayOfWeek: 5, opensAt: '09:00', closesAt: '00:00', isClosed: false },
      { dayOfWeek: 6, opensAt: '10:00', closesAt: '00:00', isClosed: false },
      { dayOfWeek: 0, opensAt: '10:00', closesAt: '22:00', isClosed: false },
    ]);
  }

  async listBranches(includeInactive = false): Promise<BranchDto[]> {
    if (!this.prisma) {
      return [...this.#branches.values()].filter((b) => includeInactive || b.isActive);
    }
    const rows = await this.prisma.branch.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        administrator: {
          include: { user: { select: { id: true, displayName: true, status: true } } },
        },
      },
    });
    return rows.map((b) => ({
      ...this.#mapBranch(b),
      administrator: b.administrator
        ? {
            userId: b.administrator.user.id,
            displayName: b.administrator.user.displayName,
            status: b.administrator.user.status,
          }
        : null,
    }));
  }

  async getBranch(id: string): Promise<BranchDto> {
    if (!this.prisma) {
      const b = this.#branches.get(id);
      if (!b) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Branch not found.',
        });
      }
      return b;
    }
    const b = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        administrator: {
          include: { user: { select: { id: true, displayName: true, status: true } } },
        },
      },
    });
    if (!b) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Branch not found.',
      });
    }
    return {
      ...this.#mapBranch(b),
      administrator: b.administrator
        ? {
            userId: b.administrator.user.id,
            displayName: b.administrator.user.displayName,
            status: b.administrator.user.status,
          }
        : null,
    };
  }

  async createBranch(input: CreateBranchInput): Promise<BranchDto> {
    if (!this.prisma) {
      if (this.#codes.has(input.code)) {
        throw new NotFoundException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Branch code already exists.',
        });
      }
      const id = `01900000-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0').slice(0, 12)}`;
      const created: BranchDto = {
        id,
        code: input.code,
        name: input.name,
        addressLine: input.addressLine,
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone ?? null,
        isActive: false,
        isAcceptingOrders: false,
        minOrderMinor: input.minOrderMinor ?? 0n,
        deliveryFeeMinor: input.deliveryFeeMinor ?? 0n,
        estimatedDeliveryMinutesMin: 0,
        estimatedDeliveryMinutesMax: 0,
        storyBody: null,
        imageUrl: null,
        pickupEnabled: true,
        deliveryEnabled: true,
      };
      this.#branches.set(id, created);
      this.#codes.add(input.code);
      return created;
    }
    const existing = await this.prisma.branch.findUnique({ where: { code: input.code } });
    if (existing) {
      throw new NotFoundException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Branch code already exists.',
      });
    }
    const b = await this.prisma.branch.create({
      data: {
        code: input.code,
        name: input.name,
        addressLine: input.addressLine,
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone ?? null,
        isActive: false,
        isAcceptingOrders: false,
        minOrderMinor: input.minOrderMinor ?? 0n,
        deliveryFeeMinor: input.deliveryFeeMinor ?? 0n,
      },
    });
    return this.#mapBranch(b);
  }

  async listServiceAreas(branchId?: string): Promise<ServiceAreaDto[]> {
    if (!this.prisma) {
      return [...this.#serviceAreas.values()].filter(
        (sa) => sa.isActive && (branchId === undefined || sa.branchId === branchId),
      );
    }
    const rows = await this.prisma.serviceArea.findMany({
      where: {
        isActive: true,
        ...(branchId !== undefined ? { branchId } : {}),
      },
    });
    return rows.map((sa) => ({
      id: sa.id,
      branchId: sa.branchId,
      name: sa.name,
      polygonGeoJson: sa.polygonGeoJson as ServiceAreaDto['polygonGeoJson'],
      priority: sa.priority,
      isActive: sa.isActive,
    }));
  }

  async updateBranch(id: string, input: UpdateBranchInput): Promise<BranchDto> {
    if (!this.prisma) {
      const b = this.#branches.get(id);
      if (!b) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Branch not found.',
        });
      }
      const updated: BranchDto = {
        ...b,
        name: input.name ?? b.name,
        addressLine: input.addressLine ?? b.addressLine,
        latitude: input.latitude ?? b.latitude,
        longitude: input.longitude ?? b.longitude,
        phone: input.phone !== undefined ? input.phone : b.phone,
        isAcceptingOrders: input.isAcceptingOrders ?? b.isAcceptingOrders,
        minOrderMinor: input.minOrderMinor ?? b.minOrderMinor,
        deliveryFeeMinor: input.deliveryFeeMinor ?? b.deliveryFeeMinor,
      };
      this.#branches.set(id, updated);
      return updated;
    }
    if (input.isAcceptingOrders === true) {
      const branch = await this.prisma.branch.findUnique({
        where: { id },
        select: {
          isAcceptingOrders: true,
          administrator: { select: { user: { select: { status: true } } } },
        },
      });
      if (!branch) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Şube bulunamadı.',
        });
      }
      const isAlreadyAccepting = branch.isAcceptingOrders === true;
      const hasActiveAdmin = branch.administrator?.user.status === 'ACTIVE';
      if (!input.isSuperAdmin && !isAlreadyAccepting && !hasActiveAdmin) {
        throw new ConflictException({
          code: 'BRANCH_ADMIN_REQUIRED',
          message: 'Sipariş alımını açmak için şubeye aktif bir şube yöneticisi atanmış olmalıdır.',
        });
      }
    }
    try {
      const b = await this.prisma.branch.update({
        where: { id },
        data: {
          name: input.name,
          addressLine: input.addressLine,
          latitude: input.latitude,
          longitude: input.longitude,
          phone: input.phone,
          isAcceptingOrders: input.isAcceptingOrders,
          minOrderMinor: input.minOrderMinor,
          deliveryFeeMinor: input.deliveryFeeMinor,
        },
      });
      return this.#mapBranch(b);
    } catch {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Branch not found.',
      });
    }
  }

  async createServiceArea(
    branchId: string,
    input: CreateServiceAreaInput,
  ): Promise<ServiceAreaDto> {
    await this.getBranch(branchId);
    if (!this.prisma) {
      const id = `01900000-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0').slice(0, 12)}`;
      const created: ServiceAreaDto = {
        id,
        branchId,
        name: input.name,
        polygonGeoJson: input.polygonGeoJson,
        priority: input.priority ?? 0,
        isActive: true,
      };
      this.#serviceAreas.set(id, created);
      return created;
    }
    const row = await this.prisma.serviceArea.create({
      data: {
        branchId,
        name: input.name,
        polygonGeoJson: input.polygonGeoJson as object,
        priority: input.priority ?? 0,
        isActive: true,
      },
    });
    return {
      id: row.id,
      branchId: row.branchId,
      name: row.name,
      polygonGeoJson: row.polygonGeoJson as ServiceAreaDto['polygonGeoJson'],
      priority: row.priority,
      isActive: row.isActive,
    };
  }

  async generateServiceArea(
    branchId: string,
    radiusKm: number = 10,
    priority: number = 0,
  ): Promise<ServiceAreaDto> {
    const branch = await this.getBranch(branchId);
    const polygon = generateCirclePolygon(branch.latitude, branch.longitude, radiusKm);
    return this.createServiceArea(branchId, {
      name: `${branch.name} — ${radiusKm}km`,
      polygonGeoJson: polygon,
      priority,
    });
  }

  async generateServiceAreasForAllBranches(radiusKm: number = 10): Promise<ServiceAreaDto[]> {
    const branches = await this.listBranches(false);
    const results: ServiceAreaDto[] = [];
    for (const branch of branches) {
      const area = await this.generateServiceArea(branch.id, radiusKm);
      results.push(area);
    }
    return results;
  }

  async updateServiceArea(
    branchId: string,
    serviceAreaId: string,
    input: { name?: string; priority?: number },
  ): Promise<ServiceAreaDto> {
    if (!this.prisma) {
      const area = this.#serviceAreas.get(serviceAreaId);
      if (!area || area.branchId !== branchId) {
        throw new NotFoundException('Service area not found.');
      }
      const updated: ServiceAreaDto = {
        ...area,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      };
      this.#serviceAreas.set(serviceAreaId, updated);
      return updated;
    }
    const existing = await this.prisma.serviceArea.findUnique({ where: { id: serviceAreaId } });
    if (!existing || existing.branchId !== branchId) {
      throw new NotFoundException('Service area not found.');
    }
    const row = await this.prisma.serviceArea.update({
      where: { id: serviceAreaId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      },
    });
    return {
      id: row.id,
      branchId: row.branchId,
      name: row.name,
      polygonGeoJson: row.polygonGeoJson as ServiceAreaDto['polygonGeoJson'],
      priority: row.priority,
      isActive: row.isActive,
    };
  }

  async deactivateServiceArea(branchId: string, serviceAreaId: string): Promise<void> {
    if (!this.prisma) {
      const area = this.#serviceAreas.get(serviceAreaId);
      if (!area || area.branchId !== branchId) {
        throw new NotFoundException('Service area not found.');
      }
      this.#serviceAreas.set(serviceAreaId, { ...area, isActive: false });
      return;
    }
    const existing = await this.prisma.serviceArea.findUnique({ where: { id: serviceAreaId } });
    if (!existing || existing.branchId !== branchId) {
      throw new NotFoundException('Service area not found.');
    }
    await this.prisma.serviceArea.update({
      where: { id: serviceAreaId },
      data: { isActive: false },
    });
  }

  async getOperatingHours(branchId: string): Promise<BranchOperatingHoursDto[]> {
    if (!this.prisma) {
      return this.#operatingHours.get(branchId) ?? [];
    }
    const rows = await this.prisma.branchOperatingHours.findMany({
      where: { branchId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return rows.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      opensAt: dateToTime(h.opensAt),
      closesAt: dateToTime(h.closesAt),
      isClosed: h.isClosed,
    }));
  }

  /** Persist operating hours (used by seed / admin). */
  async setOperatingHours(branchId: string, hours: BranchOperatingHoursDto[]): Promise<void> {
    if (!this.prisma) {
      this.#operatingHours.set(branchId, hours);
      return;
    }
    for (const h of hours) {
      await this.prisma.branchOperatingHours.upsert({
        where: { branchId_dayOfWeek: { branchId, dayOfWeek: h.dayOfWeek } },
        create: {
          branchId,
          dayOfWeek: h.dayOfWeek,
          opensAt: timeToDate(h.opensAt),
          closesAt: timeToDate(h.closesAt),
          isClosed: h.isClosed,
        },
        update: {
          opensAt: timeToDate(h.opensAt),
          closesAt: timeToDate(h.closesAt),
          isClosed: h.isClosed,
        },
      });
    }
  }

  #mapBranch(b: {
    id: string;
    code: string;
    name: string;
    addressLine: string;
    latitude: { toNumber(): number } | number;
    longitude: { toNumber(): number } | number;
    phone: string | null;
    isActive: boolean;
    isAcceptingOrders: boolean;
    minOrderMinor: bigint;
    deliveryFeeMinor: bigint;
    estimatedDeliveryMinutesMin: number;
    estimatedDeliveryMinutesMax: number;
    storyBody?: string | null;
    imageUrl?: string | null;
    pickupEnabled?: boolean;
    deliveryEnabled?: boolean;
  }): BranchDto {
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      addressLine: b.addressLine,
      latitude: typeof b.latitude === 'number' ? b.latitude : b.latitude.toNumber(),
      longitude: typeof b.longitude === 'number' ? b.longitude : b.longitude.toNumber(),
      phone: b.phone,
      isActive: b.isActive,
      isAcceptingOrders: b.isAcceptingOrders,
      minOrderMinor: b.minOrderMinor,
      deliveryFeeMinor: b.deliveryFeeMinor,
      estimatedDeliveryMinutesMin: b.estimatedDeliveryMinutesMin,
      estimatedDeliveryMinutesMax: b.estimatedDeliveryMinutesMax,
      storyBody: b.storyBody ?? null,
      imageUrl: b.imageUrl ?? null,
      pickupEnabled: b.pickupEnabled ?? true,
      deliveryEnabled: b.deliveryEnabled ?? true,
    };
  }
}
