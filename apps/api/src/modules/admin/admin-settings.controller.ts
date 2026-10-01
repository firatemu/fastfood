import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { SettingsService } from './settings.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const patchSettingSchema = z.object({
  valueJson: z.unknown(),
});

@Controller({ path: 'admin' })
export class AdminSettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('settings.read')
  @Get('settings')
  async list(): Promise<unknown> {
    const rows = await this.settings.list();
    return { data: rows, meta: { requestId: REQUEST_ID } };
  }

  @UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
  @RequirePermissions('settings.write')
  @Patch('settings/:key')
  @HttpCode(200)
  async patch(
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const parsed = safeValidate(patchSettingSchema, body);
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
      const updated = await this.settings.patch(key, parsed.data.valueJson, req.principal?.id);
      return { data: updated, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === 'NotFoundException') {
        return {
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'Setting not found or not mutable.',
            requestId: REQUEST_ID,
          },
        };
      }
      throw err;
    }
  }
}
