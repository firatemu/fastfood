import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

const MAX_BODY = 2000;
const SYSTEM_RECEIPT =
  'Mesajınız alındı. BURGER HOME destek ekibi açık bir konuşmada yanıtlayacak.';

export type SupportSender = 'CUSTOMER' | 'SUPPORT' | 'SYSTEM';
export type SupportStatus = 'OPEN' | 'CLOSED';

export interface SupportMessageDto {
  id: string;
  conversationId: string;
  senderType: SupportSender;
  body: string;
  createdAt: string;
}

export interface SupportConversationDto {
  id: string;
  orderId: string | null;
  status: SupportStatus;
  createdAt: string;
  closedAt: string | null;
  messages: SupportMessageDto[];
}

@Injectable()
export class SupportChatService {
  readonly #conversations = new Map<string, SupportConversationDto>();
  readonly #byUser = new Map<string, string[]>();
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  async list(userId: string): Promise<Omit<SupportConversationDto, 'messages'>[]> {
    if (!this.prisma) {
      return (this.#byUser.get(userId) ?? [])
        .map((id) => this.#conversations.get(id))
        .filter((c): c is SupportConversationDto => Boolean(c))
        .map(({ messages: _m, ...rest }) => rest);
    }
    const rows = await this.prisma.supportConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      status: row.status as SupportStatus,
      createdAt: row.createdAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
    }));
  }

  async getOwned(userId: string, conversationId: string): Promise<SupportConversationDto> {
    if (!this.prisma) {
      const convo = this.#conversations.get(conversationId);
      if (!convo) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Conversation not found.' });
      }
      const owned = (this.#byUser.get(userId) ?? []).includes(conversationId);
      if (!owned) {
        throw new ForbiddenException({
          code: ErrorCodes.AUTH_SCOPE_DENIED,
          message: 'You do not have access to this resource.',
        });
      }
      return convo;
    }
    const row = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Conversation not found.' });
    }
    if (row.userId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.AUTH_SCOPE_DENIED,
        message: 'You do not have access to this resource.',
      });
    }
    return this.mapRow(row);
  }

  async open(input: {
    userId: string;
    orderId?: string | null;
    ownedOrderIds?: Set<string>;
  }): Promise<SupportConversationDto> {
    if (input.orderId) {
      if (!input.ownedOrderIds?.has(input.orderId)) {
        throw new ForbiddenException({
          code: ErrorCodes.AUTH_SCOPE_DENIED,
          message: 'You do not have access to this resource.',
        });
      }
    }
    if (!this.prisma) {
      const existingId = (this.#byUser.get(input.userId) ?? []).find((id) => {
        const c = this.#conversations.get(id);
        return c && c.status === 'OPEN' && (input.orderId ? c.orderId === input.orderId : !c.orderId);
      });
      if (existingId) return this.getOwned(input.userId, existingId);
      const created: SupportConversationDto = {
        id: this.newId(),
        orderId: input.orderId ?? null,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        closedAt: null,
        messages: [],
      };
      this.#conversations.set(created.id, created);
      const list = this.#byUser.get(input.userId) ?? [];
      list.unshift(created.id);
      this.#byUser.set(input.userId, list);
      return created;
    }
    const existing = await this.prisma.supportConversation.findFirst({
      where: {
        userId: input.userId,
        status: 'OPEN',
        orderId: input.orderId ?? null,
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) return this.mapRow(existing);
    const row = await this.prisma.supportConversation.create({
      data: { userId: input.userId, orderId: input.orderId ?? null },
      include: { messages: true },
    });
    return this.mapRow(row);
  }

  async send(input: {
    userId: string;
    conversationId: string;
    body: string;
    clientRequestId?: string | null;
  }): Promise<SupportMessageDto> {
    const text = sanitizeBody(input.body);
    if (!text) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Message body is required.',
      });
    }
    const convo = await this.getOwned(input.userId, input.conversationId);
    if (convo.status !== 'OPEN') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Conversation is closed.',
      });
    }
    if (!this.prisma) {
      if (input.clientRequestId) {
        const replay = convo.messages.find(
          (m) => m.id === `req:${input.clientRequestId}` || m.body === text,
        );
        const existing = convo.messages.find((m) => m.id.endsWith(input.clientRequestId ?? ''));
        if (existing) return existing;
        void replay;
      }
      const message: SupportMessageDto = {
        id: this.newId(),
        conversationId: convo.id,
        senderType: 'CUSTOMER',
        body: text,
        createdAt: new Date().toISOString(),
      };
      convo.messages.push(message);
      if (convo.messages.filter((m) => m.senderType === 'CUSTOMER').length === 1) {
        convo.messages.push({
          id: this.newId(),
          conversationId: convo.id,
          senderType: 'SYSTEM',
          body: SYSTEM_RECEIPT,
          createdAt: new Date().toISOString(),
        });
      }
      return message;
    }
    if (input.clientRequestId) {
      const replay = await this.prisma.supportMessage.findUnique({
        where: {
          conversationId_clientRequestId: {
            conversationId: convo.id,
            clientRequestId: input.clientRequestId,
          },
        },
      });
      if (replay) return this.mapMessage(replay);
    }
    const customerCount = await this.prisma.supportMessage.count({
      where: { conversationId: convo.id, senderType: 'CUSTOMER' },
    });
    try {
      const row = await this.prisma.supportMessage.create({
        data: {
          conversationId: convo.id,
          senderType: 'CUSTOMER',
          body: text,
          clientRequestId: input.clientRequestId ?? null,
        },
      });
      if (customerCount === 0) {
        await this.prisma.supportMessage.create({
          data: {
            conversationId: convo.id,
            senderType: 'SYSTEM',
            body: SYSTEM_RECEIPT,
          },
        });
      }
      await this.prisma.supportConversation.update({
        where: { id: convo.id },
        data: { updatedAt: new Date() },
      });
      return this.mapMessage(row);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002' && input.clientRequestId) {
        const replay = await this.prisma.supportMessage.findUnique({
          where: {
            conversationId_clientRequestId: {
              conversationId: convo.id,
              clientRequestId: input.clientRequestId,
            },
          },
        });
        if (replay) return this.mapMessage(replay);
      }
      throw err;
    }
  }

  private mapRow(row: {
    id: string;
    orderId: string | null;
    status: string;
    createdAt: Date;
    closedAt: Date | null;
    messages: Array<{
      id: string;
      conversationId: string;
      senderType: string;
      body: string;
      createdAt: Date;
    }>;
  }): SupportConversationDto {
    return {
      id: row.id,
      orderId: row.orderId,
      status: row.status as SupportStatus,
      createdAt: row.createdAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
      messages: row.messages.map((m) => this.mapMessage(m)),
    };
  }

  private mapMessage(row: {
    id: string;
    conversationId: string;
    senderType: string;
    body: string;
    createdAt: Date;
  }): SupportMessageDto {
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderType: row.senderType as SupportSender,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-c300-${this.#seq.toString(16).padStart(12, '0')}`;
  }
}

export function sanitizeBody(raw: string): string {
  let out = '';
  for (const char of raw) {
    const code = char.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    out += char;
  }
  return out.trim().slice(0, MAX_BODY);
}
