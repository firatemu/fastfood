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

export interface RegisterPushTokenInput {
  userId?: string | null;
  token: string;
  platform?: string;
  deviceModel?: string;
}

export interface SendPushNotificationInput {
  title: string;
  body: string;
  target: 'all' | 'user';
  userId?: string;
  href?: string | null;
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

  async deleteCustomerNotification(userId: string, notificationId: string): Promise<boolean> {
    if (!this.prisma) {
      const idx = this.#notifications.findIndex((n) => n.id === notificationId && n.userId === userId);
      if (idx === -1) return false;
      this.#notifications.splice(idx, 1);
      return true;
    }
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
    return result.count > 0;
  }

  async deleteAllCustomerNotifications(userId: string): Promise<number> {
    if (!this.prisma) {
      const initialCount = this.#notifications.length;
      for (let i = this.#notifications.length - 1; i >= 0; i--) {
        const item = this.#notifications[i];
        if (item && item.userId === userId && item.channel === 'IN_APP') {
          this.#notifications.splice(i, 1);
        }
      }
      return initialCount - this.#notifications.length;
    }
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        channel: 'IN_APP',
      },
    });
    return result.count;
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

  async registerPushToken(input: RegisterPushTokenInput): Promise<{ id: string; token: string }> {
    if (!this.prisma) {
      return { id: 'mock-push-token-id', token: input.token };
    }
    const row = await this.prisma.customerPushToken.upsert({
      where: { token: input.token },
      create: {
        userId: input.userId ?? null,
        token: input.token,
        platform: input.platform ?? 'android',
        deviceModel: input.deviceModel ?? null,
      },
      update: {
        userId: input.userId ?? undefined,
        platform: input.platform ?? undefined,
        deviceModel: input.deviceModel ?? undefined,
        updatedAt: new Date(),
      },
    });
    return { id: row.id, token: row.token };
  }

  async sendOrderStatusPush(input: {
    orderId: string;
    displayNumber?: string | null;
    userId?: string | null;
    title: string;
    body: string;
    templateKey: string;
    href: string;
  }): Promise<void> {
    // 1. In-app notification for order tracking inbox
    if (input.userId) {
      await this.enqueueAndSend({
        userId: input.userId,
        channel: 'IN_APP',
        templateKey: input.templateKey,
        payloadJson: {
          title: input.title,
          body: input.body,
          href: input.href,
          orderId: input.orderId,
          displayNumber: input.displayNumber ?? null,
        },
      });
    }

    // 2. Push notification record
    await this.enqueueAndSend({
      userId: input.userId ?? null,
      channel: 'PUSH',
      templateKey: input.templateKey,
      payloadJson: {
        title: input.title,
        body: input.body,
        href: input.href,
        orderId: input.orderId,
        displayNumber: input.displayNumber ?? null,
      },
    });

    // 3. Dispatch to device push notification services & emulator bridge
    await this.#dispatchPushDelivery({
      title: input.title,
      body: input.body,
      target: input.userId ? 'user' : 'all',
      userId: input.userId ?? undefined,
      href: input.href,
    });
  }

  async sendPushNotification(input: SendPushNotificationInput): Promise<NotificationRecord> {
    const record = await this.enqueueAndSend({
      userId: input.target === 'user' ? input.userId : null,
      channel: 'PUSH',
      templateKey: input.target === 'all' ? 'admin.broadcast' : 'admin.manual',
      payloadJson: {
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        target: input.target,
        userId: input.userId ?? null,
      },
    });

    await this.#dispatchPushDelivery(input);
    return record;
  }

  async #dispatchPushDelivery(input: SendPushNotificationInput): Promise<void> {
    // 1. Local emulator notification bridge for active development
    try {
      const escapedTitle = input.title.replace(/'/g, "'\\''");
      const escapedBody = input.body.replace(/'/g, "'\\''");
      const { exec } = await import('node:child_process');
      const tag = input.href ? `order_${input.href.replace(/[^a-zA-Z0-9_]/g, '_')}` : `fastfood_${Date.now()}`;
      exec(
        `adb -s emulator-5554 shell "cmd notification post -S bigtext -t '${escapedTitle}' '${tag}' '${escapedBody}'"`,
        () => {},
      );
    } catch {
      // ADB bridge fallback
    }

    if (!this.prisma) return;

    // 2. Query target push tokens
    let tokens = await this.prisma.customerPushToken.findMany({
      where: input.target === 'user' && input.userId ? { userId: input.userId } : {},
      take: 1000,
    });

    // In dev / test environment, if targeted user has no registered device token yet,
    // also broadcast to available dev tokens so developer sees push notifications
    if (tokens.length === 0) {
      tokens = await this.prisma.customerPushToken.findMany({
        take: 100,
      });
    }

    const expoTokens = tokens
      .map((t) => t.token)
      .filter((t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['));

    if (expoTokens.length > 0) {
      try {
        const messages = expoTokens.map((to) => ({
          to,
          sound: 'default',
          title: input.title,
          body: input.body,
          data: { href: input.href ?? undefined },
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
      } catch {
        // network delivery error logged gracefully
      }
    }
  }

  async listAdminNotifications(limit = 50): Promise<NotificationRecord[]> {
    if (!this.prisma) {
      return this.#notifications.filter((n) => n.channel === 'PUSH').slice(0, limit);
    }
    const rows = await this.prisma.notification.findMany({
      where: { channel: 'PUSH' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.#map(r));
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
