import { ErrorCodes } from '@fastfood/contracts';
import { Controller, Get, HttpCode, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { CustomerAuthService } from '../auth/customer/customer-auth.service.js';
import { resolveStorefrontPrincipal } from '../auth/customer/request-identity.js';

import { DiningTableService } from './dining-table.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

@Controller({ path: 'storefront/tables' })
export class DiningTableController {
  constructor(
    @Inject(DiningTableService) private readonly tables: DiningTableService,
    @Inject(CustomerAuthService) private readonly customerAuth: CustomerAuthService,
  ) {}

  @Get(':code')
  async get(
    @Param('code') code: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    try {
      const table = await this.tables.resolve(code);
      return { data: table, meta: { requestId: REQUEST_ID } };
    } catch {
      reply.code(404);
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Table code is invalid or unavailable.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @Post(':code/scan')
  @HttpCode(200)
  async scan(
    @Param('code') code: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    try {
      const principal = await resolveStorefrontPrincipal(request, this.customerAuth);
      const table = await this.tables.recordScan({
        publicCode: code,
        userId: principal.userId ?? null,
        guestSessionId:
          principal.guestSessionId ?? request.headers['x-session-id']?.toString() ?? null,
      });
      return { data: table, meta: { requestId: REQUEST_ID } };
    } catch {
      reply.code(404);
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Table code is invalid or unavailable.',
          requestId: REQUEST_ID,
        },
      };
    }
  }
}
