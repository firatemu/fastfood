import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import {
  ReportingService,
  type BranchReportRow,
  type ProductReportRow,
  type SalesReportRow,
} from './reporting.service.js';

function serializeSales(rows: SalesReportRow[]) {
  return rows.map((r) => ({
    ...r,
    grossMinor: r.grossMinor.toString(),
    refundedMinor: r.refundedMinor.toString(),
    netMinor: r.netMinor.toString(),
  }));
}

function serializeBranches(rows: BranchReportRow[]) {
  return rows.map((r) => ({ ...r, grossMinor: r.grossMinor.toString() }));
}

function serializeProducts(rows: ProductReportRow[]) {
  return rows.map((r) => ({ ...r, grossMinor: r.grossMinor.toString() }));
}

function istanbulDayRange(date: string): { from: Date; to: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new BadRequestException('date must use YYYY-MM-DD format.');
  }
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const normalized = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  if (normalized !== date) throw new BadRequestException('date is not a valid calendar day.');

  // Europe/Istanbul uses UTC+03:00. The upper bound is exclusive so orders
  // exactly at the next local midnight belong to the following business day.
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return {
    from: new Date(`${date}T00:00:00.000+03:00`),
    to: new Date(`${nextDate}T00:00:00.000+03:00`),
  };
}

@Controller({ path: 'admin/reports' })
export class ReportingController {
  constructor(@Inject(ReportingService) private readonly reports: ReportingService) {}

  #branchIds(
    request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): ReadonlySet<string> {
    return request.principal?.branchIds ?? new Set<string>();
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('reports.read')
  @Get('sales')
  async sales(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    return { data: serializeSales(await this.reports.sales(this.#branchIds(request))) };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('reports.read')
  @Get('branches')
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter orders by creation date in Europe/Istanbul (YYYY-MM-DD).',
    schema: { type: 'string', format: 'date', example: '2026-09-25' },
  })
  async branches(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Query('date') date?: string,
  ): Promise<unknown> {
    const range = date ? istanbulDayRange(date) : undefined;
    return {
      data: serializeBranches(await this.reports.branches(range, this.#branchIds(request))),
    };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('reports.read')
  @Get('products')
  async products(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    return { data: serializeProducts(await this.reports.products(this.#branchIds(request))) };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('reports.read')
  @Get('couriers')
  async couriers(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    return { data: await this.reports.couriers(this.#branchIds(request)) };
  }
}
