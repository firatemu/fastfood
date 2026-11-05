import type {
  PaymentInitializeInput,
  PaymentInitializeResult,
  PaymentPort,
  PaymentProviderStatus,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentVerification,
} from './payment.port.js';

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Deterministic payment adapter for local development, unit/integration tests
 * and Playwright (`PAYMENT_GATEWAY=simulated`, ADR-022). It never talks to
 * iyzico and trusts client-asserted status, so it is rejected in production.
 *
 * Production-readiness audit P0-6: the adapter fails fast at construction.
 * `production` may never run it; every other environment has to say so
 * explicitly with `ALLOW_SIMULATED_PAYMENTS=true`, except `development` and
 * `test`, which are the environments it was written for.
 */
export class SimulatedPaymentAdapter implements PaymentPort {
  readonly acceptsClientAssertedStatus = true;
  readonly #statuses = new Map<string, PaymentProviderStatus>();
  readonly #refunded = new Map<string, bigint>();

  constructor(options: { nodeEnv?: string; explicitlyAllowed?: boolean } = {}) {
    const nodeEnv = options.nodeEnv ?? process.env['NODE_ENV'] ?? 'development';
    const explicitlyAllowed =
      options.explicitlyAllowed ?? isTruthyEnv(process.env['ALLOW_SIMULATED_PAYMENTS']);
    if (nodeEnv === 'production') {
      throw new Error(
        'Simulated payments are not allowed when NODE_ENV=production. Set PAYMENT_GATEWAY=iyzico.',
      );
    }
    if (nodeEnv !== 'development' && nodeEnv !== 'test' && !explicitlyAllowed) {
      throw new Error(
        'Simulated payments require ALLOW_SIMULATED_PAYMENTS=true outside development/test.',
      );
    }
  }

  async initialize(input: PaymentInitializeInput): Promise<PaymentInitializeResult> {
    if (input.amountMinor <= 0n) {
      return {
        provider: 'iyzico',
        providerPaymentId: '',
        status: 'FAILED',
        redirectUrl: null,
      };
    }
    const providerPaymentId = `sandbox-${input.idempotencyKey.slice(0, 24)}`;
    this.#statuses.set(providerPaymentId, 'PENDING');
    return {
      provider: 'iyzico',
      providerPaymentId,
      status: 'PENDING',
      // No hosted page exists; tests drive the outcome through the webhook.
      redirectUrl: null,
    };
  }

  async verify(providerPaymentId: string): Promise<PaymentVerification> {
    return { status: this.#statuses.get(providerPaymentId) ?? 'FAILED' };
  }

  /**
   * Sandbox refund (audit P0-1). The refund is recorded against the provider
   * payment id so a repeated dispatch of the same amount is visible to the
   * caller, but it never moves real money.
   */
  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    if (input.amountMinor <= 0n) {
      return { status: 'FAILED', failureCode: 'SIMULATED_REFUND_INVALID_AMOUNT' };
    }
    const key = input.providerPaymentId || input.idempotencyKey;
    const refunded = this.#refunded.get(key) ?? 0n;
    this.#refunded.set(key, refunded + input.amountMinor);
    return {
      status: 'SUCCEEDED',
      providerRefundId: `sandbox-refund-${input.idempotencyKey.slice(0, 24)}`,
    };
  }

  /** Test helper — total amount refunded for a provider payment id. */
  refundedAmount(providerPaymentId: string): bigint {
    return this.#refunded.get(providerPaymentId) ?? 0n;
  }

  /** Test helper — mark a simulated payment as paid. */
  markPaid(providerPaymentId: string): void {
    this.#statuses.set(providerPaymentId, 'PAID');
  }

  setStatus(providerPaymentId: string, status: PaymentProviderStatus): void {
    this.#statuses.set(providerPaymentId, status);
  }
}
