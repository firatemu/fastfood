import { ErrorCodes } from '@fastfood/contracts';
import { safeValidate } from '@fastfood/validation';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthenticatedPrincipal } from '../auth/guards/authenticated-principal.js';
import { OrderService } from '../order/order.service.js';

import { SupportChatService } from './support-chat.service.js';

const REQUEST_ID = '01900000-0000-7000-8000-000000000099';

const openSchema = z.object({
  orderId: z.string().uuid().optional(),
});

const messageSchema = z.object({
  body: z.string().min(1).max(2000),
  clientRequestId: z.string().min(8).max(128).optional(),
});

@Controller({ path: 'me/support' })
@UseGuards(AuthGuard, AccountStatusGuard)
export class SupportChatController {
  constructor(
    @Inject(SupportChatService) private readonly chat: SupportChatService,
    @Optional() @Inject(OrderService) private readonly orders: OrderService | null = null,
  ) {}

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

  @Get('conversations')
  async list(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
  ): Promise<unknown> {
    const principal = this.principal(request);
    return {
      data: await this.chat.list(principal.id),
      meta: { requestId: REQUEST_ID },
    };
  }

  @Post('conversations')
  @HttpCode(201)
  async open(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = this.principal(request);
    const parsed = safeValidate(openSchema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid support payload.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    const owned = new Set(
      this.orders ? (await this.orders.listByUser(principal.id)).map((o) => o.id) : [],
    );
    try {
      const convo = await this.chat.open({
        userId: principal.id,
        orderId: parsed.data.orderId,
        ownedOrderIds: owned,
      });
      return { data: convo, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      return this.translate(err);
    }
  }

  @Get('conversations/:id')
  async get(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Param('id') id: string,
  ): Promise<unknown> {
    const principal = this.principal(request);
    try {
      return {
        data: await this.chat.getOwned(principal.id, id),
        meta: { requestId: REQUEST_ID },
      };
    } catch (err) {
      return this.translate(err);
    }
  }

  @Post('conversations/:id/messages')
  @HttpCode(201)
  async send(
    @Req() request: FastifyRequest & { principal?: AuthenticatedPrincipal },
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const principal = this.principal(request);
    const parsed = safeValidate(messageSchema, body ?? {});
    if (!parsed.ok) {
      return {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Invalid message.',
          details: { fields: parsed.issues },
          requestId: REQUEST_ID,
        },
      };
    }
    try {
      const message = await this.chat.send({
        userId: principal.id,
        conversationId: id,
        body: parsed.data.body,
        clientRequestId: parsed.data.clientRequestId,
      });
      return { data: message, meta: { requestId: REQUEST_ID } };
    } catch (err) {
      return this.translate(err);
    }
  }

  private translate(err: unknown): unknown {
    const e = err as { name?: string; response?: { code?: string; message?: string } };
    if (e.name === 'ForbiddenException') {
      return {
        error: {
          code: e.response?.code ?? ErrorCodes.AUTH_SCOPE_DENIED,
          message: e.response?.message ?? 'You do not have access to this resource.',
          requestId: REQUEST_ID,
        },
      };
    }
    if (e.name === 'NotFoundException') {
      return {
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: e.response?.message ?? 'Support resource not found.',
          requestId: REQUEST_ID,
        },
      };
    }
    if (e.name === 'BadRequestException') {
      return {
        error: {
          code: e.response?.code ?? ErrorCodes.VALIDATION_ERROR,
          message: e.response?.message ?? 'Invalid support request.',
          requestId: REQUEST_ID,
        },
      };
    }
    throw err;
  }
}
