import {
  iyzicoPriceToMinor,
  minorToIyzicoPrice,
  type IyzicoBuyer,
  type IyzicoCheckoutFormRetrieveResult,
  type IyzicoClient,
} from './iyzico-client.js';
import type {
  PaymentBuyerContext,
  PaymentInitializeInput,
  PaymentInitializeResult,
  PaymentPort,
  PaymentVerification,
  PaymentVerifyExpectation,
} from './payment.port.js';

export interface IyzicoCheckoutFormConfig {
  /** Absolute API origin + base path, e.g. `https://api.example/api/v1`. */
  readonly apiBaseUrl: string;
}

/** Sandbox-safe values for buyer fields FASTFOOD does not collect (ADR-022 §7). */
const FALLBACK_IDENTITY_NUMBER = '11111111111';
const FALLBACK_ADDRESS = 'BURGER HOME teslimat adresi';
const FALLBACK_CITY = 'Istanbul';
const FALLBACK_COUNTRY = 'Turkey';
const FALLBACK_IP = '127.0.0.1';

function splitName(displayName: string | null | undefined): { name: string; surname: string } {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts.pop() : undefined;
  return { name: parts.join(' ') || 'Musteri', surname: surname ?? 'Musteri' };
}

function normalizeGsm(phone: string | null | undefined): string | undefined {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('90')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+9${digits}`;
  if (digits.length === 10) return `+90${digits}`;
  return undefined;
}

export function buildIyzicoBuyer(
  checkoutSessionId: string,
  context: PaymentBuyerContext | undefined,
): IyzicoBuyer {
  const { name, surname } = splitName(context?.displayName);
  const id = context?.userId ?? checkoutSessionId;
  const email =
    context?.email && context.email.includes('@')
      ? context.email
      : `${id.replace(/-/g, '')}@example.com`;
  const gsmNumber = normalizeGsm(context?.phone);
  return {
    id,
    name,
    surname,
    email,
    ...(gsmNumber ? { gsmNumber } : {}),
    identityNumber: FALLBACK_IDENTITY_NUMBER,
    registrationAddress: FALLBACK_ADDRESS,
    city: FALLBACK_CITY,
    country: FALLBACK_COUNTRY,
    ip: context?.ip?.trim() || FALLBACK_IP,
  };
}

function sanitize(
  result: IyzicoCheckoutFormRetrieveResult,
): Record<string, string | number | null> {
  return {
    status: result.status ?? null,
    paymentStatus: result.paymentStatus ?? null,
    paymentId: result.paymentId ?? null,
    basketId: result.basketId ?? null,
    price: result.price ?? null,
    paidPrice: result.paidPrice ?? null,
    currency: result.currency ?? null,
    errorCode: result.errorCode ?? null,
  };
}

/**
 * iyzico Checkout Form adapter (ADR-022). The customer enters card data and
 * completes 3-D Secure on iyzico's hosted page; payment state is only ever
 * taken from a server-side retrieve call.
 */
export class IyzicoCheckoutFormAdapter implements PaymentPort {
  readonly acceptsClientAssertedStatus = false;

  constructor(
    private readonly client: IyzicoClient,
    private readonly config: IyzicoCheckoutFormConfig,
  ) {}

  async initialize(input: PaymentInitializeInput): Promise<PaymentInitializeResult> {
    if (input.amountMinor <= 0n) {
      return { provider: 'iyzico', providerPaymentId: '', status: 'FAILED', redirectUrl: null };
    }
    const price = minorToIyzicoPrice(input.amountMinor);
    const channel = input.returnChannel ?? 'web';
    const result = await this.client.initializeCheckoutForm({
      conversationId: input.checkoutSessionId,
      price,
      paidPrice: price,
      currency: input.currency,
      basketId: input.checkoutSessionId,
      callbackUrl: `${this.config.apiBaseUrl.replace(/\/$/, '')}/integrations/iyzico/callback?channel=${channel}`,
      buyer: buildIyzicoBuyer(input.checkoutSessionId, {
        ...input.buyer,
        userId: input.buyer?.userId ?? input.buyerUserId,
      }),
      itemName: 'BURGER HOME siparişi',
    });
    if (result.status !== 'success' || !result.token || !result.paymentPageUrl) {
      return {
        provider: 'iyzico',
        providerPaymentId: '',
        status: 'FAILED',
        redirectUrl: null,
        failureCode: result.errorCode ?? 'IYZICO_INITIALIZE_FAILED',
      };
    }
    return {
      provider: 'iyzico',
      providerPaymentId: result.token,
      status: 'PENDING',
      redirectUrl: result.paymentPageUrl,
    };
  }

  async verify(
    providerPaymentId: string,
    expected: PaymentVerifyExpectation,
  ): Promise<PaymentVerification> {
    const result = await this.client.retrieveCheckoutForm(
      providerPaymentId,
      expected.checkoutSessionId,
    );
    const payload = sanitize(result);
    if (result.status !== 'success') {
      return { status: 'PENDING', failureCode: result.errorCode, payload };
    }
    if (result.paymentStatus === 'SUCCESS') {
      const priceMinor = iyzicoPriceToMinor(result.price);
      if (result.basketId !== expected.checkoutSessionId || priceMinor !== expected.amountMinor) {
        return { status: 'FAILED', failureCode: 'IYZICO_VERIFICATION_MISMATCH', payload };
      }
      return { status: 'PAID', payload };
    }
    if (result.paymentStatus === 'FAILURE') {
      return {
        status: 'FAILED',
        failureCode: result.errorCode ?? 'IYZICO_PAYMENT_FAILED',
        payload,
      };
    }
    return { status: 'PENDING', payload };
  }
}
