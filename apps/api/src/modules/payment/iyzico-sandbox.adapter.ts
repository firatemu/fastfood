/**
 * Payment port + iyzico sandbox adapter (document 32 lock-in).
 *
 * Sandbox/test only. No production credentials. The adapter returns
 * deterministic synthetic provider payment ids for development.
 */
export interface PaymentInitializeInput {
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly checkoutSessionId: string;
  readonly idempotencyKey: string;
  readonly buyerUserId?: string;
}

export interface PaymentInitializeResult {
  readonly provider: 'iyzico';
  readonly providerPaymentId: string;
  readonly status: 'INITIATED' | 'PENDING' | 'FAILED';
  readonly redirectUrl: string | null;
}

export interface PaymentPort {
  initialize(input: PaymentInitializeInput): Promise<PaymentInitializeResult>;
  getStatus(providerPaymentId: string): Promise<'INITIATED' | 'PENDING' | 'PAID' | 'FAILED'>;
}

export class IyzicoSandboxAdapter implements PaymentPort {
  readonly #statuses = new Map<string, 'INITIATED' | 'PENDING' | 'PAID' | 'FAILED'>();

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
      redirectUrl: `https://sandbox-api.iyzipay.com/payment/${providerPaymentId}`,
    };
  }

  async getStatus(providerPaymentId: string): Promise<'INITIATED' | 'PENDING' | 'PAID' | 'FAILED'> {
    return this.#statuses.get(providerPaymentId) ?? 'FAILED';
  }

  /** Test helper — mark a sandbox payment as paid. */
  markPaid(providerPaymentId: string): void {
    this.#statuses.set(providerPaymentId, 'PAID');
  }
}
