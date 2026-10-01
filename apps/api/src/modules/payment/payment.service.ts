import { Inject, Injectable, Optional } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { IdempotencyService } from '../../common/idempotency/idempotency.service.js';
import { CheckoutService } from '../checkout/checkout.service.js';

import {
  IyzicoSandboxAdapter,
  type PaymentInitializeInput,
  type PaymentInitializeResult,
  type PaymentPort,
} from './iyzico-sandbox.adapter.js';

export interface CheckoutPaymentRecord {
  id: string;
  checkoutSessionId: string;
  providerPaymentId: string;
  status: string;
  amountMinor: bigint;
  currency: string;
  idempotencyKey: string;
  createdAt?: Date;
  orderDisplayNumber?: string | null;
  paymentMethodCode?: string | null;
  fulfillmentMode?: string | null;
  provider?: string;
}

/**
 * Payment application service — PaymentAttempt rows persist; iyzico
 * provider status Map may remain ephemeral.
 */
@Injectable()
export class PaymentService {
  readonly #adapter: PaymentPort = new IyzicoSandboxAdapter();
  readonly #attempts = new Map<string, CheckoutPaymentRecord>();
  readonly #byCheckout = new Map<string, string>();
  #seq = 0;

  constructor(
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
    @Optional() @Inject(PrismaService) private readonly prisma: PrismaService | null = null,
    @Optional() @Inject(CheckoutService) private readonly checkout: CheckoutService | null = null,
  ) {}

  get adapter(): IyzicoSandboxAdapter {
    return this.#adapter as IyzicoSandboxAdapter;
  }

  async initialize(input: PaymentInitializeInput): Promise<{
    attempt: CheckoutPaymentRecord;
    provider: PaymentInitializeResult;
    replayed: boolean;
  }> {
    const hit = await this.idempotency.lookup('payment.initialize', input.idempotencyKey);
    if (hit) {
      return hit.response as {
        attempt: CheckoutPaymentRecord;
        provider: PaymentInitializeResult;
        replayed: boolean;
      };
    }
    const provider = await this.#adapter.initialize(input);
    if (!this.prisma) {
      this.#seq += 1;
      const attempt: CheckoutPaymentRecord = {
        id: `01900000-0000-7000-a000-${this.#seq.toString(16).padStart(12, '0').slice(0, 12)}`,
        checkoutSessionId: input.checkoutSessionId,
        providerPaymentId: provider.providerPaymentId,
        status: provider.status,
        amountMinor: input.amountMinor,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        createdAt: new Date(),
        provider: 'iyzico',
      };
      this.#attempts.set(attempt.id, attempt);
      this.#byCheckout.set(input.checkoutSessionId, attempt.id);
      const result = { attempt, provider, replayed: false };
      await this.idempotency.store('payment.initialize', input.idempotencyKey, {
        response: { ...result, replayed: true },
        statusCode: 201,
      });
      return result;
    }

    await this.prisma.checkoutSession.upsert({
      where: { id: input.checkoutSessionId },
      create: {
        id: input.checkoutSessionId,
        status: 'OPEN',
        currency: input.currency,
        finalPayableMinor: input.amountMinor,
      },
      update: {},
    });
    const row = await this.prisma.paymentAttempt.create({
      data: {
        checkoutSessionId: input.checkoutSessionId,
        provider: 'iyzico',
        providerPaymentId: provider.providerPaymentId,
        status: provider.status,
        amountMinor: input.amountMinor,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
      },
    });
    const attempt: CheckoutPaymentRecord = {
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      providerPaymentId: row.providerPaymentId ?? provider.providerPaymentId,
      status: row.status,
      amountMinor: row.amountMinor,
      currency: row.currency,
      idempotencyKey: row.idempotencyKey,
    };
    const result = { attempt, provider, replayed: false };
    await this.idempotency.store('payment.initialize', input.idempotencyKey, {
      response: { ...result, replayed: true },
      statusCode: 201,
    });
    return result;
  }

  async getByCheckout(checkoutSessionId: string): Promise<CheckoutPaymentRecord | null> {
    if (!this.prisma) {
      const id = this.#byCheckout.get(checkoutSessionId);
      if (!id) return null;
      return this.#attempts.get(id) ?? null;
    }
    const row = await this.prisma.paymentAttempt.findFirst({
      where: { checkoutSessionId },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    return {
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      providerPaymentId: row.providerPaymentId ?? '',
      status: row.status,
      amountMinor: row.amountMinor,
      currency: row.currency,
      idempotencyKey: row.idempotencyKey,
    };
  }

  async listPayments(limit = 50, branchId?: string): Promise<CheckoutPaymentRecord[]> {
    if (!this.prisma) {
      if (branchId) return [];
      const attempts = [...this.#attempts.values()].slice(-limit).reverse();
      return Promise.all(
        attempts.map(async (attempt) => {
          const session = this.checkout
            ? await this.checkout.getSession(attempt.checkoutSessionId).catch(() => null)
            : null;
          return { ...attempt, fulfillmentMode: session?.fulfillmentMode ?? null };
        }),
      );
    }
    const checkoutSessionIds = branchId
      ? await this.#checkoutSessionIdsForBranch(branchId)
      : undefined;
    if (checkoutSessionIds && checkoutSessionIds.length === 0) return [];
    const rows = await this.prisma.paymentAttempt.findMany({
      where: checkoutSessionIds ? { checkoutSessionId: { in: checkoutSessionIds } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        checkoutSession: {
          select: { paymentMethodCode: true, fulfillmentMode: true },
        },
      },
    });
    const orders = rows.length
      ? await this.prisma.order.findMany({
          where: { checkoutSessionId: { in: rows.map((row) => row.checkoutSessionId) } },
          select: { checkoutSessionId: true, displayNumber: true },
        })
      : [];
    const orderNumberByCheckout = new Map(
      orders.map((order) => [order.checkoutSessionId, order.displayNumber]),
    );
    return rows.map((row) => ({
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      providerPaymentId: row.providerPaymentId ?? '',
      status: row.status,
      amountMinor: row.amountMinor,
      currency: row.currency,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      orderDisplayNumber: orderNumberByCheckout.get(row.checkoutSessionId) ?? null,
      paymentMethodCode: row.checkoutSession.paymentMethodCode,
      fulfillmentMode: row.checkoutSession.fulfillmentMode,
      provider: row.provider,
    }));
  }

  async getPayment(paymentId: string): Promise<CheckoutPaymentRecord | null> {
    if (!this.prisma) {
      return this.#attempts.get(paymentId) ?? null;
    }
    const row = await this.prisma.paymentAttempt.findUnique({ where: { id: paymentId } });
    if (!row) return null;
    return {
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      providerPaymentId: row.providerPaymentId ?? '',
      status: row.status,
      amountMinor: row.amountMinor,
      currency: row.currency,
      idempotencyKey: row.idempotencyKey,
    };
  }

  async isPaymentInBranch(paymentId: string, branchId: string): Promise<boolean> {
    if (!this.prisma) return false;
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { id: paymentId },
      select: { checkoutSessionId: true },
    });
    if (!attempt) return false;
    const [checkout, order] = await Promise.all([
      this.prisma.checkoutSession.findUnique({
        where: { id: attempt.checkoutSessionId },
        select: { branchId: true },
      }),
      this.prisma.order.findFirst({
        where: { checkoutSessionId: attempt.checkoutSessionId },
        select: { branchId: true },
      }),
    ]);
    return checkout?.branchId === branchId || order?.branchId === branchId;
  }

  async #checkoutSessionIdsForBranch(branchId: string): Promise<string[]> {
    if (!this.prisma) return [];
    const [checkouts, orders] = await Promise.all([
      this.prisma.checkoutSession.findMany({ where: { branchId }, select: { id: true } }),
      this.prisma.order.findMany({
        where: { branchId, checkoutSessionId: { not: null } },
        select: { checkoutSessionId: true },
      }),
    ]);
    return [
      ...new Set([
        ...checkouts.map((row) => row.id),
        ...orders.flatMap((row) => (row.checkoutSessionId ? [row.checkoutSessionId] : [])),
      ]),
    ];
  }

  async applyProviderStatus(
    providerPaymentId: string,
    status: 'PAID' | 'FAILED' | 'PENDING',
  ): Promise<CheckoutPaymentRecord | null> {
    if (status === 'PAID') {
      (this.#adapter as IyzicoSandboxAdapter).markPaid(providerPaymentId);
    }
    if (!this.prisma) {
      for (const attempt of this.#attempts.values()) {
        if (attempt.providerPaymentId === providerPaymentId) {
          attempt.status = status;
          if (status === 'PAID') {
            await this.#finalize(attempt);
          }
          return attempt;
        }
      }
      return null;
    }
    const row = await this.prisma.paymentAttempt.findFirst({
      where: { providerPaymentId },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    const updated = await this.prisma.paymentAttempt.update({
      where: { id: row.id },
      data: { status },
    });
    const attempt: CheckoutPaymentRecord = {
      id: updated.id,
      checkoutSessionId: updated.checkoutSessionId,
      providerPaymentId: updated.providerPaymentId ?? '',
      status: updated.status,
      amountMinor: updated.amountMinor,
      currency: updated.currency,
      idempotencyKey: updated.idempotencyKey,
    };
    if (status === 'PAID') {
      await this.#finalize(attempt);
    }
    return attempt;
  }

  async refreshStatus(checkoutSessionId: string): Promise<CheckoutPaymentRecord | null> {
    const attempt = await this.getByCheckout(checkoutSessionId);
    if (!attempt) return null;
    const status = await this.#adapter.getStatus(attempt.providerPaymentId);
    if (!this.prisma) {
      attempt.status = status;
      if (status === 'PAID') {
        await this.#finalize(attempt);
      }
      return attempt;
    }
    const row = await this.prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status },
    });
    const next: CheckoutPaymentRecord = {
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      providerPaymentId: row.providerPaymentId ?? '',
      status: row.status,
      amountMinor: row.amountMinor,
      currency: row.currency,
      idempotencyKey: row.idempotencyKey,
    };
    if (status === 'PAID') {
      await this.#finalize(next);
    }
    return next;
  }

  async resolveOrderId(checkoutSessionId: string): Promise<string | null> {
    const session = await this.checkout?.getSession(checkoutSessionId);
    if (session?.orderId) return session.orderId;
    if (session && session.status === 'PAID') {
      return this.checkout?.finalizePaid(checkoutSessionId) ?? null;
    }
    return session?.orderId ?? null;
  }

  async #finalize(attempt: CheckoutPaymentRecord): Promise<void> {
    if (attempt.status !== 'PAID' || !this.checkout) return;
    await this.checkout.finalizePaid(attempt.checkoutSessionId);
  }
}
