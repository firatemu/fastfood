import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';

import { SpinService } from './spin.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const spinBodySchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
});

@Controller({ path: 'me' })
@UseGuards(AuthGuard, AccountStatusGuard)
export class SpinController {
  constructor(@Inject(SpinService) private readonly spins: SpinService) {}

  private principal(
    request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): AuthenticatedPrincipal {
    if (!request.principal) {
      throw new NotFoundException({
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'No principal.',
      });
    }
    return request.principal;
  }

  @Get('spin')
  async eligibility(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.principal(request);
    return {
      data: await this.spins.getEligibility(principal.id),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('spin')
  @HttpCode(200)
  async spin(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = this.principal(request);
    const parsed = safeValidate(spinBodySchema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'idempotencyKey is required.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const result = await this.spins.spin(principal.id, parsed.data.idempotencyKey);
      return { data: result, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      const e = err as { name?: string; response?: unknown };
      if (e.name === 'BadRequestException') {
        return e.response;
      }
      throw err;
    }
  }
}
