import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';

import { NotificationService } from './notification.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const registerPushTokenSchema = z.object({
  token: z.string().min(1).max(255),
  platform: z.enum(['android', 'ios', 'web']).optional(),
  deviceModel: z.string().max(128).optional(),
});

@Controller({ path: 'customer' })
export class CustomerPushTokenController {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

  @Post('push-token')
  @HttpCode(200)
  async register(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const parsed = safeValidate(registerPushTokenSchema, body);
    if (!parsed.ok) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Geçersiz token verisi.',
        errors: parsed.issues,
      });
    }

    const res = await this.notifications.registerPushToken({
      userId: request.principal?.id ?? null,
      token: parsed.data.token,
      platform: parsed.data.platform,
      deviceModel: parsed.data.deviceModel,
    });

    return {
      data: { success: true, id: res.id },
      meta: { requestId: REQUEST_ID },
    };
  }
}

@Controller({ path: 'me' })
@UseGuards(AuthGuard, AccountStatusGuard)
export class CustomerNotificationController {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

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

  @Get('notifications')
  async list(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.principal(request);
    const rows = await this.notifications.listCustomerInbox(principal.id);
    return {
      data: {
        items: rows.map((row) => this.notifications.toCustomerPayload(row)),
        unreadCount: this.notifications.unreadCount(rows),
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @Patch('notifications/:id/read')
  async markRead(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Param('id') id: string,
  ): Promise<unknown> {
    const principal = this.principal(request);
    try {
      const row = await this.notifications.markRead(principal.id, id);
      return {
        data: this.notifications.toCustomerPayload(row),
        meta: { requestId: REQUEST_ID },
      };
    } catch {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Notification not found.',
          requestId: REQUEST_ID,
        },
      };
    }
  }

  @Post('notifications/read-all')
  @HttpCode(200)
  async markAll(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.principal(request);
    const updated = await this.notifications.markAllRead(principal.id);
    return { data: { ok: true, updated }, meta: { requestId: REQUEST_ID } };
  }

  @Delete('notifications/:id')
  @HttpCode(200)
  async deleteOne(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Param('id') id: string,
  ): Promise<unknown> {
    const principal = this.principal(request);
    const deleted = await this.notifications.deleteCustomerNotification(principal.id, id);
    if (!deleted) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Notification not found.',
      });
    }
    return { data: { ok: true, id }, meta: { requestId: REQUEST_ID } };
  }

  @Delete('notifications')
  @HttpCode(200)
  async deleteAll(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.principal(request);
    const count = await this.notifications.deleteAllCustomerNotifications(principal.id);
    return { data: { ok: true, count }, meta: { requestId: REQUEST_ID } };
  }
}
