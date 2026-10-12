/**
 * Phase 6 payment + idempotency unit tests.
 */
import { describe, expect, it } from 'vitest';

import { IdempotencyService } from '../../src/common/idempotency/idempotency.service.js';
import { PaymentService } from '../../src/modules/payment/payment.service.js';

describe('Phase 6 PaymentService + idempotency', () => {
  it('initializes a simulated payment without a hosted page', async () => {
    const payments = new PaymentService(new IdempotencyService());
    const result = await payments.initialize({
      checkoutSessionId: '01900000-0000-7000-8000-cccccccccccc',
      amountMinor: 30500n,
      currency: 'TRY',
      idempotencyKey: 'idem-key-001-abcdef',
    });
    expect(result.provider.provider).toBe('iyzico');
    expect(result.provider.status).toBe('PENDING');
    expect(result.replayed).toBe(false);
    expect(result.provider.providerPaymentId).toMatch(/^sandbox-/);
    expect(result.provider.redirectUrl).toBeNull();
  });

  it('replays identical idempotency key', async () => {
    const payments = new PaymentService(new IdempotencyService());
    const input = {
      checkoutSessionId: '01900000-0000-7000-8000-cccccccccccc',
      amountMinor: 1000n,
      currency: 'TRY',
      idempotencyKey: 'idem-key-002-abcdef',
    };
    const first = await payments.initialize(input);
    const second = await payments.initialize(input);
    expect(second.replayed).toBe(true);
    expect(second.attempt.id).toBe(first.attempt.id);
  });

  it('refreshStatus reflects sandbox markPaid', async () => {
    const payments = new PaymentService(new IdempotencyService());
    const checkoutId = '01900000-0000-7000-8000-dddddddddddd';
    const result = await payments.initialize({
      checkoutSessionId: checkoutId,
      amountMinor: 1000n,
      currency: 'TRY',
      idempotencyKey: 'idem-key-003-abcdef',
    });
    payments.adapter.markPaid(result.provider.providerPaymentId);
    const refreshed = await payments.refreshStatus(checkoutId);
    expect(refreshed?.status).toBe('PAID');
  });
});
