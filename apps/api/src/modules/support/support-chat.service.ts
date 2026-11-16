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
import { NotificationService } from '../notification/notification.service.js';

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

export interface AdminSupportConversationSummaryDto {
  id: string;
  userId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  orderId: string | null;
  orderDisplayNumber: string | null;
  orderStatus: string | null;
  branchId: string | null;
  branchName: string | null;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messageCount: number;
  customerMessageCount: number;
  lastMessageBody: string | null;
  lastMessageSenderType: SupportSender | null;
  lastMessageAt: string | null;
  needsReply: boolean;
}

export interface AdminSupportConversationDetailDto extends AdminSupportConversationSummaryDto {
  messages: SupportMessageDto[];
}

@Injectable()
export class SupportChatService {
  readonly #conversations = new Map<string, SupportConversationDto>();
  readonly #byUser = new Map<string, string[]>();
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
    @Optional() @Inject(NotificationService) private readonly notifications: NotificationService | null = null,
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
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Conversation not found.',
        });
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
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Conversation not found.',
      });
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
        return (
          c && c.status === 'OPEN' && (input.orderId ? c.orderId === input.orderId : !c.orderId)
        );
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

  async listAdmin(filter?: {
    status?: 'OPEN' | 'CLOSED' | 'ALL';
    includeEmpty?: boolean;
    limit?: number;
  }): Promise<AdminSupportConversationSummaryDto[]> {
    const limit = Math.min(Math.max(filter?.limit ?? 100, 1), 200);
    const statusFilter =
      filter?.status === 'OPEN' || filter?.status === 'CLOSED' ? filter.status : undefined;
    const includeEmpty = filter?.includeEmpty === true;

    if (!this.prisma) {
      const items: AdminSupportConversationSummaryDto[] = [];
      for (const convo of this.#conversations.values()) {
        if (statusFilter && convo.status !== statusFilter) continue;
        if (!includeEmpty && convo.messages.length === 0) continue;
        items.push(this.buildMemoryAdminSummary(convo));
      }
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return items.slice(0, limit);
    }

    const rows = await this.prisma.supportConversation.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(includeEmpty ? {} : { messages: { some: {} } }),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            primaryIdentifier: true,
            customerProfile: {
              select: { phoneNormalized: true, emailNormalized: true },
            },
          },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const orderIds = Array.from(
      new Set(rows.map((r) => r.orderId).filter((id): id is string => Boolean(id))),
    );
    const ordersById = new Map<
      string,
      { displayNumber: string; status: string; branchId: string | null; branchName: string | null }
    >();
    if (orderIds.length > 0) {
      const orderRows = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: {
          id: true,
          displayNumber: true,
          status: true,
          branchId: true,
          branch: { select: { name: true } },
        },
      });
      for (const o of orderRows) {
        ordersById.set(o.id, {
          displayNumber: o.displayNumber,
          status: o.status,
          branchId: o.branchId,
          branchName: o.branch?.name ?? null,
        });
      }
    }

    return rows.map((row) =>
      this.buildPrismaAdminSummary(row, row.orderId ? (ordersById.get(row.orderId) ?? null) : null),
    );
  }

  async getAdmin(conversationId: string): Promise<AdminSupportConversationDetailDto> {
    if (!this.prisma) {
      const convo = this.#conversations.get(conversationId);
      if (!convo) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Conversation not found.',
        });
      }
      return {
        ...this.buildMemoryAdminSummary(convo),
        messages: [...convo.messages],
      };
    }

    const row = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            primaryIdentifier: true,
            customerProfile: {
              select: { phoneNormalized: true, emailNormalized: true },
            },
          },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Conversation not found.',
      });
    }

    const orderInfo = row.orderId
      ? await this.prisma.order.findUnique({
          where: { id: row.orderId },
          select: {
            displayNumber: true,
            status: true,
            branchId: true,
            branch: { select: { name: true } },
          },
        })
      : null;

    const summary = this.buildPrismaAdminSummary(
      row,
      orderInfo
        ? {
            displayNumber: orderInfo.displayNumber,
            status: orderInfo.status,
            branchId: orderInfo.branchId,
            branchName: orderInfo.branch?.name ?? null,
          }
        : null,
    );
    return {
      ...summary,
      messages: row.messages.map((m) => this.mapMessage(m)),
    };
  }

  async replyAdmin(input: {
    conversationId: string;
    body: string;
  }): Promise<AdminSupportConversationDetailDto> {
    const text = sanitizeBody(input.body);
    if (!text) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Message body is required.',
      });
    }

    if (!this.prisma) {
      const convo = this.#conversations.get(input.conversationId);
      if (!convo) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Conversation not found.',
        });
      }
      if (convo.status === 'CLOSED') {
        convo.status = 'OPEN';
        convo.closedAt = null;
      }
      convo.messages.push({
        id: this.newId(),
        conversationId: convo.id,
        senderType: 'SUPPORT',
        body: text,
        createdAt: new Date().toISOString(),
      });
      const userId = this.findMemoryUserId(convo.id);
      if (userId) {
        await this.notifyCustomerReply(userId, convo.orderId, text);
      }
      return this.getAdmin(convo.id);
    }

    const existing = await this.prisma.supportConversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true, userId: true, orderId: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Conversation not found.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          conversationId: existing.id,
          senderType: 'SUPPORT',
          body: text,
        },
      });
      await tx.supportConversation.update({
        where: { id: existing.id },
        data: {
          updatedAt: new Date(),
          ...(existing.status === 'CLOSED' ? { status: 'OPEN', closedAt: null } : {}),
        },
      });
    });

    await this.notifyCustomerReply(existing.userId, existing.orderId, text);
    return this.getAdmin(existing.id);
  }

  async updateStatusAdmin(input: {
    conversationId: string;
    status: SupportStatus;
  }): Promise<AdminSupportConversationDetailDto> {
    if (!this.prisma) {
      const convo = this.#conversations.get(input.conversationId);
      if (!convo) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Conversation not found.',
        });
      }
      convo.status = input.status;
      convo.closedAt = input.status === 'CLOSED' ? new Date().toISOString() : null;
      return this.getAdmin(convo.id);
    }

    const existing = await this.prisma.supportConversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Conversation not found.',
      });
    }

    await this.prisma.supportConversation.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        closedAt: input.status === 'CLOSED' ? new Date() : null,
      },
    });
    return this.getAdmin(existing.id);
  }

  private async notifyCustomerReply(
    userId: string,
    orderId: string | null,
    text: string,
  ): Promise<void> {
    if (!this.notifications) return;
    const href = orderId ? `/account/support?orderId=${orderId}` : '/account/support';
    try {
      await this.notifications.enqueueAndSend({
        userId,
        channel: 'IN_APP',
        templateKey: 'support.message_received',
        payloadJson: {
          title: 'Destek Ekibinden Yeni Yanıt',
          body: text,
          href,
        },
      });
    } catch {
      // Do not fail reply delivery if in-app notification fails.
    }
    try {
      await this.notifications.sendPushNotification({
        title: 'Destek Ekibinden Yeni Yanıt',
        body: text,
        target: 'user',
        userId,
        href,
      });
    } catch {
      // Do not fail reply delivery if push dispatch fails.
    }
  }

  private findMemoryUserId(conversationId: string): string {
    for (const [userId, ids] of this.#byUser.entries()) {
      if (ids.includes(conversationId)) return userId;
    }
    return '';
  }

  private buildMemoryAdminSummary(convo: SupportConversationDto): AdminSupportConversationSummaryDto {
    const userId = this.findMemoryUserId(convo.id);
    const meta = summarizeThread(convo.status, convo.messages, convo.createdAt);
    return {
      id: convo.id,
      userId,
      customerName: null,
      customerPhone: null,
      customerEmail: null,
      orderId: convo.orderId,
      orderDisplayNumber: null,
      orderStatus: null,
      branchId: null,
      branchName: null,
      status: convo.status,
      createdAt: convo.createdAt,
      updatedAt: meta.updatedAt,
      closedAt: convo.closedAt,
      messageCount: meta.messageCount,
      customerMessageCount: meta.customerMessageCount,
      lastMessageBody: meta.lastMessageBody,
      lastMessageSenderType: meta.lastMessageSenderType,
      lastMessageAt: meta.lastMessageAt,
      needsReply: meta.needsReply,
    };
  }

  private buildPrismaAdminSummary(
    row: {
      id: string;
      userId: string;
      orderId: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      closedAt: Date | null;
      user: {
        id: string;
        displayName: string | null;
        primaryIdentifier: string | null;
        customerProfile: {
          phoneNormalized: string | null;
          emailNormalized: string | null;
        } | null;
      };
      messages: Array<{
        id: string;
        conversationId: string;
        senderType: string;
        body: string;
        createdAt: Date;
      }>;
    },
    order: {
      displayNumber: string;
      status: string;
      branchId: string | null;
      branchName: string | null;
    } | null,
  ): AdminSupportConversationSummaryDto {
    const mapped = row.messages.map((m) => this.mapMessage(m));
    const status = row.status as SupportStatus;
    const meta = summarizeThread(status, mapped, row.updatedAt.toISOString());
    return {
      id: row.id,
      userId: row.userId,
      customerName: row.user.displayName ?? null,
      customerPhone: row.user.customerProfile?.phoneNormalized ?? null,
      customerEmail:
        row.user.customerProfile?.emailNormalized ??
        (row.user.primaryIdentifier?.includes('@') ? row.user.primaryIdentifier : null),
      orderId: row.orderId,
      orderDisplayNumber: order?.displayNumber ?? null,
      orderStatus: order?.status ?? null,
      branchId: order?.branchId ?? null,
      branchName: order?.branchName ?? null,
      status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
      messageCount: meta.messageCount,
      customerMessageCount: meta.customerMessageCount,
      lastMessageBody: meta.lastMessageBody,
      lastMessageSenderType: meta.lastMessageSenderType,
      lastMessageAt: meta.lastMessageAt,
      needsReply: meta.needsReply,
    };
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

function summarizeThread(
  status: SupportStatus,
  messages: SupportMessageDto[],
  fallbackUpdatedAt: string,
): {
  updatedAt: string;
  messageCount: number;
  customerMessageCount: number;
  lastMessageBody: string | null;
  lastMessageSenderType: SupportSender | null;
  lastMessageAt: string | null;
  needsReply: boolean;
} {
  const nonSystem = messages.filter((m) => m.senderType !== 'SYSTEM');
  const lastNonSystem = nonSystem.at(-1) ?? null;
  const displayLast = lastNonSystem ?? messages.at(-1) ?? null;
  const latestAny = messages.at(-1) ?? null;
  const customerMessageCount = messages.filter((m) => m.senderType === 'CUSTOMER').length;
  return {
    updatedAt: latestAny?.createdAt ?? fallbackUpdatedAt,
    messageCount: messages.length,
    customerMessageCount,
    lastMessageBody: displayLast?.body ?? null,
    lastMessageSenderType: displayLast?.senderType ?? null,
    lastMessageAt: displayLast?.createdAt ?? null,
    needsReply: status === 'OPEN' && lastNonSystem?.senderType === 'CUSTOMER',
  };
}
