/**
 * Phase 5 storefront cart smoke (document 06 + 09 + 41).
 *
 * In-process Nest/Fastify integration: boots CartApiModule (no database),
 * exercises the guest cart happy path end-to-end via HTTP:
 *   GET empty cart → POST line → GET cart → POST quote → PATCH line → DELETE line
 *
 * Playwright Web smoke for the storefront UI remains Phase 10
 * (`tests/e2e/`); this work item covers the API cart surface.
 */
import { ErrorCodes } from '@fastfood/contracts';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CartApiModule } from '../../src/modules/cart/cart-api.module.js';

const CHEESEBURGER_ID = '01900000-0000-7000-8000-cccccccccccc';
const GUEST_SESSION = 'smoke-guest-session-001';

let app: NestFastifyApplication | undefined;

describe('Phase 5 storefront cart smoke (integration)', () => {
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CartApiModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    app.setGlobalPrefix('/api/v1');
    await app.init();
    (await app.getHttpAdapter()).getInstance().ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('guest cart happy path: add → get → quote → update → remove', async () => {
    if (!app) throw new Error('app not initialized');

    const sessionHeaders = {
      'x-session-id': GUEST_SESSION,
    };
    const jsonHeaders = {
      ...sessionHeaders,
      'content-type': 'application/json',
    };

    // Empty cart
    const empty = await app.inject({
      method: 'GET',
      url: '/api/v1/storefront/cart',
      headers: sessionHeaders,
    });
    expect(empty.statusCode).toBe(200);
    const emptyBody = empty.json() as {
      data: { lineItems: unknown[]; guestSessionId: string | null };
    };
    expect(emptyBody.data.lineItems).toEqual([]);
    expect(emptyBody.data.guestSessionId).toBe(GUEST_SESSION);

    // Add classic cheeseburger
    const added = await app.inject({
      method: 'POST',
      url: '/api/v1/storefront/cart/lines',
      headers: jsonHeaders,
      payload: {
        productId: CHEESEBURGER_ID,
        quantity: 2,
      },
    });
    expect(added.statusCode).toBe(201);
    const addedBody = added.json() as {
      data: {
        lineItems: {
          id: string;
          productId: string;
          quantity: number;
          unitPriceMinorSnapshot: string;
        }[];
      };
    };
    expect(addedBody.data.lineItems).toHaveLength(1);
    expect(addedBody.data.lineItems[0]?.productId).toBe(CHEESEBURGER_ID);
    expect(addedBody.data.lineItems[0]?.quantity).toBe(2);
    expect(addedBody.data.lineItems[0]?.unitPriceMinorSnapshot).toBe('12990');
    const lineId = addedBody.data.lineItems[0]!.id;

    // Get cart
    const got = await app.inject({
      method: 'GET',
      url: '/api/v1/storefront/cart',
      headers: sessionHeaders,
    });
    expect(got.statusCode).toBe(200);
    const gotBody = got.json() as { data: { lineItems: unknown[] } };
    expect(gotBody.data.lineItems).toHaveLength(1);

    // Quote (no JSON content-type — Fastify rejects empty JSON bodies)
    const quote = await app.inject({
      method: 'POST',
      url: '/api/v1/storefront/cart/quote',
      headers: sessionHeaders,
    });
    expect(quote.statusCode).toBe(200);
    const quoteBody = quote.json() as {
      data: { currency: string; subtotalMinor: string };
    };
    expect(quoteBody.data.currency).toBe('TRY');
    // 12990 * 2 = 25980
    expect(quoteBody.data.subtotalMinor).toBe('25980');

    // Update quantity
    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/storefront/cart/lines/${lineId}`,
      headers: jsonHeaders,
      payload: { quantity: 3 },
    });
    expect(updated.statusCode).toBe(200);
    const updatedBody = updated.json() as {
      data: { lineItems: { quantity: number }[] };
    };
    expect(updatedBody.data.lineItems[0]?.quantity).toBe(3);

    // Remove line
    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/storefront/cart/lines/${lineId}`,
      headers: sessionHeaders,
    });
    expect(removed.statusCode).toBe(200);
    const removedBody = removed.json() as { data: { lineItems: unknown[] } };
    expect(removedBody.data.lineItems).toEqual([]);
  });

  it('rejects cart access without session or user header', async () => {
    if (!app) throw new Error('app not initialized');
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/storefront/cart',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe(ErrorCodes.AUTH_UNAUTHENTICATED);
  });
});
