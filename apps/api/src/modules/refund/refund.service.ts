import { ErrorCodes } from '@fastfood/contracts';
import { ActorType } from '@fastfood/domain-types';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import type { Prisma } from '../../../prisma/generated/client/client.js';
import { AUDIT_LOG_WRITER, type AuditLogWriter } from '../../common/audit/audit.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { PAYMENT_PORT, type PaymentPort } from '../payment/payment.port.js';
import { SimulatedPaymentAdapter } from '../payment/simulated-payment.adapter.js';

export type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface RefundRecord {
  id: string;
  paymentId: string;
  orderId: string | null;
  amountMinor: bigint;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  createdAt: Date;
}

/** Actor of a refund — written to the append-only audit log. */
export interface RefundActor {
  readonly actorUserId?: string | null;
  readonly actorType?: ActorType | null;
  readonly branchId?: string | null;
  readonly requestId?: string | null;
}

export interface CreateRefundInput {
  readonly paymentId: string;
  readonly amountMinor: bigint;
  readonly reason?: string;
  readonly actor?: RefundActor;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Refund domain service — Prisma Refund + PaymentAttempt at runtime.
 *
 * Audit P0-1: a refund is a money movement. The record is therefore written
 * as `PENDING` **before** the gateway is called, the gateway result decides
 * the final status, and the whole thing is mirrored into the append-only
 * audit log in the same transaction as the status change. The order the
 * refund belongs to is derived from the payment attempt (never accepted from
 * the caller), so branch-scoped revenue reporting stays correct.
 */
@Injectable()
export class RefundService {
  readonly #payments = new Map<
    string,
    {
      id: string;
      orderId: string | null;
      amountMinor: bigint;
      currency: string;
      status: string;
      providerPaymentId: string | null;
    }
  >();
  readonly #refunds = new Map<string, RefundRecord>();
  readonly #byPayment = new Map<string, string[]>();
  readonly #paymentPort: PaymentPort;
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
    @Optional() @Inject(PAYMENT_PORT) paymentPort: PaymentPort | null = null,
    @Optional() @Inject(AUDIT_LOG_WRITER) private readonly auditLog: AuditLogWriter | null = null,
  ) {
    this.#paymentPort = paymentPort ?? new SimulatedPaymentAdapter();
  }

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-f000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  async registerPaidPayment(input: {
    id: string;
    orderId?: string | null;
    amountMinor: bigint;
    currency?: string;
    providerPaymentId?: string | null;
  }): Promise<void> {
    if (!this.prisma) {
      this.#payments.set(input.id, {
        id: input.id,
        orderId: input.orderId ?? null,
        amountMinor: input.amountMinor,
        currency: input.currency ?? 'TRY',
        status: 'PAID',
        providerPaymentId: input.providerPaymentId ?? `prov-${input.id}`,
      });
      return;
    }
    const checkout = await this.prisma.checkoutSession.create({
      data: {
        status: 'PAID',
        currency: input.currency ?? 'TRY',
        finalPayableMinor: input.amountMinor,
      },
    });
    await this.prisma.paymentAttempt.create({
      data: {
        id: input.id,
        checkoutSessionId: checkout.id,
        status: 'PAID',
        amountMinor: input.amountMinor,
        currency: input.currency ?? 'TRY',
        idempotencyKey: `refund-seed-${input.id}`,
        providerPaymentId: `prov-${input.id}`,
      },
    });
  }

  async create(input: CreateRefundInput): Promise<RefundRecord> {
    if (input.amountMinor <= 0n) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Refund amount must be positive.',
      });
    }
    if (!this.prisma) {
      return this.#createInMemory(input);
    }
    return this.#createInDatabase(input);
  }

  // ─── in-memory fallback (unit tests / isolated modules) ──────────────────

  async #createInMemory(input: CreateRefundInput): Promise<RefundRecord> {
    const payment = this.#payments.get(input.paymentId);
    if (!payment || payment.status !== 'PAID') {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Paid payment not found.',
      });
    }
    const already = (this.#byPayment.get(input.paymentId) ?? [])
      .map((id) => this.#refunds.get(id))
      .filter((r): r is RefundRecord => !!r && r.status !== 'FAILED')
      .reduce((sum, r) => sum + r.amountMinor, 0n);
    if (already + input.amountMinor > payment.amountMinor) {
      throw new BadRequestException({
        code: ErrorCodes.REFUND_NOT_ALLOWED,
        message: 'Refund exceeds remaining refundable balance.',
      });
    }
    const pending: RefundRecord = {
      id: this.#newId(),
      paymentId: input.paymentId,
      orderId: payment.orderId,
      amountMinor: input.amountMinor,
      currency: payment.currency,
      status: 'PENDING',
      reason: input.reason ?? null,
      createdAt: new Date(),
    };
    this.#refunds.set(pending.id, pending);
    const list = this.#byPayment.get(input.paymentId) ?? [];
    list.push(pending.id);
    this.#byPayment.set(input.paymentId, list);

    const settled = await this.#dispatchProvider({
      providerPaymentId: payment.providerPaymentId,
      amountMinor: pending.amountMinor,
      currency: pending.currency,
      idempotencyKey: `refund:${pending.paymentId}:${pending.id}`,
    });

    const refund: RefundRecord = {
      ...pending,
      status: settled.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
    };
    this.#refunds.set(refund.id, refund);
    await this.#appendAudit(refund, input.actor, settled.providerRefundId, settled.failureCode);
    if (refund.status !== 'SUCCEEDED') {
      throw new BadRequestException({
        code: ErrorCodes.PAYMENT_FAILED,
        message: settled.failureCode ?? 'Payment provider rejected the refund.',
      });
    }
    return { ...refund };
  }

  // ─── database path ──────────────────────────────────────────────────────

  async #createInDatabase(input: CreateRefundInput): Promise<RefundRecord> {
    const prisma = this.prisma;
    if (!prisma) throw new Error('Prisma is not available.');
    if (!UUID_PATTERN.test(input.paymentId)) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Paid payment not found.',
      });
    }

    // Phase 1 — reserve the refundable balance and write the PENDING record.
    // The payment attempt row is locked so two concurrent refunds cannot both
    // pass the remaining-balance check.
    const reserved = await prisma.$transaction(async (tx) => {
      const [payment] = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          amount_minor: bigint;
          currency: string;
          provider_payment_id: string | null;
          checkout_session_id: string;
        }>
      >`SELECT id, status, amount_minor, currency, provider_payment_id, checkout_session_id
          FROM payment_attempts
         WHERE id = ${input.paymentId}::uuid
         FOR UPDATE`;
      if (!payment) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Paid payment not found.',
        });
      }
      if (payment.status !== 'PAID') {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Paid payment not found.',
        });
      }
      const prior = await tx.refund.aggregate({
        where: { paymentId: input.paymentId, status: { not: 'FAILED' } },
        _sum: { amountMinor: true },
      });
      const refunded = prior._sum.amountMinor ?? 0n;
      if (refunded + input.amountMinor > payment.amount_minor) {
        throw new BadRequestException({
          code: ErrorCodes.REFUND_NOT_ALLOWED,
          message: 'Refund exceeds remaining refundable balance.',
        });
      }
      const order = await this.#resolveOrder(tx, payment.checkout_session_id);
      if (!order) {
        throw new BadRequestException({
          code: ErrorCodes.REFUND_NOT_ALLOWED,
          message: 'The payment is not linked to an order yet; the refund cannot be recorded.',
        });
      }
      const row = await tx.refund.create({
        data: {
          paymentId: input.paymentId,
          orderId: order.orderId,
          amountMinor: input.amountMinor,
          currency: payment.currency,
          status: 'PENDING',
          reason: input.reason ?? null,
        },
      });
      return {
        id: row.id,
        orderId: order.orderId,
        branchId: order.branchId,
        amountMinor: row.amountMinor,
        currency: row.currency,
        reason: row.reason,
        createdAt: row.createdAt,
        providerPaymentId: payment.provider_payment_id,
      };
    });

    // Phase 2 — dispatch to the gateway. The record already exists as
    // PENDING, so a crash here leaves a reconcilable row instead of a
    // silent money movement.
    const settled = await this.#dispatchProvider({
      providerPaymentId: reserved.providerPaymentId,
      amountMinor: reserved.amountMinor,
      currency: reserved.currency,
      idempotencyKey: `refund:${input.paymentId}:${reserved.id}`,
    });
    const status: RefundStatus = settled.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED';

    // Phase 3 — settle the record and write the audit entry atomically.
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({
        where: { id: reserved.id },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: input.actor?.actorUserId ?? null,
          actorType: input.actor?.actorType ?? ActorType.SYSTEM,
          action: 'payment.refund',
          resourceType: 'refund',
          resourceId: updated.id,
          branchId: reserved.branchId ?? input.actor?.branchId ?? null,
          requestId: input.actor?.requestId ?? null,
          newValuesJson: {
            paymentId: updated.paymentId,
            orderId: updated.orderId,
            amountMinor: updated.amountMinor.toString(),
            currency: updated.currency,
            status: updated.status,
            reason: updated.reason,
            providerRefundId: settled.providerRefundId ?? null,
            failureCode: settled.failureCode ?? null,
          } as Prisma.InputJsonValue,
          reason: updated.reason,
        },
      });
      return updated;
    });

    const refund: RefundRecord = {
      id: row.id,
      paymentId: row.paymentId,
      orderId: row.orderId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      status: row.status as RefundStatus,
      reason: row.reason,
      createdAt: row.createdAt,
    };
    if (refund.status !== 'SUCCEEDED') {
      throw new BadRequestException({
        code: ErrorCodes.PAYMENT_FAILED,
        message: settled.failureCode ?? 'Payment provider rejected the refund.',
      });
    }
    return refund;
  }

  /**
   * The refund always belongs to the order that was created for the payment.
   * `checkout_sessions.order_id` and `orders.checkout_session_id` are the two
   * directions of the same link; either one resolves the order.
   */
  async #resolveOrder(
    tx: Prisma.TransactionClient,
    checkoutSessionId: string,
  ): Promise<{ orderId: string; branchId: string | null } | null> {
    const [session, order] = await Promise.all([
      tx.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        select: { orderId: true },
      }),
      tx.order.findFirst({
        where: { checkoutSessionId },
        select: { id: true, branchId: true },
      }),
    ]);
    if (order) return { orderId: order.id, branchId: order.branchId };
    if (session?.orderId) return { orderId: session.orderId, branchId: null };
    return null;
  }

  async #dispatchProvider(input: {
    providerPaymentId: string | null;
    amountMinor: bigint;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ status: 'SUCCEEDED' | 'FAILED'; providerRefundId?: string; failureCode?: string }> {
    try {
      const result = await this.#paymentPort.refund({
        providerPaymentId: input.providerPaymentId ?? '',
        amountMinor: input.amountMinor,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        status: result.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
        providerRefundId: result.providerRefundId,
        failureCode: result.failureCode,
      };
    } catch (err) {
      return {
        status: 'FAILED',
        failureCode: err instanceof Error ? err.message.slice(0, 64) : 'PROVIDER_UNREACHABLE',
      };
    }
  }

  async #appendAudit(
    refund: RefundRecord,
    actor: RefundActor | undefined,
    providerRefundId: string | undefined,
    failureCode: string | undefined,
  ): Promise<void> {
    if (!this.auditLog) return;
    await this.auditLog.append({
      actorUserId: actor?.actorUserId ?? null,
      actorType: actor?.actorType ?? ActorType.SYSTEM,
      action: 'payment.refund',
      resourceType: 'refund',
      resourceId: refund.id,
      branchId: actor?.branchId ?? null,
      requestId: actor?.requestId ?? null,
      correlationId: null,
      priorValues: null,
      newValues: {
        paymentId: refund.paymentId,
        orderId: refund.orderId,
        amountMinor: refund.amountMinor.toString(),
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        providerRefundId: providerRefundId ?? null,
        failureCode: failureCode ?? null,
      },
      reason: refund.reason,
      ipAddress: null,
      userAgent: null,
    });
  }

  async get(refundId: string): Promise<RefundRecord> {
    if (!this.prisma) {
      const r = this.#refunds.get(refundId);
      if (!r) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Refund not found.' });
      }
      return { ...r };
    }
    const r = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!r) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Refund not found.' });
    }
    return {
      id: r.id,
      paymentId: r.paymentId,
      orderId: r.orderId,
      amountMinor: r.amountMinor,
      currency: r.currency,
      status: r.status as RefundStatus,
      reason: r.reason,
      createdAt: r.createdAt,
    };
  }

  async listByPayment(paymentId: string): Promise<RefundRecord[]> {
    if (!this.prisma) {
      return (this.#byPayment.get(paymentId) ?? [])
        .map((id) => this.#refunds.get(id))
        .filter((r): r is RefundRecord => !!r)
        .map((r) => ({ ...r }));
    }
    const rows = await this.prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      paymentId: r.paymentId,
      orderId: r.orderId,
      amountMinor: r.amountMinor,
      currency: r.currency,
      status: r.status as RefundStatus,
      reason: r.reason,
      createdAt: r.createdAt,
    }));
  }
}
