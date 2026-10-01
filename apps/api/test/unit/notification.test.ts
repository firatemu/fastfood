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
});
