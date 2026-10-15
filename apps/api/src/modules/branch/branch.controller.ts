import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import { Controller, Get, HttpCode, Inject, Injectable, Param, Query } from '@nestjs/common';
import { z } from 'zod';

import { BranchService } from './branch.service.js';
import { RoutingService, calculateDistanceKm } from './routing/routing.service.js';

/**
 * Storefront branch endpoints (document 06 + 29).
 *
 * Phase 4 ships:
 *   - GET  /api/v1/storefront/branches
 *   - GET  /api/v1/storefront/branches/:branchId
 *   - GET  /api/v1/storefront/branches/:branchId/operating-hours
 *   - GET  /api/v1/storefront/serviceability  (routing engine)
 */

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const serviceabilitySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

@Injectable()
@Controller({ path: 'storefront' })
export class BranchController {
  constructor(
    @Inject(BranchService) private readonly branchService: BranchService,
    @Inject(RoutingService) private readonly routingService: RoutingService,
  ) {}

  @Get('branches')
  async listBranches(): Promise<unknown> {
    const branches = await this.branchService.listBranches();
    const data = await Promise.all(
      branches.map(async (b) => {
        const hours = await this.branchService.getOperatingHours(b.id);
        return {
          id: b.id,
          code: b.code,
          name: b.name,
          addressLine: b.addressLine,
          phone: b.phone,
          latitude: parseFloat(String(b.latitude)),
          longitude: parseFloat(String(b.longitude)),
          isActive: b.isActive,
          isAcceptingOrders: b.isAcceptingOrders,
          pickupEnabled: b.pickupEnabled,
          deliveryEnabled: b.deliveryEnabled,
          estimatedDeliveryMinutesMin: b.estimatedDeliveryMinutesMin,
          estimatedDeliveryMinutesMax: b.estimatedDeliveryMinutesMax,
          minOrderMinor: b.minOrderMinor.toString(),
          deliveryFeeMinor: b.deliveryFeeMinor.toString(),
          storyBody: b.storyBody,
          imageUrl: b.imageUrl,
          hours,
        };
      }),
    );
    return {
      data,
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('branches/:branchId/operating-hours')
  async getOperatingHours(@Param('branchId') branchId: string): Promise<unknown> {
    const hours = await this.branchService.getOperatingHours(branchId);
    return {
      data: hours,
      meta: { requestId: REQUEST_ID },
    };
  }

  @Get('serviceability')
  @HttpCode(200)
  async getServiceability(@Query() query: unknown): Promise<unknown> {
    const parsed = safeValidate(serviceabilitySchema, query ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.ADDRESS_LOCATION_REQUIRED,
          message: 'Latitude + longitude are required.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const areas = await this.branchService.listServiceAreas();
    const assignments = this.routingService.assignAll(
      parsed.data.latitude,
      parsed.data.longitude,
      areas,
    );
    if (assignments.length === 0) {
      return {
        data: { serviceable: false, branchId: null, branches: [] },
        meta: { requestId: REQUEST_ID },
      };
    }

    // Deduplicate by branchId (keep lowest priority per branch; assignments are already sorted ascending)
    const uniqueByBranch = new Map<string, (typeof assignments)[number]>();
    for (const a of assignments) {
      if (!uniqueByBranch.has(a.branchId)) {
        uniqueByBranch.set(a.branchId, a);
      }
    }
    const deduped = [...uniqueByBranch.values()];

    const branches = await Promise.all(
      deduped.map(async (entry) => {
        const branch = await this.branchService.getBranch(entry.branchId);
        const distanceKm = calculateDistanceKm(
          parsed.data.latitude,
          parsed.data.longitude,
          branch.latitude,
          branch.longitude,
        );
        return {
          branchId: entry.branchId,
          branchName: branch.name,
          serviceAreaId: entry.serviceAreaId,
          priority: entry.priority,
          distanceKm,
          maxRadiusKm: 10,
        };
      }),
    );

    const within10Km = branches.filter((b) => b.distanceKm <= 10.0);
    const bestMatch = within10Km[0];
    if (!bestMatch) {
      return {
        data: { serviceable: false, branchId: null, branches: [] },
        meta: { requestId: REQUEST_ID },
      };
    }

    return {
      data: {
        serviceable: true,
        branchId: bestMatch.branchId,
        branchName: bestMatch.branchName,
        distanceKm: bestMatch.distanceKm,
        maxRadiusKm: 10,
        serviceAreaId: bestMatch.serviceAreaId,
        branches: within10Km,
      },
      meta: { requestId: REQUEST_ID },
    };
  }
}
