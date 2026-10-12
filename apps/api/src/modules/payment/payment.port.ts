/**
 * Payment port (document 10 §2). Application code depends on this interface;
 * the iyzico Checkout Form adapter and the simulated adapter implement it.
 */
export type PaymentReturnChannel = 'web' | 'mobile';

export type PaymentProviderStatus = 'INITIATED' | 'PENDING' | 'PAID' | 'FAILED';

export interface PaymentBuyerContext {
  readonly userId?: string;
  readonly displayName?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly ip?: string | null;
}

export interface PaymentInitializeInput {
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly checkoutSessionId: string;
  readonly idempotencyKey: string;
  readonly buyerUserId?: string;
  readonly returnChannel?: PaymentReturnChannel;
  readonly buyer?: PaymentBuyerContext;
}

export interface PaymentInitializeResult {
  readonly provider: 'iyzico';
  readonly providerPaymentId: string;
  readonly status: 'INITIATED' | 'PENDING' | 'FAILED';
  readonly redirectUrl: string | null;
  readonly failureCode?: string;
}

export interface PaymentVerifyExpectation {
  readonly checkoutSessionId: string;
  readonly amountMinor: bigint;
}

export interface PaymentVerification {
  readonly status: PaymentProviderStatus;
  readonly failureCode?: string;
  /** Sanitized provider fields safe to persist (no card data). */
  readonly payload?: Record<string, string | number | null>;
}

export interface PaymentPort {
  /** `true` only for the local/test adapter that trusts client-asserted status. */
  readonly acceptsClientAssertedStatus: boolean;
  initialize(input: PaymentInitializeInput): Promise<PaymentInitializeResult>;
  verify(
    providerPaymentId: string,
    expected: PaymentVerifyExpectation,
  ): Promise<PaymentVerification>;
}

export const PAYMENT_PORT = Symbol('PAYMENT_PORT');
