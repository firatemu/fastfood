/**
 * ADR-022 — iyzico Checkout Form client, adapter and verification rules.
 */
import { describe, expect, it, vi } from 'vitest';

import { IdempotencyService } from '../../src/common/idempotency/idempotency.service.js';
import {
  IyzicoCheckoutFormAdapter,
  buildIyzicoBuyer,
} from '../../src/modules/payment/iyzico-checkout-form.adapter.js';
import {
  IyzicoClient,
  iyzicoAuthorization,
  iyzicoPriceToMinor,
  minorToIyzicoPrice,
  type IyzicoFetch,
} from '../../src/modules/payment/iyzico-client.js';
import { IyzicoIntegrationController } from '../../src/modules/payment/iyzico-integration.controller.js';
import type { PaymentPort, PaymentVerification } from '../../src/modules/payment/payment.port.js';
import { PaymentService } from '../../src/modules/payment/payment.service.js';

const CHECKOUT_ID = '01900000-0000-7000-8000-eeeeeeeeeeee';

function jsonFetch(...bodies: unknown[]): {
  fetch: IyzicoFetch;
  calls: { url: string; init: RequestInit }[];
} {
  const calls: { url: string; init: RequestInit }[] = [];
  const queue = [...bodies];
  const fetch: IyzicoFetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(queue.shift() ?? {}), { status: 200 });
  };
  return { fetch, calls };
}

function adapterWith(...bodies: unknown[]) {
  const { fetch, calls } = jsonFetch(...bodies);
  const client = new IyzicoClient(
    { baseUrl: 'https://sandbox-api.iyzipay.com', apiKey: 'key', secretKey: 'secret' },
    fetch,
  );
  return {
    adapter: new IyzicoCheckoutFormAdapter(client, {
      apiBaseUrl: 'https://api.example.test/api/v1',
    }),
    calls,
  };
}

class FakeGatewayPort implements PaymentPort {
  readonly acceptsClientAssertedStatus = false;
  verification: PaymentVerification = { status: 'PENDING' };
  readonly verify = vi.fn(async () => this.verification);

  async initialize() {
    return {
      provider: 'iyzico' as const,
      providerPaymentId: 'cf-token-1',
      status: 'PENDING' as const,
      redirectUrl: 'https://sandbox-cpp.iyzipay.com?token=cf-token-1',
    };
  }
}

describe('iyzico client helpers', () => {
  it('converts minor units to iyzico prices and back', () => {
    expect(minorToIyzicoPrice(12345n)).toBe('123.45');
    expect(minorToIyzicoPrice(500n)).toBe('5.00');
    expect(minorToIyzicoPrice(7n)).toBe('0.07');
    expect(iyzicoPriceToMinor('123.45')).toBe(12345n);
    expect(iyzicoPriceToMinor(123.4)).toBe(12340n);
    expect(iyzicoPriceToMinor(5)).toBe(500n);
    expect(iyzicoPriceToMinor('abc')).toBeNull();
    expect(iyzicoPriceToMinor(undefined)).toBeNull();
  });

  it('builds the documented IYZWSv2 authorization header', () => {
    expect(
      iyzicoAuthorization(
        { apiKey: 'key', secretKey: 'secret' },
        '123456',
        '/payment/test',
        '{"a":1}',
      ),
    ).toBe(
      'IYZWSv2 YXBpS2V5OmtleSZyYW5kb21LZXk6MTIzNDU2JnNpZ25hdHVyZTo4ZTk3ODY4NGU1N2IwMTFhOGM0NjcwMGFiODcxMjQ2ZjRlOGQ3ZDRjM2IyOGUxMGM2NGZiY2E1ZmEzMmJmZTI2',
    );
  });

  it('fills sandbox-safe buyer fallbacks', () => {
    const buyer = buildIyzicoBuyer(CHECKOUT_ID, {
      displayName: 'Ayşe Nur Yılmaz',
      phone: '05551112233',
    });
    expect(buyer).toMatchObject({
      name: 'Ayşe Nur',
      surname: 'Yılmaz',
      gsmNumber: '+905551112233',
      identityNumber: '11111111111',
      email: '01900000000070008000eeeeeeeeeeee@example.com',
    });
    expect(buildIyzicoBuyer(CHECKOUT_ID, undefined)).toMatchObject({
      name: 'Musteri',
      surname: 'Musteri',
    });
  });
});

describe('IyzicoCheckoutFormAdapter', () => {
  it('initializes a Checkout Form with the server amount and channel callback', async () => {
    const { adapter, calls } = adapterWith({
      status: 'success',
      token: 'cf-token-1',
      paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=cf-token-1',
    });
    const result = await adapter.initialize({
      amountMinor: 30500n,
      currency: 'TRY',
      checkoutSessionId: CHECKOUT_ID,
      idempotencyKey: 'idem-key-iyzico-1',
      returnChannel: 'mobile',
    });
    expect(result).toMatchObject({
      providerPaymentId: 'cf-token-1',
      status: 'PENDING',
      redirectUrl: 'https://sandbox-cpp.iyzipay.com?token=cf-token-1',
    });
    expect(calls[0]?.url).toBe(
      'https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom',
    );
    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      price: '305.00',
      paidPrice: '305.00',
      basketId: CHECKOUT_ID,
      callbackUrl: 'https://api.example.test/api/v1/integrations/iyzico/callback?channel=mobile',
    });
    expect(String((calls[0]?.init.headers as Record<string, string>).Authorization)).toMatch(
      /^IYZWSv2 /,
    );
  });

  it('reports provider initialization errors without a token', async () => {
    const { adapter } = adapterWith({ status: 'failure', errorCode: '5', errorMessage: 'bad' });
    const result = await adapter.initialize({
      amountMinor: 100n,
      currency: 'TRY',
      checkoutSessionId: CHECKOUT_ID,
      idempotencyKey: 'idem-key-iyzico-2',
    });
    expect(result).toMatchObject({ status: 'FAILED', failureCode: '5', providerPaymentId: '' });
  });

  const expected = { checkoutSessionId: CHECKOUT_ID, amountMinor: 30500n };

  it('marks PAID only for a matching successful retrieve', async () => {
    const { adapter } = adapterWith({
      status: 'success',
      paymentStatus: 'SUCCESS',
      basketId: CHECKOUT_ID,
      price: 305,
      paidPrice: 305,
      paymentId: '123',
    });
    await expect(adapter.verify('cf-token-1', expected)).resolves.toMatchObject({ status: 'PAID' });
  });

  it('rejects an amount mismatch', async () => {
    const { adapter } = adapterWith({
      status: 'success',
      paymentStatus: 'SUCCESS',
      basketId: CHECKOUT_ID,
      price: 1,
    });
    await expect(adapter.verify('cf-token-1', expected)).resolves.toMatchObject({
      status: 'FAILED',
      failureCode: 'IYZICO_VERIFICATION_MISMATCH',
    });
  });

  it('rejects a basket mismatch', async () => {
    const { adapter } = adapterWith({
      status: 'success',
      paymentStatus: 'SUCCESS',
      basketId: '01900000-0000-7000-8000-ffffffffffff',
      price: 305,
    });
    await expect(adapter.verify('cf-token-1', expected)).resolves.toMatchObject({
      status: 'FAILED',
    });
  });

  it('maps an explicit failure to FAILED and an unpaid form to PENDING', async () => {
    const failed = adapterWith({ status: 'success', paymentStatus: 'FAILURE', errorCode: '10051' });
    await expect(failed.adapter.verify('cf-token-1', expected)).resolves.toMatchObject({
      status: 'FAILED',
      failureCode: '10051',
    });
    const unpaid = adapterWith({ status: 'failure', errorCode: '5122' });
    await expect(unpaid.adapter.verify('cf-token-1', expected)).resolves.toMatchObject({
      status: 'PENDING',
    });
  });
});

describe('PaymentService with the iyzico gateway', () => {
  async function setup() {
    const port = new FakeGatewayPort();
    const payments = new PaymentService(new IdempotencyService(), null, null, port);
    await payments.initialize({
      checkoutSessionId: CHECKOUT_ID,
      amountMinor: 30500n,
      currency: 'TRY',
      idempotencyKey: 'idem-key-iyzico-svc',
    });
    return { port, payments };
  }

  it('refuses client-asserted status', async () => {
    const { payments } = await setup();
    expect(payments.acceptsClientAssertedStatus).toBe(false);
    await expect(payments.applyProviderStatus('cf-token-1', 'PAID')).rejects.toThrow(/simulated/);
  });

  it('verifies a token with the gateway and never downgrades PAID', async () => {
    const { port, payments } = await setup();
    port.verification = { status: 'PAID' };
    const paid = await payments.verifyByProviderPaymentId('cf-token-1');
    expect(paid?.status).toBe('PAID');
    expect(port.verify).toHaveBeenCalledWith('cf-token-1', {
      checkoutSessionId: CHECKOUT_ID,
      amountMinor: 30500n,
    });
    port.verification = { status: 'FAILED' };
    const again = await payments.refreshStatus(CHECKOUT_ID);
    expect(again?.status).toBe('PAID');
    expect(port.verify).toHaveBeenCalledTimes(1);
  });

  it('keeps the attempt pending when the provider is unreachable', async () => {
    const { port, payments } = await setup();
    port.verify.mockRejectedValueOnce(new Error('timeout'));
    const result = await payments.refreshStatus(CHECKOUT_ID);
    expect(result?.status).toBe('PENDING');
  });
});

describe('IyzicoIntegrationController with the iyzico gateway', () => {
  function reply() {
    const state: { status?: number; headers: Record<string, string> } = { headers: {} };
    const r = {
      status(code: number) {
        state.status = code;
        return r;
      },
      header(name: string, value: string) {
        state.headers[name] = value;
        return r;
      },
    };
    return { r, state };
  }

  async function setup() {
    const port = new FakeGatewayPort();
    const payments = new PaymentService(new IdempotencyService(), null, null, port);
    await payments.initialize({
      checkoutSessionId: CHECKOUT_ID,
      amountMinor: 30500n,
      currency: 'TRY',
      idempotencyKey: 'idem-key-iyzico-ctl',
    });
    return { port, controller: new IyzicoIntegrationController(payments) };
  }

  it('ignores a forged webhook status and re-verifies with iyzico', async () => {
    const { port, controller } = await setup();
    const result = (await controller.webhook({
      providerPaymentId: 'cf-token-1',
      status: 'PAID',
    })) as {
      data: { status: string };
    };
    expect(port.verify).toHaveBeenCalled();
    expect(result.data.status).toBe('PENDING');
  });

  it('redirects the browser callback to the mobile return route', async () => {
    const { port, controller } = await setup();
    port.verification = { status: 'PAID' };
    const { r, state } = reply();
    await controller.callback({ token: 'cf-token-1' }, 'mobile', r as never);
    expect(state.status).toBe(303);
    expect(state.headers.Location).toBe(
      `fastfoodcustomer://payment/return?checkoutId=${CHECKOUT_ID}`,
    );
  });

  it('redirects the browser callback to the storefront payment page', async () => {
    const { controller } = await setup();
    const { r, state } = reply();
    await controller.callback({ token: 'cf-token-1' }, 'web', r as never);
    expect(state.status).toBe(303);
    expect(state.headers.Location).toMatch(new RegExp(`/payment/${CHECKOUT_ID}$`));
  });

  it('answers 404 for an unknown token', async () => {
    const { controller } = await setup();
    const { r, state } = reply();
    await controller.callback({ token: 'unknown' }, 'web', r as never);
    expect(state.status).toBe(404);
  });
});
