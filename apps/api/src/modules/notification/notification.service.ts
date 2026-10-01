import { Inject, Injectable, Optional } from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { PrismaService } from '../../common/database/prisma.service.js';

export type NotificationChannel = 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationRecord {
  id: string;
  userId: string | null;
  channel: NotificationChannel;
  templateKey: string;
  status: NotificationStatus;
  payloadJson: Record<string, unknown> | null;
  createdAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
}

export interface EnqueueNotificationInput {
  userId?: string | null;
  channel: NotificationChannel;
  templateKey: string;
  payloadJson?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationService {
  readonly #notifications: NotificationRecord[] = [];
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-b000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  async enqueue(input: EnqueueNotificationInput): Promise<NotificationRecord> {
    if (!this.prisma) {
      const now = new Date();
      const record: NotificationRecord = {
        id: this.#newId(),
        userId: input.userId ?? null,
        channel: input.channel,
        templateKey: input.templateKey,
        status: 'PENDING',
        payloadJson: input.payloadJson ?? null,
        createdAt: now,
        sentAt: null,
        readAt: null,
      };
      this.#notifications.push(record);
      return { ...record };
    }
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId ?? null,
        channel: input.channel,
        templateKey: input.templateKey,
        status: 'PENDING',
        payloadJson: (input.payloadJson ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return this.#map(row);
  }

  async send(notificationId: string): Promise<NotificationRecord> {
    if (!this.prisma) {
      const record = this.#notifications.find((n) => n.id === notificationId);
      if (!record) {
        throw new Error(`Notification ${notificationId} not found`);
      }
      record.status = 'SENT';
      record.sentAt = new Date();
      return { ...record };
    }
    const row = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT', sentAt: new Date() },
    });
    return this.#map(row);
  }

  async enqueueAndSend(input: EnqueueNotificationInput): Promise<NotificationRecord> {
    const created = await this.enqueue(input);
    return this.send(created.id);
  }

  async list(filter?: {
    userId?: string;
    status?: NotificationStatus;
  }): Promise<NotificationRecord[]> {
    if (!this.prisma) {
      return this.#notifications
        .filter((n) => (filter?.userId ? n.userId === filter.userId : true))
        .filter((n) => (filter?.status ? n.status === filter.status : true))
        .map((n) => ({ ...n }));
    }
    const rows = await this.prisma.notification.findMany({
      where: {
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.#map(r));
  }

  #map(row: {
    id: string;
    userId: string | null;
    channel: string;
    templateKey: string;
    status: string;
    payloadJson: unknown;
    createdAt: Date;
    sentAt: Date | null;
    readAt?: Date | null;
  }): NotificationRecord {
    return {
      id: row.id,
      userId: row.userId,
      channel: row.channel as NotificationChannel,
      templateKey: row.templateKey,
      status: row.status as NotificationStatus,
      payloadJson: (row.payloadJson as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      readAt: row.readAt ?? null,
    };
  }

  async listCustomerInbox(userId: string, limit = 50): Promise<NotificationRecord[]> {
    const rows = await this.list({ userId, status: 'SENT' });
    return rows
      .filter((n) => n.channel === 'IN_APP' && isCustomerTemplate(n.templateKey))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  unreadCount(rows: NotificationRecord[]): number {
    return rows.filter((n) => !n.readAt).length;
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationRecord> {
    const owned = (await this.listCustomerInbox(userId, 200)).find((n) => n.id === notificationId);
    if (!owned) {
      throw new Error('NOT_FOUND');
    }
    if (!this.prisma) {
      const record = this.#notifications.find((n) => n.id === notificationId);
      if (!record || record.userId !== userId) throw new Error('NOT_FOUND');
      record.readAt = record.readAt ?? new Date();
      return { ...record };
    }
    const row = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return this.#map(row);
  }

  async markAllRead(userId: string): Promise<number> {
    const inbox = await this.listCustomerInbox(userId, 200);
    const unread = inbox.filter((n) => !n.readAt);
    for (const item of unread) {
      await this.markRead(userId, item.id);
    }
    return unread.length;
  }

  toCustomerPayload(record: NotificationRecord): {
    id: string;
    title: string;
    body: string;
    href: string | null;
    read: boolean;
    createdAt: string;
  } {
    const payload = record.payloadJson ?? {};
    return {
      id: record.id,
      title: typeof payload.title === 'string' ? payload.title : customerTitle(record.templateKey),
      body: typeof payload.body === 'string' ? payload.body : '',
      href: typeof payload.href === 'string' ? payload.href : null,
      read: Boolean(record.readAt),
      createdAt: record.createdAt.toISOString(),
    };
  }
}

const CUSTOMER_TEMPLATES = new Set([
  'loyalty.welcome',
  'loyalty.spin_reward',
  'order.confirmed',
  'order.preparing',
  'order.ready',
  'order.courier_assigned',
  'order.delivered',
  'order.cancelled',
  'support.message_received',
]);

function isCustomerTemplate(key: string): boolean {
  return CUSTOMER_TEMPLATES.has(key);
}

function customerTitle(key: string): string {
  if (key.startsWith('order.')) return 'Sipariş güncellemesi';
  if (key.startsWith('loyalty.')) return 'BURGER HOME CLUB';
  if (key.startsWith('support.')) return 'Destek';
  return 'Bildirim';
}
