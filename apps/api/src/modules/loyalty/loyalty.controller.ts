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
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CustomerAuthService } from '../auth/customer/customer-auth.service.js';
import { resolveCustomerUserId } from '../auth/customer/request-identity.js';

import { LoyaltyService } from './loyalty.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const reserveSchema = z.object({
  points: z.string().regex(/^\d+$/),
  checkoutSessionId: z.string().uuid().optional(),
});

@Injectable()
@Controller({ path: 'checkout/loyalty' })
export class LoyaltyController {
  constructor(
    @Inject(LoyaltyService) private readonly loyalty: LoyaltyService,
    @Inject(CustomerAuthService) private readonly customerAuth: CustomerAuthService,
  ) {}

  private async requireUser(req: FastifyRequest): Promise<string | null> {
    return (await resolveCustomerUserId(req, this.customerAuth)) ?? null;
  }

  private unauthenticated(): unknown {
    return {
      error: {
        code: ErrorCodes.AUTH_UNAUTHENTICATED,
        message: 'Authentication required.',
        requestId: REQUEST_ID,
      },
    };
  }

  @Get('balance')
  async balance(@Req() req: FastifyRequest): Promise<unknown> {
    const userId = await this.requireUser(req);
    if (!userId) {
      return this.unauthenticated();
    }
    return {
      data: { userId, points: (await this.loyalty.getBalance(userId)).toString() },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('reserve')
  @HttpCode(201)
  async reserve(@Req() req: FastifyRequest, @Body() body: unknown): Promise<unknown> {
    const userId = await this.requireUser(req);
    if (!userId) {
      return this.unauthenticated();
    }
    const parsed = safeValidate(reserveSchema, body);
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
      const reservation = await this.loyalty.reserve({
        userId,
        points: BigInt(parsed.data.points),
        checkoutSessionId: parsed.data.checkoutSessionId,
      });
      return {
        data: {
          id: reservation.id,
          userId: reservation.userId,
          pointsReserved: reservation.pointsReserved.toString(),
          valueMinor: reservation.valueMinor.toString(),
          status: reservation.status,
          checkoutSessionId: reservation.checkoutSessionId,
          expiresAt: reservation.expiresAt?.toISOString() ?? null,
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      return this.translate(err);
    }
  }

  @Delete('reservation/:reservationId')
  @HttpCode(200)
  async release(
    @Req() req: FastifyRequest,
    @Param('reservationId') reservationId: string,
  ): Promise<unknown> {
    const userId = await this.requireUser(req);
    if (!userId) {
      return this.unauthenticated();
    }
    try {
      const reservation = await this.loyalty.release(reservationId, userId);
      return {
        data: {
          id: reservation.id,
          status: reservation.status,
          pointsReserved: reservation.pointsReserved.toString(),
        },
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      return this.translate(err);
    }
  }

  private translate(err: unknown): unknown {
    const e = err as { name?: string; response?: unknown };
    if (e.name === 'NotFoundException' || e.name === 'BadRequestException') {
      return (
        e.response ?? {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Loyalty operation failed.',
            requestId: REQUEST_ID,
          },
        }
      );
    }
    throw err;
  }
}
