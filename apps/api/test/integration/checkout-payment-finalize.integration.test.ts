/**
 * Checkout payment initialize amount + paid session → Order id.
 */
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CartService } from '../../src/modules/cart/cart.service.js';
import { CheckoutModule } from '../../src/modules/checkout/checkout.module.js';
import { PaymentModule } from '../../src/modules/payment/payment.module.js';

const CHEESEBURGER_ID = '01900000-0000-7000-8000-cccccccccccc';

describe('checkout payment finalization', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CheckoutModule, PaymentModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    app.setGlobalPrefix('/api/v1');
    await app.init();
    (await app.getHttpAdapter()).getInstance().ready();

    const carts = app.get(CartService);
    const cart = await carts.getOrCreateGuestCart('checkout-pay-guest');
    await carts.addLine(cart.id, {
      productId: CHEESEBURGER_ID,
      quantity: 2,
      unitPriceMinorSnapshot: 18000n,
      modifiers: [
        { modifierId: '01900000-0000-7000-8000-ffffffffffff', priceDeltaMinorSnapshot: 2000n },
      ],
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('initializes the quoted amount and returns orderId after sandbox PAID', async () => {
    if (!app) throw new Error('app not initialized');
    const quoteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/quote',
      headers: { 'x-session-id': 'checkout-pay-guest', 'content-type': 'application/json' },
      payload: { fulfillmentMode: 'PICKUP' },
    });
    expect(quoteRes.statusCode).toBe(200);
    const quote = quoteRes.json() as {
      data: { checkoutSessionId: string; finalPayableMinor: string; currency: string };
    };
    const checkoutSessionId = quote.data.checkoutSessionId;

    const mismatch = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/payment/initialize',
      headers: { 'x-session-id': 'checkout-pay-guest', 'content-type': 'application/json' },
      payload: {
        checkoutSessionId,
        amountMinor: '1',
        currency: quote.data.currency,
        idempotencyKey: 'idem-mismatch-amount-01',
      },
    });
    expect(mismatch.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });

    const init = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/payment/initialize',
      headers: { 'x-session-id': 'checkout-pay-guest', 'content-type': 'application/json' },
      payload: {
        checkoutSessionId,
        amountMinor: quote.data.finalPayableMinor,
        currency: quote.data.currency,
        idempotencyKey: 'idem-checkout-pay-guest-01',
      },
    });
    expect(init.statusCode).toBe(201);
    const initBody = init.json() as {
      data: { providerPaymentId: string; amountMinor: string };
    };
    expect(initBody.data.amountMinor).toBe(quote.data.finalPayableMinor);

    const paid = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/iyzico/webhook',
      headers: { 'content-type': 'application/json' },
      payload: { providerPaymentId: initBody.data.providerPaymentId, status: 'PAID' },
    });
    expect(paid.statusCode).toBe(200);
    const paidBody = paid.json() as { data: { orderId: string | null } };
    expect(paidBody.data.orderId).toBeTruthy();

    const again = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/iyzico/webhook',
      headers: { 'content-type': 'application/json' },
      payload: { providerPaymentId: initBody.data.providerPaymentId, status: 'PAID' },
    });
    expect(again.json()).toMatchObject({ data: { orderId: paidBody.data.orderId } });

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/checkout/status/${checkoutSessionId}`,
    });
    const statusBody = status.json() as { data: { orderId: string | null; status: string } };
    expect(statusBody.data.status).toBe('PAID');
    expect(statusBody.data.orderId).toBe(paidBody.data.orderId);

    const confirmation = await app.inject({
      method: 'GET',
      url: `/api/v1/checkout/orders/${paidBody.data.orderId}`,
      headers: { 'x-session-id': 'checkout-pay-guest' },
    });
    expect(confirmation.statusCode).toBe(200);
    const conf = confirmation.json() as { data: { id: string; fulfillmentMode: string } };
    expect(conf.data.id).toBe(paidBody.data.orderId);
    expect(conf.data.fulfillmentMode).toBe('PICKUP');
  });
});
