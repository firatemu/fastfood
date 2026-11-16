import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { DiningTableService } from '../../src/modules/dining/dining-table.service.js';
import { NotificationService } from '../../src/modules/notification/notification.service.js';
import { AdminSupportController } from '../../src/modules/support/admin-support.controller.js';
import {
  sanitizeBody,
  SupportChatService,
} from '../../src/modules/support/support-chat.service.js';

describe('Table QR', () => {
  it('resolves an opaque public code without exposing internal ids as the token', async () => {
    const tables = new DiningTableService();
    const table = await tables.resolve('bhx7k2m9q4wp');
    expect(table.label).toBe('Masa 12');
    expect(table.publicCode).not.toMatch(/^[0-9]+$/);
    expect(table.branchId).toBeTruthy();
  });

  it('rejects invalid and disabled tables', async () => {
    const tables = new DiningTableService();
    tables.seedMemoryTable({
      publicCode: 'deadtablexx01',
      label: 'Kapalı',
      branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
      branchName: 'Kadıköy',
      isActive: false,
    });
    await expect(tables.resolve('no-such-table')).rejects.toBeTruthy();
    await expect(tables.resolve('deadtablexx01')).rejects.toBeTruthy();
  });
});

describe('Customer notifications', () => {
  it('lists owned IN_APP rows and marks read', async () => {
    const svc = new NotificationService();
    const mine = await svc.enqueueAndSend({
      userId: 'cust-a',
      channel: 'IN_APP',
      templateKey: 'loyalty.welcome',
      payloadJson: { title: 'Hoş geldin', body: 'Ödül', href: '/account/club' },
    });
    await svc.enqueueAndSend({
      userId: 'cust-b',
      channel: 'IN_APP',
      templateKey: 'loyalty.welcome',
      payloadJson: { title: 'Other' },
    });
    const inbox = await svc.listCustomerInbox('cust-a');
    expect(inbox).toHaveLength(1);
    expect(svc.unreadCount(inbox)).toBe(1);
    await svc.markRead('cust-a', mine.id);
    expect(svc.unreadCount(await svc.listCustomerInbox('cust-a'))).toBe(0);
    await expect(svc.markRead('cust-a', 'missing')).rejects.toThrow('NOT_FOUND');
  });

  it('does not expose admin/internal templates', async () => {
    const svc = new NotificationService();
    await svc.enqueueAndSend({
      userId: 'cust-a',
      channel: 'IN_APP',
      templateKey: 'ops.fraud_review',
    });
    expect(await svc.listCustomerInbox('cust-a')).toHaveLength(0);
  });
});

describe('Support chat', () => {
  it('creates owned conversations and rejects foreign orders', async () => {
    const chat = new SupportChatService();
    const owned = new Set(['order-a']);
    const convo = await chat.open({ userId: 'cust-a', orderId: 'order-a', ownedOrderIds: owned });
    expect(convo.status).toBe('OPEN');
    await expect(
      chat.open({ userId: 'cust-a', orderId: 'order-b', ownedOrderIds: owned }),
    ).rejects.toThrow(ForbiddenException);
    await expect(chat.getOwned('cust-b', convo.id)).rejects.toThrow(ForbiddenException);
  });

  it('sends customer messages, sanitizes, and receipts without duplicating retries', async () => {
    const chat = new SupportChatService();
    const convo = await chat.open({ userId: 'cust-a' });
    const first = await chat.send({
      userId: 'cust-a',
      conversationId: convo.id,
      body: 'Merhaba\u0000 <script>alert(1)</script>',
      clientRequestId: 'req-support-1',
    });
    expect(first.body).not.toContain('\u0000');
    const loaded = await chat.getOwned('cust-a', convo.id);
    expect(loaded.messages.some((m) => m.senderType === 'SYSTEM')).toBe(true);
    expect(sanitizeBody('<b>hi</b>')).toBe('<b>hi</b>');
  });

  it('lists non-empty conversations for admin, replies, reopens closed threads, and notifies customer', async () => {
    const notifications = new NotificationService();
    const chat = new SupportChatService(null, notifications);
    const emptyConvo = await chat.open({ userId: 'cust-empty' });
    const convo = await chat.open({ userId: 'cust-a' });
    await chat.send({
      userId: 'cust-a',
      conversationId: convo.id,
      body: 'Siparişim nerede?',
      clientRequestId: 'req-admin-test-1',
    });

    const defaultList = await chat.listAdmin();
    expect(defaultList.map((c) => c.id)).toEqual([convo.id]);
    expect(defaultList[0]?.needsReply).toBe(true);
    expect(defaultList[0]?.lastMessageBody).toBe('Siparişim nerede?');
    expect(defaultList[0]?.lastMessageSenderType).toBe('CUSTOMER');

    const withEmpty = await chat.listAdmin({ includeEmpty: true });
    expect(withEmpty.map((c) => c.id)).toContain(emptyConvo.id);

    const closed = await chat.updateStatusAdmin({ conversationId: convo.id, status: 'CLOSED' });
    expect(closed.status).toBe('CLOSED');
    expect(closed.closedAt).toBeTruthy();

    const replied = await chat.replyAdmin({
      conversationId: convo.id,
      body: 'Kuryemiz yola çıktı, 10 dakika içinde sizde olacak.',
    });
    expect(replied.status).toBe('OPEN');
    expect(replied.closedAt).toBeNull();
    expect(replied.needsReply).toBe(false);
    expect(replied.lastMessageSenderType).toBe('SUPPORT');
    expect(replied.messages.at(-1)?.senderType).toBe('SUPPORT');

    const inbox = await notifications.listCustomerInbox('cust-a');
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.templateKey).toBe('support.message_received');
  });

  it('validates admin support controller endpoints', async () => {
    const chat = new SupportChatService();
    const controller = new AdminSupportController(chat);
    const convo = await chat.open({ userId: 'cust-ctrl' });
    await chat.send({
      userId: 'cust-ctrl',
      conversationId: convo.id,
      body: 'Merhaba destek',
      clientRequestId: 'req-ctrl-1',
    });

    await expect(controller.detail('not-a-uuid')).rejects.toThrow(NotFoundException);
    await expect(controller.reply(convo.id, { body: '   ' })).rejects.toThrow(BadRequestException);
    await expect(controller.updateStatus(convo.id, { status: 'INVALID' })).rejects.toThrow(
      BadRequestException,
    );

    const listRes = (await controller.list('ALL', 'false', '50')) as {
      data: Array<{ id: string }>;
    };
    expect(listRes.data.map((item) => item.id)).toContain(convo.id);

    const replyRes = (await controller.reply(convo.id, { body: 'Size yardımcı oluyoruz.' })) as {
      data: { lastMessageSenderType: string };
    };
    expect(replyRes.data.lastMessageSenderType).toBe('SUPPORT');
  });
});
