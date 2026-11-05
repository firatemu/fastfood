import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { RbacGuard } from '../auth/guards/rbac.guard.js';
import { ResourceScopeGuard } from '../auth/guards/resource-scope.guard.js';

import { NotificationService } from './notification.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const sendNotificationSchema = z.object({
  title: z.string().min(1).max(128),
  body: z.string().min(1).max(500),
  target: z.enum(['all', 'user']).default('all'),
  userId: z.string().uuid().optional(),
  href: z.string().max(255).optional().nullable(),
});

@Controller({ path: 'admin/notifications' })
@UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
export class AdminNotificationController {
  constructor(
    @Inject(NotificationService) private readonly notifications: NotificationService,
  ) {}

  @RequirePermissions('promotions.read')
  @Get()
  async list(@Query('limit') limit?: string): Promise<unknown> {
    const limitNum = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 100);
    const rows = await this.notifications.listAdminNotifications(limitNum);
    return {
      data: {
        items: rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          channel: r.channel,
          templateKey: r.templateKey,
          status: r.status,
          title: (r.payloadJson?.title as string) || 'Bildirim',
          body: (r.payloadJson?.body as string) || '',
          href: (r.payloadJson?.href as string) || null,
          target: (r.payloadJson?.target as string) || 'all',
          createdAt: r.createdAt.toISOString(),
          sentAt: r.sentAt?.toISOString() || null,
        })),
        total: rows.length,
      },
      meta: { requestId: REQUEST_ID },
    };
  }

  @RequirePermissions('promotions.write')
  @Post('send')
  @HttpCode(200)
  async send(@Body() body: unknown): Promise<unknown> {
    const parsed = safeValidate(sendNotificationSchema, body);
    if (!parsed.ok) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Geçersiz bildirim verisi.',
        errors: parsed.issues,
      });
    }

    const { title, body: messageBody, target, userId, href } = parsed.data;

    const record = await this.notifications.sendPushNotification({
      title,
      body: messageBody,
      target,
      userId,
      href: href || undefined,
    });

    return {
      data: {
        success: true,
        id: record.id,
        status: record.status,
      },
      meta: { requestId: REQUEST_ID },
    };
  }
}
