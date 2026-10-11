import {
  adminCourierBranchesSchema,
  adminCourierCreateSchema,
  adminCourierPasswordSchema,
  adminCourierUpdateSchema,
  ErrorCodes,
} from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { CourierAdminService, type CourierAdminActor } from './courier-admin.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000097';

type AdminRequest = FastifyRequest & { principal?: AuthenticatedPrincipal };

/**
 * Courier roster administration (document 29 §admin).
 *
 * Split from `CourierController`, which owns the delivery-job surface. The
 * split also lets this surface drop the old "Super Admin only" rule: a courier
 * belongs to a branch, so a branch manager administers their own roster.
 * `ResourceScopeGuard` rejects a body whose `branchIds` reach outside
 * `principal.branchIds`, and `CourierAdminService` re-checks the same rule
 * against the stored roster.
 */
@Controller('admin/couriers')
@UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
export class CourierAdminController {
  constructor(@Inject(CourierAdminService) private readonly couriers: CourierAdminService) {}

  #actor(request: AdminRequest): CourierAdminActor {
    return {
      userId: request.principal?.id ?? '',
      isSuperAdmin: request.principal?.isSuperAdmin === true,
      branchIds: request.principal?.branchIds ?? new Set<string>(),
    };
  }

  #invalid(issues: unknown): unknown {
    return {
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'One or more fields are invalid.',
        details: { fields: issues },
        requestId: REQUEST_ID,
      },
    };
  }

  @RequirePermissions('couriers.write')
  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown, @Req() request: AdminRequest): Promise<unknown> {
    const parsed = safeValidate(adminCourierCreateSchema, body);
    if (!parsed.ok) return this.#invalid(parsed.issues);
    return { data: await this.couriers.create(parsed.data, this.#actor(request)) };
  }

  @RequirePermissions('couriers.read')
  @Get()
  async list(@Query('branchId') branchId: string | undefined, @Req() request: AdminRequest) {
    return { data: await this.couriers.list(branchId, this.#actor(request)) };
  }

  @RequirePermissions('couriers.read')
  @Get(':courierId')
  async get(@Param('courierId') courierId: string): Promise<unknown> {
    return { data: await this.couriers.get(courierId) };
  }

  @RequirePermissions('couriers.write')
  @Patch(':courierId')
  async update(
    @Param('courierId') courierId: string,
    @Body() body: unknown,
    @Req() request: AdminRequest,
  ): Promise<unknown> {
    const parsed = safeValidate(adminCourierUpdateSchema, body);
    if (!parsed.ok) return this.#invalid(parsed.issues);
    return { data: await this.couriers.update(courierId, parsed.data, this.#actor(request)) };
  }

  @RequirePermissions('couriers.write')
  @Post(':courierId/password')
  @HttpCode(200)
  async setPassword(
    @Param('courierId') courierId: string,
    @Body() body: unknown,
    @Req() request: AdminRequest,
  ): Promise<unknown> {
    const parsed = safeValidate(adminCourierPasswordSchema, body);
    if (!parsed.ok) return this.#invalid(parsed.issues);
    return {
      data: await this.couriers.setPassword(courierId, parsed.data.password, this.#actor(request)),
    };
  }

  @RequirePermissions('couriers.write')
  @Put(':courierId/branches')
  async setBranches(
    @Param('courierId') courierId: string,
    @Body() body: unknown,
    @Req() request: AdminRequest,
  ): Promise<unknown> {
    const parsed = safeValidate(adminCourierBranchesSchema, body);
    if (!parsed.ok) return this.#invalid(parsed.issues);
    return {
      data: await this.couriers.setBranches(courierId, parsed.data.branchIds, this.#actor(request)),
    };
  }
}
