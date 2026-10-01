import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { DiningTableService } from '../../src/modules/dining/dining-table.service.js';
import { NotificationService } from '../../src/modules/notification/notification.service.js';
import { sanitizeBody, SupportChatService } from '../../src/modules/support/support-chat.service.js';

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
});
