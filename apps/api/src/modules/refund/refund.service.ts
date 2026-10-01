import { ErrorCodes } from '@fastfood/contracts';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';

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

/**
 * Refund domain service — Prisma Refund + PaymentAttempt at runtime.
 */
@Injectable()
export class RefundService {
  readonly #payments = new Map<
    string,
    { id: string; orderId: string | null; amountMinor: bigint; currency: string; status: string }
  >();
  readonly #refunds = new Map<string, RefundRecord>();
  readonly #byPayment = new Map<string, string[]>();
  #seq = 0;

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
  ) {}

  #newId(): string {
    this.#seq += 1;
    return `01900000-0000-7000-f000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`;
  }

  async registerPaidPayment(input: {
    id: string;
    orderId?: string | null;
    amountMinor: bigint;
    currency?: string;
  }): Promise<void> {
    if (!this.prisma) {
      this.#payments.set(input.id, {
        id: input.id,
        orderId: input.orderId ?? null,
        amountMinor: input.amountMinor,
        currency: input.currency ?? 'TRY',
        status: 'PAID',
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

  async create(input: {
    paymentId: string;
    amountMinor: bigint;
    reason?: string;
  }): Promise<RefundRecord> {
    if (input.amountMinor <= 0n) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Refund amount must be positive.',
      });
    }
    if (!this.prisma) {
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
      const refund: RefundRecord = {
        id: this.#newId(),
        paymentId: input.paymentId,
        orderId: payment.orderId,
        amountMinor: input.amountMinor,
        currency: payment.currency,
        status: 'SUCCEEDED',
        reason: input.reason ?? null,
        createdAt: new Date(),
      };
      this.#refunds.set(refund.id, refund);
      const list = this.#byPayment.get(input.paymentId) ?? [];
      list.push(refund.id);
      this.#byPayment.set(input.paymentId, list);
      return { ...refund };
    }

    const payment = await this.prisma.paymentAttempt.findUnique({
      where: { id: input.paymentId },
    });
    if (!payment || payment.status !== 'PAID') {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Paid payment not found.',
      });
    }
    const prior = await this.prisma.refund.findMany({
      where: { paymentId: input.paymentId, status: { not: 'FAILED' } },
    });
    const already = prior.reduce((sum, r) => sum + r.amountMinor, 0n);
    if (already + input.amountMinor > payment.amountMinor) {
      throw new BadRequestException({
        code: ErrorCodes.REFUND_NOT_ALLOWED,
        message: 'Refund exceeds remaining refundable balance.',
      });
    }
    const row = await this.prisma.refund.create({
      data: {
        paymentId: input.paymentId,
        orderId: null,
        amountMinor: input.amountMinor,
        currency: payment.currency,
        status: 'SUCCEEDED',
        reason: input.reason ?? null,
      },
    });
    return {
      id: row.id,
      paymentId: row.paymentId,
      orderId: row.orderId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      status: row.status as RefundStatus,
      reason: row.reason,
      createdAt: row.createdAt,
    };
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
