import type {
  PaymentInitializeInput,
  PaymentInitializeResult,
  PaymentPort,
  PaymentProviderStatus,
  PaymentVerification,
} from './payment.port.js';

/**
 * Deterministic payment adapter for local development, unit/integration tests
 * and Playwright (`PAYMENT_GATEWAY=simulated`, ADR-022). It never talks to
 * iyzico and trusts client-asserted status, so it is rejected in production.
 */
export class SimulatedPaymentAdapter implements PaymentPort {
  readonly acceptsClientAssertedStatus = true;
  readonly #statuses = new Map<string, PaymentProviderStatus>();

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

  /** Test helper — mark a simulated payment as paid. */
  markPaid(providerPaymentId: string): void {
    this.#statuses.set(providerPaymentId, 'PAID');
  }

  setStatus(providerPaymentId: string, status: PaymentProviderStatus): void {
    this.#statuses.set(providerPaymentId, status);
  }
}
