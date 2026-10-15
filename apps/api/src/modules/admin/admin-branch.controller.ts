import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';
import {
  BranchService,
  type CreateBranchInput,
  type CreateServiceAreaInput,
  type UpdateBranchInput,
} from '../branch/branch.service.js';
import { CatalogService } from '../catalog/catalog.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const createBranchSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
  addressLine: z.string().min(1).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z
    .string()
    .regex(/^\+\d{10,15}$/)
    .optional(),
  minOrderMinor: z.string().regex(/^\d+$/).optional(),
  deliveryFeeMinor: z.string().regex(/^\d+$/).optional(),
});

const productAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  reason: z.string().max(255).optional(),
});

const updateBranchSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  addressLine: z.string().min(1).max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z
    .string()
    .regex(/^\+\d{10,15}$/)
    .optional()
    .nullable(),
  isAcceptingOrders: z.boolean().optional(),
  minOrderMinor: z.string().regex(/^\d+$/).optional(),
  deliveryFeeMinor: z.string().regex(/^\d+$/).optional(),
});

const createServiceAreaSchema = z.object({
  name: z.string().min(1).max(128),
  polygonGeoJson: z.object({
    type: z.enum(['Polygon', 'MultiPolygon']),
    coordinates: z.unknown(),
  }),
  priority: z.number().int().min(0).optional(),
});

@Injectable()
@Controller({ path: 'admin' })
export class AdminBranchController {
  constructor(
    @Inject(BranchService) private readonly branchService: BranchService,
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.read')
  @Get('branches')
  async listBranches(
    @Req()
    request: FastifyRequest & {
      principal?: { actorType: string; branchIds?: ReadonlySet<string>; isSuperAdmin?: boolean };
    },
  ): Promise<unknown> {
    const principal = request.principal;
    const branches = await this.branchService.listBranches(
      principal?.actorType === 'STAFF' && principal.isSuperAdmin === true,
    );
    const visibleBranches =
      principal?.actorType === 'STAFF' && !principal.isSuperAdmin
        ? branches.filter((branch) => principal.branchIds?.has(branch.id))
        : branches;
    return {
      data: visibleBranches.map((b) => ({
        ...b,
        minOrderMinor: b.minOrderMinor.toString(),
        deliveryFeeMinor: b.deliveryFeeMinor.toString(),
      })),
      meta: { requestId: REQUEST_ID },
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.read')
  @Get('branches/:branchId')
  async getBranch(@Param('branchId') branchId: string): Promise<unknown> {
    try {
      const branch = await this.branchService.getBranch(branchId);
      return {
        data: {
          ...branch,
          minOrderMinor: branch.minOrderMinor.toString(),
          deliveryFeeMinor: branch.deliveryFeeMinor.toString(),
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Branch not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.write')
  @Patch('branches/:branchId')
  @HttpCode(200)
  async patchBranch(
    @Param('branchId') branchId: string,
    @Body() body: unknown,
    @Req()
    request: FastifyRequest & {
      principal?: { actorType: string; isSuperAdmin?: boolean };
    },
  ): Promise<unknown> {
    const parsed = safeValidate(updateBranchSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Bir veya daha fazla alan geçersiz.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const branch = await this.branchService.updateBranch(branchId, {
        name: parsed.data.name,
        addressLine: parsed.data.addressLine,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        phone: parsed.data.phone,
        isAcceptingOrders: parsed.data.isAcceptingOrders,
        minOrderMinor: parsed.data.minOrderMinor ? BigInt(parsed.data.minOrderMinor) : undefined,
        deliveryFeeMinor: parsed.data.deliveryFeeMinor
          ? BigInt(parsed.data.deliveryFeeMinor)
          : undefined,
        isSuperAdmin: request.principal?.isSuperAdmin === true,
      } as UpdateBranchInput);
      return {
        data: {
          ...branch,
          minOrderMinor: branch.minOrderMinor.toString(),
          deliveryFeeMinor: branch.deliveryFeeMinor.toString(),
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string; getResponse?: () => unknown; message?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Şube bulunamadı.',
            requestId: REQUEST_ID,
          },
        };
      }
      if (e.name === 'ConflictException') {
        const resp =
          typeof e.getResponse === 'function' ? (e.getResponse() as Record<string, unknown>) : null;
        return {
          error: {
            code: (resp?.code as string) ?? 'BRANCH_ADMIN_REQUIRED',
            message:
              (resp?.message as string) ??
              e.message ??
              'Sipariş alımını açmak için şubeye aktif bir şube yöneticisi atanmış olmalıdır.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.read')
  @Get('branches/:branchId/service-areas')
  async listServiceAreas(@Param('branchId') branchId: string): Promise<unknown> {
    const areas = await this.branchService.listServiceAreas(branchId);
    return { data: areas, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.read')
  @Get('branches/:branchId/operating-hours')
  async getOperatingHours(@Param('branchId') branchId: string): Promise<unknown> {
    const hours = await this.branchService.getOperatingHours(branchId);
    return { data: hours, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.write')
  @Put('branches/:branchId/operating-hours')
  @HttpCode(200)
  async putOperatingHours(
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const schema = z.object({
      hours: z.array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          opensAt: z.string().regex(/^\d{2}:\d{2}$/),
          closesAt: z.string().regex(/^\d{2}:\d{2}$/),
          isClosed: z.boolean(),
        }),
      ),
    });
    const parsed = safeValidate(schema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      await this.branchService.getBranch(branchId);
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Branch not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
    await this.branchService.setOperatingHours(branchId, parsed.data.hours);
    const hours = await this.branchService.getOperatingHours(branchId);
    return { data: hours, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.service_areas.write')
  @Post('branches/:branchId/service-areas')
  @HttpCode(201)
  async createServiceArea(
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(createServiceAreaSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const area = await this.branchService.createServiceArea(branchId, {
        name: parsed.data.name,
        polygonGeoJson: parsed.data.polygonGeoJson as CreateServiceAreaInput['polygonGeoJson'],
        priority: parsed.data.priority,
      });
      return { data: area, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Branch not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.service_areas.write')
  @Post('branches/:branchId/service-areas/generate-circle')
  @HttpCode(201)
  async generateCircleServiceArea(
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const schema = z.object({
      radiusKm: z.number().min(1).max(50).optional().default(10),
    });
    const parsed = safeValidate(schema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid radius.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const area = await this.branchService.generateServiceArea(branchId, parsed.data.radiusKm);
      return { data: area, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Branch not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.service_areas.write')
  @Post('branches/service-areas/generate-all')
  @HttpCode(201)
  async generateAllCirclesServiceArea(
    @Body() body: unknown,
  ): Promise<unknown> {
    const schema = z.object({
      radiusKm: z.number().min(1).max(50).optional().default(10),
    });
    const parsed = safeValidate(schema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid radius.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const areas = await this.branchService.generateServiceAreasForAllBranches(parsed.data.radiusKm);
    return { data: areas, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.service_areas.write')
  @Patch('branches/:branchId/service-areas/:serviceAreaId')
  @HttpCode(200)
  async updateServiceArea(
    @Param('branchId') branchId: string,
    @Param('serviceAreaId') serviceAreaId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const schema = z.object({
      name: z.string().min(1).max(128).optional(),
      priority: z.number().int().min(0).optional(),
    });
    const parsed = safeValidate(schema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const area = await this.branchService.updateServiceArea(branchId, serviceAreaId, parsed.data);
      return { data: area, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Service area not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.service_areas.write')
  @Delete('branches/:branchId/service-areas/:serviceAreaId')
  @HttpCode(204)
  async deactivateServiceArea(
    @Param('branchId') branchId: string,
    @Param('serviceAreaId') serviceAreaId: string,
  ): Promise<unknown> {
    try {
      await this.branchService.deactivateServiceArea(branchId, serviceAreaId);
      return null;
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Service area not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }


  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.write')
  @Post('branches')
  @HttpCode(201)
  async createBranch(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(createBranchSchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const branch = await this.branchService.createBranch({
        code: parsed.data.code,
        name: parsed.data.name,
        addressLine: parsed.data.addressLine,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        phone: parsed.data.phone,
        minOrderMinor: parsed.data.minOrderMinor ? BigInt(parsed.data.minOrderMinor) : undefined,
        deliveryFeeMinor: parsed.data.deliveryFeeMinor
          ? BigInt(parsed.data.deliveryFeeMinor)
          : undefined,
      } as CreateBranchInput);
      return {
        data: {
          ...branch,
          minOrderMinor: branch.minOrderMinor.toString(),
          deliveryFeeMinor: branch.deliveryFeeMinor.toString(),
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Branch code already exists.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.read')
  @Get('branches/:branchId/product-availability')
  async listProductAvailability(@Param('branchId') branchId: string): Promise<unknown> {
    try {
      await this.branchService.getBranch(branchId);
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Branch not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
    const rows = await this.catalogService.listBranchProductAvailability(branchId);
    return { data: rows, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('branches.service_areas.write')
  @Patch('branches/:branchId/product-availability/:productId')
  @HttpCode(200)
  async setProductAvailability(
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(productAvailabilitySchema, body);
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'One or more fields are invalid.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      await this.catalogService.getProduct(productId);
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Product not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
    try {
      await this.branchService.getBranch(branchId);
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Branch not found.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
    await this.catalogService.setProductAvailability(
      branchId,
      productId,
      parsed.data.isAvailable,
      parsed.data.reason,
    );
    return {
      data: {
        branchId,
        productId,
        isAvailable: parsed.data.isAvailable,
        reason: parsed.data.reason ?? null,
      },
      meta: { requestId: REQUEST_ID },
    };
  }
}
