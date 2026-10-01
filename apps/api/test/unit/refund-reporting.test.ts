/**
 * Phase 9 RefundService + ReportingService unit tests.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { RefundService } from '../../src/modules/refund/refund.service.js';
import { ReportingService } from '../../src/modules/reporting/reporting.service.js';

describe('Phase 9 RefundService', () => {
  it('creates a full refund', async () => {
    const svc = new RefundService();
    await svc.registerPaidPayment({ id: 'pay-1', amountMinor: 10000n });
    const refund = await svc.create({
      paymentId: 'pay-1',
      amountMinor: 10000n,
      reason: 'customer',
    });
    expect(refund.status).toBe('SUCCEEDED');
    expect(refund.amountMinor).toBe(10000n);
  });

  it('allows partial refunds until balance exhausted', async () => {
    const svc = new RefundService();
    await svc.registerPaidPayment({ id: 'pay-1', amountMinor: 10000n });
    await svc.create({ paymentId: 'pay-1', amountMinor: 4000n });
    await svc.create({ paymentId: 'pay-1', amountMinor: 6000n });
    await expect(svc.create({ paymentId: 'pay-1', amountMinor: 1n })).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('Phase 9 ReportingService', () => {
  it('returns seeded sales/branches/products/couriers reports', async () => {
    const svc = new ReportingService();
    expect((await svc.sales()).length).toBeGreaterThan(0);
    expect((await svc.branches()).length).toBeGreaterThan(0);
    expect((await svc.products()).length).toBeGreaterThan(0);
    expect((await svc.couriers()).length).toBeGreaterThan(0);
  });
});
