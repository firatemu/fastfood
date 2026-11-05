/**
 * Audit P0-1 — refund dispatch against the real database.
 *
 * The refund record must be linked to the order it belongs to (otherwise the
 * branch-scoped revenue report never sees the refund), it must be settled
 * from the gateway result, and it must be audited.
 */
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaAuditLogWriter } from '../../src/common/audit/prisma-audit-log.writer.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { InfrastructureModule } from '../../src/common/infrastructure.module.js';
import { PaymentModule } from '../../src/modules/payment/payment.module.js';
import { RefundModule } from '../../src/modules/refund/refund.module.js';
import { RefundService } from '../../src/modules/refund/refund.service.js';
import { ReportingModule } from '../../src/modules/reporting/reporting.module.js';
import { ReportingService } from '../../src/modules/reporting/reporting.service.js';

const SUFFIX = 'rfd01';

describe('audit P0-1 — refund dispatch (database)', () => {
  let app: NestFastifyApplication | undefined;
  let db: PrismaService;
  let branchId: string;
  let orderId: string;
  let paymentId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [InfrastructureModule, PaymentModule, RefundModule, ReportingModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    app.setGlobalPrefix('/api/v1');
    await app.init();
    (await app.getHttpAdapter()).getInstance().ready();

    db = app.get(PrismaService);
    const branch = await db.branch.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    expect(branch).toBeTruthy();
    branchId = branch!.id;

    const checkoutSession = await db.checkoutSession.create({
      data: {
        status: 'PAID',
        currency: 'TRY',
        finalPayableMinor: 15000n,
        branchId,
      },
    });
    const order = await db.order.create({
      data: {
        branchId,
        checkoutSessionId: checkoutSession.id,
        status: 'PAID',
        currency: 'TRY',
        finalPayableMinor: 15000n,
      },
    });
    await db.checkoutSession.update({
      where: { id: checkoutSession.id },
      data: { orderId: order.id },
    });
    const attempt = await db.paymentAttempt.create({
      data: {
        checkoutSessionId: checkoutSession.id,
        provider: 'iyzico',
        providerPaymentId: `prov-${SUFFIX}`,
        status: 'PAID',
        amountMinor: 15000n,
        currency: 'TRY',
        idempotencyKey: `refund-dispatch-${SUFFIX}`,
      },
    });

    orderId = order.id;
    paymentId = attempt.id;
  });

  afterAll(async () => {
    if (!db) return;
    await db.refund.deleteMany({ where: { paymentId } });
    await db.auditLog.deleteMany({ where: { resourceType: 'refund' } });
    await db.paymentAttempt.deleteMany({ where: { id: paymentId } });
    await db.checkoutSession.updateMany({ where: { orderId }, data: { orderId: null } });
    await db.order.deleteMany({ where: { id: orderId } });
    await db.checkoutSession.deleteMany({ where: { branchId, status: 'PAID' } });
    if (app) await app.close();
  });

  it('settles the refund against the gateway and links it to the order', async () => {
    if (!app) throw new Error('app not initialized');
    const refunds = app.get(RefundService);

    const refund = await refunds.create({
      paymentId,
      amountMinor: 1000n,
      reason: 'integration refund',
    });

    expect(refund.status).toBe('SUCCEEDED');
    // The refund is attributed to the order — not left dangling.
    expect(refund.orderId).toBe(orderId);

    const rows = await refunds.listByPayment(paymentId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.orderId).toBe(orderId);

    const stored = await db.refund.findUnique({ where: { id: refund.id } });
    expect(stored?.orderId).toBe(orderId);
    expect(stored?.status).toBe('SUCCEEDED');

    // The audit log carries the refund (audit P0-1 step 3).
    const auditRows = await app.get(PrismaAuditLogWriter).list({ resourceType: 'refund' });
    const entry = auditRows.find((row) => row.resourceId === refund.id);
    expect(entry).toBeDefined();
    expect(entry?.action).toBe('payment.refund');
    expect(entry?.newValues).toMatchObject({
      paymentId,
      orderId,
      amountMinor: '1000',
      status: 'SUCCEEDED',
    });

    // The branch-scoped revenue report now sees the refund (audit P0-1).
    const reporting = app.get(ReportingService);
    const sales = await reporting.sales(new Set([branchId]));
    const refunded = sales.reduce((sum, row) => sum + row.refundedMinor, 0n);
    expect(refunded).toBe(1000n);
  });

  it('rejects a refund that exceeds the remaining refundable balance', async () => {
    if (!app) throw new Error('app not initialized');
    const refunds = app.get(RefundService);
    await expect(refunds.create({ paymentId, amountMinor: 10_000_000n })).rejects.toThrow(
      /remaining refundable balance/,
    );
  });

  it('refuses a refund whose payment is not linked to an order', async () => {
    if (!app) throw new Error('app not initialized');
    const orphanSession = await db.checkoutSession.create({
      data: { status: 'PAID', currency: 'TRY', finalPayableMinor: 5000n },
    });
    const orphanAttempt = await db.paymentAttempt.create({
      data: {
        checkoutSessionId: orphanSession.id,
        provider: 'iyzico',
        providerPaymentId: `prov-orphan-${SUFFIX}`,
        status: 'PAID',
        amountMinor: 5000n,
        currency: 'TRY',
        idempotencyKey: `refund-orphan-${SUFFIX}`,
      },
    });
    try {
      const refunds = app.get(RefundService);
      await expect(
        refunds.create({ paymentId: orphanAttempt.id, amountMinor: 100n }),
      ).rejects.toThrow(/not linked to an order/);
    } finally {
      await db.paymentAttempt.deleteMany({ where: { id: orphanAttempt.id } });
      await db.checkoutSession.deleteMany({ where: { id: orphanSession.id } });
    }
  });
});
