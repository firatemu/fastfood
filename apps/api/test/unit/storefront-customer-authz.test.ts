import { ErrorCodes } from '@fastfood/contracts';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { CustomerAuthModule } from '../../src/modules/auth/customer/customer-auth.module.js';
import { CustomerAuthService } from '../../src/modules/auth/customer/customer-auth.service.js';
import { CatalogModule } from '../../src/modules/catalog/catalog.module.js';
import { CustomerModule } from '../../src/modules/customer/customer.module.js';
import { OrderModule } from '../../src/modules/order/order.module.js';

async function issueCustomer(auth: CustomerAuthService, phone: string) {
  await auth.requestOtp(phone);
  const verified = await auth.verifyOtp(phone, '000000');
  if (!verified.ok) throw new Error('otp failed');
  return verified;
}

describe('Storefront customer authorization boundary', () => {
  let app: NestFastifyApplication | undefined;
  let auth: CustomerAuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, CustomerAuthModule, CustomerModule, CatalogModule, OrderModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    app.setGlobalPrefix('/api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    auth = app.get(CustomerAuthService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('Customer A cannot read Customer B profile via X-User-Id', async () => {
    if (!app) throw new Error('app not initialized');
    const b = await issueCustomer(auth, '+905551000002');
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { 'x-user-id': b.customerId },
    });
    expect(res.statusCode).toBe(401);
  });

  it('Customer A session cannot read Customer B addresses, orders, favorites, or courier location', async () => {
    if (!app) throw new Error('app not initialized');
    const a = await issueCustomer(auth, '+905551000011');
    const b = await issueCustomer(auth, '+905551000012');
    const headersA = { authorization: `Bearer ${a.refreshToken}` };
    const headersB = {
      authorization: `Bearer ${b.refreshToken}`,
      'content-type': 'application/json',
    };

    const addr = await app.inject({
      method: 'POST',
      url: '/api/v1/me/addresses',
      headers: headersB,
      payload: {
        recipientName: 'B',
        recipientPhone: '+905551000012',
        latitude: 41.01,
        longitude: 28.97,
        countryCode: 'TR',
      },
    });
    const addrBody = addr.json() as { data?: { id: string } };
    const addressId = addrBody.data?.id;
    expect(addressId).toBeTruthy();

    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/me/addresses',
      headers: headersA,
    });
    const ids = ((listA.json() as { data?: { id: string }[] }).data ?? []).map((row) => row.id);
    expect(ids).not.toContain(addressId);

    const order = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { ...headersB, 'content-type': 'application/json' },
      payload: {
        merchandiseNetMinor: '15000',
        finalPayableMinor: '15000',
        items: [
          {
            productId: '01900000-0000-7000-8000-cccccccccccc',
            productNameSnapshot: 'Classic',
            quantity: 1,
            unitPriceMinorSnapshot: '15000',
            lineGrossMinorSnapshot: '15000',
          },
        ],
        deliveryAddress: { latitude: 41.0369, longitude: 28.9847, line1: 'Istiklal 1' },
      },
    });
    const orderId = (order.json() as { data?: { id: string } }).data?.id;
    expect(orderId).toBeTruthy();

    const stolenOrder = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}`,
      headers: headersA,
    });
    expect(stolenOrder.json()).toMatchObject({ error: { code: ErrorCodes.NOT_FOUND } });

    const stolenLocation = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${orderId}/courier-location`,
      headers: headersA,
    });
    expect(stolenLocation.json()).toMatchObject({ error: { code: ErrorCodes.NOT_FOUND } });

    const stolenReorder = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/reorder`,
      headers: headersA,
    });
    expect(stolenReorder.json()).toMatchObject({ error: { code: ErrorCodes.NOT_FOUND } });

    const fav = await app.inject({
      method: 'POST',
      url: '/api/v1/me/favorites',
      headers: headersB,
      payload: { productId: '01900000-0000-7000-8000-cccccccccccc' },
    });
    const favoriteId = (fav.json() as { data?: { id: string } }).data?.id;
    expect(favoriteId).toBeTruthy();

    const stolenFav = await app.inject({
      method: 'DELETE',
      url: `/api/v1/me/favorites/${favoriteId}`,
      headers: headersA,
    });
    expect(stolenFav.json()).toMatchObject({ error: { code: ErrorCodes.NOT_FOUND } });
  });

  it('unauthenticated callers cannot read private customer resources', async () => {
    if (!app) throw new Error('app not initialized');
    const me = await app.inject({ method: 'GET', url: '/api/v1/me' });
    expect(me.statusCode).toBe(401);
    const orders = await app.inject({ method: 'GET', url: '/api/v1/me/orders' });
    expect(orders.statusCode).toBe(401);
    const fav = await app.inject({ method: 'GET', url: '/api/v1/me/favorites' });
    expect(fav.statusCode).toBe(401);
  });
});
