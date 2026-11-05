/**
 * Audit P0-1 — a refund is a money movement.
 *
 * The refund record must be dispatched to the payment gateway before it is
 * marked as settled, it must carry the order it belongs to, and it must be
 * mirrored into the append-only audit log.
 */
import { describe, expect, it, vi } from 'vitest';

import { InMemoryAuditLogWriter } from '../../src/common/audit/audit.service.js';
import type {
  PaymentInitializeInput,
  PaymentInitializeResult,
  PaymentPort,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentVerification,
} from '../../src/modules/payment/payment.port.js';
import { RefundService } from '../../src/modules/refund/refund.service.js';

class RecordingPaymentPort implements PaymentPort {
  readonly acceptsClientAssertedStatus = false;
  readonly refundCalls: PaymentRefundInput[] = [];
  result: PaymentRefundResult = { status: 'SUCCEEDED', providerRefundId: 'rf-1' };

  async initialize(_input: PaymentInitializeInput): Promise<PaymentInitializeResult> {
    return { provider: 'iyzico', providerPaymentId: 'tok', status: 'PENDING', redirectUrl: null };
  }

  async verify(_providerPaymentId: string): Promise<PaymentVerification> {
    return { status: 'PAID' };
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    this.refundCalls.push(input);
    return this.result;
  }
}

const ORDER_ID = '01900000-0000-7000-8000-00000000aaaa';

describe('audit P0-1 — refund provider dispatch', () => {
  it('dispatches the refund to the gateway and settles only after the gateway confirms', async () => {
    const port = new RecordingPaymentPort();
    const svc = new RefundService(null, port);

    await svc.registerPaidPayment({
      id: 'pay-1',
      orderId: ORDER_ID,
      amountMinor: 10000n,
      providerPaymentId: 'prov-pay-1',
    });

    const refund = await svc.create({ paymentId: 'pay-1', amountMinor: 4000n, reason: 'customer' });

    expect(port.refundCalls).toHaveLength(1);
    expect(port.refundCalls[0]).toMatchObject({
      providerPaymentId: 'prov-pay-1',
      amountMinor: 4000n,
      currency: 'TRY',
    });
    expect(port.refundCalls[0]?.idempotencyKey).toContain('pay-1');
    expect(refund.status).toBe('SUCCEEDED');
    expect(refund.orderId).toBe(ORDER_ID);
    expect(refund.amountMinor).toBe(4000n);
  });

  it('marks the refund FAILED and rejects when the gateway refuses', async () => {
    const port = new RecordingPaymentPort();
    port.result = { status: 'FAILED', failureCode: 'IYZICO_REFUND_FAILED' };
    const svc = new RefundService(null, port);

    await svc.registerPaidPayment({
      id: 'pay-2',
      orderId: ORDER_ID,
      amountMinor: 10000n,
      providerPaymentId: 'prov-pay-2',
    });

    await expect(svc.create({ paymentId: 'pay-2', amountMinor: 4000n })).rejects.toThrow(
      /IYZICO_REFUND_FAILED/,
    );

    const refunds = await svc.listByPayment('pay-2');
    expect(refunds).toHaveLength(1);
    expect(refunds[0]?.status).toBe('FAILED');
  });

  it('writes the refund to the append-only audit log', async () => {
    const port = new RecordingPaymentPort();
    const audit = new InMemoryAuditLogWriter();
    const svc = new RefundService(null, port, audit);

    await svc.registerPaidPayment({
      id: 'pay-3',
      orderId: ORDER_ID,
      amountMinor: 10000n,
      providerPaymentId: 'prov-pay-3',
    });

    const refund = await svc.create({
      paymentId: 'pay-3',
      amountMinor: 2500n,
      reason: 'damaged item',
      actor: { actorUserId: '01900000-0000-7000-8000-00000000bbbb', actorType: 'STAFF' },
    });

    const entries = await audit.list({ resourceType: 'refund' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'payment.refund',
      resourceType: 'refund',
      resourceId: refund.id,
      actorUserId: '01900000-0000-7000-8000-00000000bbbb',
    });
    expect(entries[0]?.newValues).toMatchObject({
      paymentId: 'pay-3',
      orderId: ORDER_ID,
      amountMinor: '2500',
      status: 'SUCCEEDED',
    });
  });

  it('never marks a refund settled without a gateway call', async () => {
    const port = new RecordingPaymentPort();
    const svc = new RefundService(null, port);

    await svc.registerPaidPayment({
      id: 'pay-4',
      orderId: ORDER_ID,
      amountMinor: 10000n,
      providerPaymentId: 'prov-pay-4',
    });

    await svc.create({ paymentId: 'pay-4', amountMinor: 1000n });

    expect(port.refundCalls).toHaveLength(1);
    // A second refund of the same amount is a separate dispatch.
    await svc.create({ paymentId: 'pay-4', amountMinor: 1000n });
    expect(port.refundCalls).toHaveLength(2);
    expect(port.refundCalls[1]?.idempotencyKey).not.toBe(port.refundCalls[0]?.idempotencyKey);
  });

  it('rejects a refund that exceeds the remaining refundable balance', async () => {
    const port = new RecordingPaymentPort();
    const svc = new RefundService(null, port);

    await svc.registerPaidPayment({
      id: 'pay-5',
      orderId: ORDER_ID,
      amountMinor: 10000n,
      providerPaymentId: 'prov-pay-5',
    });

    await expect(svc.create({ paymentId: 'pay-5', amountMinor: 10001n })).rejects.toThrow(
      /remaining refundable balance/,
    );
    expect(port.refundCalls).toHaveLength(0);
  });

  it('surfaces a gateway outage as a failed refund instead of a silent success', async () => {
    const port = new RecordingPaymentPort();
    port.refund = vi.fn(async () => {
      throw new Error('provider unreachable');
    });
    const svc = new RefundService(null, port);

    await svc.registerPaidPayment({
      id: 'pay-6',
      orderId: ORDER_ID,
      amountMinor: 10000n,
      providerPaymentId: 'prov-pay-6',
    });

    await expect(svc.create({ paymentId: 'pay-6', amountMinor: 1000n })).rejects.toThrow();
    const refunds = await svc.listByPayment('pay-6');
    expect(refunds[0]?.status).toBe('FAILED');
  });
});
