import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
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

import { SupportChatService } from './support-chat.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';
const UUID_SHAPE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const replySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

const statusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']),
});

@Controller({ path: 'admin/support' })
@UseGuards(AuthGuard, AccountStatusGuard, RbacGuard, ResourceScopeGuard)
export class AdminSupportController {
  constructor(@Inject(SupportChatService) private readonly chat: SupportChatService) {}

  @RequirePermissions('customers.read')
  @Get('conversations')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  async list(
    @Query('status') status?: string,
    @Query('includeEmpty') includeEmpty?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const normalizedStatus =
      status === 'OPEN' || status === 'CLOSED' || status === 'ALL' ? status : 'ALL';
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 100;
    const rows = await this.chat.listAdmin({
      status: normalizedStatus,
      includeEmpty: includeEmpty === 'true',
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 100,
    });
    return {
      data: rows,
      meta: { requestId: REQUEST_ID },
    };
  }

  @RequirePermissions('customers.read')
  @Get('conversations/:id')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  async detail(@Param('id') id: string): Promise<unknown> {
    this.assertConversationId(id);
    const data = await this.chat.getAdmin(id);
    return {
      data,
      meta: { requestId: REQUEST_ID },
    };
  }

  @RequirePermissions('customers.read')
  @Post('conversations/:id/messages')
  @HttpCode(201)
  async reply(@Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    this.assertConversationId(id);
    const parsed = safeValidate(replySchema, body ?? {});
    if (!parsed.ok) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Mesaj metni 1 ile 2000 karakter arasında olmalıdır.',
        details: { fields: parsed.issues },
      });
    }
    const data = await this.chat.replyAdmin({
      conversationId: id,
      body: parsed.data.body,
    });
    return {
      data,
      meta: { requestId: REQUEST_ID },
    };
  }

  @RequirePermissions('customers.read')
  @Patch('conversations/:id/status')
  async updateStatus(@Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    this.assertConversationId(id);
    const parsed = safeValidate(statusSchema, body ?? {});
    if (!parsed.ok) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Durum OPEN veya CLOSED olmalıdır.',
        details: { fields: parsed.issues },
      });
    }
    const data = await this.chat.updateStatusAdmin({
      conversationId: id,
      status: parsed.data.status,
    });
    return {
      data,
      meta: { requestId: REQUEST_ID },
    };
  }

  private assertConversationId(id: string): void {
    if (!UUID_SHAPE_RE.test(id)) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Conversation not found.',
      });
    }
  }
}
