/**
 * Phase 7 notification foundation unit tests.
 */
import { describe, expect, it } from 'vitest';

import { NotificationService } from '../../src/modules/notification/notification.service.js';

describe('Phase 7 NotificationService', () => {
  it('enqueues a PENDING notification', async () => {
    const svc = new NotificationService();
    const n = await svc.enqueue({
      userId: 'user-1',
      channel: 'PUSH',
      templateKey: 'order.status.preparing',
      payloadJson: { orderId: 'o-1' },
    });
    expect(n.status).toBe('PENDING');
    expect(n.templateKey).toBe('order.status.preparing');
  });

  it('stub send marks notification SENT', async () => {
    const svc = new NotificationService();
    const sent = await svc.enqueueAndSend({
      userId: 'user-1',
      channel: 'SMS',
      templateKey: 'order.status.delivered',
    });
    expect(sent.status).toBe('SENT');
    expect(sent.sentAt).toBeTruthy();
  });

  it('deletes a single customer notification', async () => {
    const svc = new NotificationService();
    const n = await svc.enqueueAndSend({
      userId: 'user-1',
      channel: 'IN_APP',
      templateKey: 'order.preparing',
    });
    const inboxBefore = await svc.listCustomerInbox('user-1');
    expect(inboxBefore.some((x) => x.id === n.id)).toBe(true);

    const deleted = await svc.deleteCustomerNotification('user-1', n.id);
    expect(deleted).toBe(true);

    const inboxAfter = await svc.listCustomerInbox('user-1');
    expect(inboxAfter.some((x) => x.id === n.id)).toBe(false);
  });

  it('deletes all customer in-app notifications', async () => {
    const svc = new NotificationService();
    await svc.enqueueAndSend({
      userId: 'user-2',
      channel: 'IN_APP',
      templateKey: 'order.preparing',
    });
    await svc.enqueueAndSend({
      userId: 'user-2',
      channel: 'IN_APP',
      templateKey: 'order.ready',
    });
    const inboxBefore = await svc.listCustomerInbox('user-2');
    expect(inboxBefore.length).toBe(2);

    const count = await svc.deleteAllCustomerNotifications('user-2');
    expect(count).toBe(2);

    const inboxAfter = await svc.listCustomerInbox('user-2');
    expect(inboxAfter.length).toBe(0);
  });
});
