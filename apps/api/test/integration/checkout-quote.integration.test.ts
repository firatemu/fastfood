/**
 * Phase 6 checkout quote — WAVE 0 requires serviceability coordinates.
 */
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CheckoutModule } from '../../src/modules/checkout/checkout.module.js';
import { CartService } from '../../src/modules/cart/cart.service.js';

const CHEESEBURGER_ID = '01900000-0000-7000-8000-cccccccccccc';

describe('Phase 6 checkout quote', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CheckoutModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    app.setGlobalPrefix('/api/v1');
    await app.init();
    (await app.getHttpAdapter()).getInstance().ready();

    const carts = app.get(CartService);
    const cart = await carts.getOrCreateGuestCart('checkout-quote-guest');
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

  it('POST /checkout/quote returns document 37 fields for serviceable location', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/quote',
      headers: {
        'x-session-id': 'checkout-quote-guest',
        'content-type': 'application/json',
      },
      payload: {
        latitude: 41.036,
        longitude: 28.985,
        loyaltyRequestedMinor: '5000',
        loyaltyAvailablePoints: '5000',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: {
        merchandiseGrossSubtotalMinor: string;
        merchandiseNetSubtotalMinor: string;
        finalPayableMinor: string;
        branchId: string;
        deliveryFeeMinor: string;
      };
      error?: { code: string };
    };
    expect(body.error).toBeUndefined();
    // Server-authoritative pricing (audit P0-2): the client posted a unit
    // price of 18000 and a modifier delta of 2000, but the quote is priced
    // from the catalog — 12990 base + 2000 bacon = 14990 per unit, ×2.
    expect(body.data.merchandiseGrossSubtotalMinor).toBe('29980');
    expect(body.data.merchandiseNetSubtotalMinor).toBe('29980');
    expect(body.data.deliveryFeeMinor).toBe('1500');
    expect(body.data.finalPayableMinor).toBe('26480');
    expect(body.data.branchId).toBeTruthy();
  });

  it('POST /checkout/quote pickup skips geo and applies 10% pickup discount', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/quote',
      headers: {
        'x-session-id': 'checkout-quote-guest',
        'content-type': 'application/json',
      },
      payload: {
        fulfillmentMode: 'PICKUP',
        tipMinor: '2500',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data?: {
        fulfillmentMode: string;
        deliveryFeeMinor: string;
        pickupDiscountMinor: string;
        tipMinor: string;
        checkoutSessionId: string;
        finalPayableMinor: string;
      };
      error?: { code: string };
    };
    expect(body.error).toBeUndefined();
    expect(body.data?.fulfillmentMode).toBe('PICKUP');
    expect(body.data?.deliveryFeeMinor).toBe('0');
    // 10% of the authoritative merchandise net (29980) = 2998.
    expect(body.data?.pickupDiscountMinor).toBe('2998');
    expect(body.data?.tipMinor).toBe('2500');
    expect(body.data?.checkoutSessionId).toBeTruthy();
    // 29980 - 2998 pickup + 2500 tip = 29482
    expect(body.data?.finalPayableMinor).toBe('29482');
  });

  it('POST /checkout/quote rejects unserviceable coordinates', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/quote',
      headers: {
        'x-session-id': 'checkout-quote-guest',
        'content-type': 'application/json',
      },
      payload: {
        latitude: 40.0,
        longitude: 29.5,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { error?: { code: string } };
    expect(body.error?.code).toBe('ADDRESS_NOT_SERVICEABLE');
  });

  it('POST /checkout/quote rejects missing coordinates', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/quote',
      headers: {
        'x-session-id': 'checkout-quote-guest',
        'content-type': 'application/json',
      },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { error?: { code: string } };
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('ignores a tampered client price on the cart line (audit P0-2)', async () => {
    if (!app) throw new Error('app not initialized');
    const carts = app.get(CartService);
    const cart = await carts.getOrCreateGuestCart('checkout-quote-tampered');
    // A client that tries to buy the burger for 1 kuruş.
    await carts.addLine(cart.id, {
      productId: CHEESEBURGER_ID,
      quantity: 1,
      unitPriceMinorSnapshot: 1n,
      modifiers: [
        { modifierId: '01900000-0000-7000-8000-ffffffffffff', priceDeltaMinorSnapshot: 0n },
      ],
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/checkout/quote',
      headers: {
        'x-session-id': 'checkout-quote-tampered',
        'content-type': 'application/json',
      },
      payload: { fulfillmentMode: 'PICKUP' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data?: { merchandiseGrossSubtotalMinor: string };
      error?: { code: string };
    };
    expect(body.error).toBeUndefined();
    // Catalog price 12990 + bacon 2000 = 14990 — not the tampered 1.
    expect(body.data?.merchandiseGrossSubtotalMinor).toBe('14990');
  });
});
