import { createHmac, randomBytes } from 'node:crypto';

/**
 * Minimal iyzico REST client (ADR-022). Implements the documented `IYZWSv2`
 * authorization with node:crypto instead of the iyzipay SDK.
 */
export interface IyzicoCredentials {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly secretKey: string;
}

export type IyzicoFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface IyzicoBuyer {
  readonly id: string;
  readonly name: string;
  readonly surname: string;
  readonly email: string;
  readonly gsmNumber?: string;
  readonly identityNumber: string;
  readonly registrationAddress: string;
  readonly city: string;
  readonly country: string;
  readonly ip: string;
}

export interface IyzicoCheckoutFormInitializeRequest {
  readonly conversationId: string;
  readonly price: string;
  readonly paidPrice: string;
  readonly currency: string;
  readonly basketId: string;
  readonly callbackUrl: string;
  readonly buyer: IyzicoBuyer;
  readonly itemName: string;
}

export interface IyzicoCheckoutFormInitializeResult {
  readonly status: string;
  readonly token?: string;
  readonly paymentPageUrl?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface IyzicoCheckoutFormRetrieveResult {
  readonly status: string;
  readonly paymentStatus?: string;
  readonly paymentId?: string;
  readonly basketId?: string;
  readonly price?: number | string;
  readonly paidPrice?: number | string;
  readonly currency?: string;
  readonly token?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

/** `12345n` minor units -> `"123.45"` as iyzico expects. */
export function minorToIyzicoPrice(amountMinor: bigint): string {
  if (amountMinor < 0n) throw new Error('Negative amounts cannot be sent to iyzico.');
  const major = amountMinor / 100n;
  const minor = (amountMinor % 100n).toString().padStart(2, '0');
  return `${major}.${minor}`;
}

/** iyzico price (`123.4`, `"123.45"`) -> minor units; null when unparseable. */
export function iyzicoPriceToMinor(price: number | string | undefined): bigint | null {
  if (price === undefined || price === null) return null;
  const text = typeof price === 'number' ? price.toFixed(2) : price.trim();
  const match = /^(\d+)(?:\.(\d{1,2})\d*)?$/.exec(text);
  if (!match) return null;
  const [, major = '0', fraction = ''] = match;
  return BigInt(major) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function iyzicoAuthorization(
  credentials: Pick<IyzicoCredentials, 'apiKey' | 'secretKey'>,
  randomKey: string,
  uriPath: string,
  body: string,
): string {
  const signature = createHmac('sha256', credentials.secretKey)
    .update(randomKey + uriPath + body)
    .digest('hex');
  const params = `apiKey:${credentials.apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(params).toString('base64')}`;
}

export class IyzicoClient {
  constructor(
    private readonly credentials: IyzicoCredentials,
    private readonly fetchImpl: IyzicoFetch = (url, init) => fetch(url, init),
  ) {}

  initializeCheckoutForm(
    request: IyzicoCheckoutFormInitializeRequest,
  ): Promise<IyzicoCheckoutFormInitializeResult> {
    const body = {
      locale: 'tr',
      conversationId: request.conversationId,
      price: request.price,
      paidPrice: request.paidPrice,
      currency: request.currency,
      basketId: request.basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: request.callbackUrl,
      enabledInstallments: [1],
      buyer: request.buyer,
      shippingAddress: {
        contactName: `${request.buyer.name} ${request.buyer.surname}`,
        city: request.buyer.city,
        country: request.buyer.country,
        address: request.buyer.registrationAddress,
      },
      billingAddress: {
        contactName: `${request.buyer.name} ${request.buyer.surname}`,
        city: request.buyer.city,
        country: request.buyer.country,
        address: request.buyer.registrationAddress,
      },
      basketItems: [
        {
          id: request.basketId,
          name: request.itemName,
          category1: 'Yemek',
          itemType: 'PHYSICAL',
          price: request.price,
        },
      ],
    };
    return this.#post('/payment/iyzipos/checkoutform/initialize/auth/ecom', body);
  }

  retrieveCheckoutForm(
    token: string,
    conversationId?: string,
  ): Promise<IyzicoCheckoutFormRetrieveResult> {
    return this.#post('/payment/iyzipos/checkoutform/auth/ecom/detail', {
      locale: 'tr',
      ...(conversationId ? { conversationId } : {}),
      token,
    });
  }

  async #post<T>(uriPath: string, payload: Record<string, unknown>): Promise<T> {
    const body = JSON.stringify(payload);
    const randomKey = `${Date.now()}${randomBytes(6).toString('hex')}`;
    const response = await this.fetchImpl(
      `${this.credentials.baseUrl.replace(/\/$/, '')}${uriPath}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: iyzicoAuthorization(this.credentials, randomKey, uriPath, body),
          'x-iyzi-rnd': randomKey,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`iyzico returned a non-JSON response (HTTP ${response.status}).`);
    }
  }
}
