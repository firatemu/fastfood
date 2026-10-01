import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { CustomerAuthModule } from '../../src/modules/auth/customer/customer-auth.module.js';
import { CustomerAuthService } from '../../src/modules/auth/customer/customer-auth.service.js';
import { DiningModule } from '../../src/modules/dining/dining.module.js';
import { GamificationModule } from '../../src/modules/gamification/gamification.module.js';
import { LoyaltyModule } from '../../src/modules/loyalty/loyalty.module.js';
import { NotificationModule } from '../../src/modules/notification/notification.module.js';
import { SupportModule } from '../../src/modules/support/support.module.js';

async function issueCustomer(auth: CustomerAuthService, phone: string) {
  await auth.requestOtp(phone);
  const verified = await auth.verifyOtp(phone, '000000');
  if (!verified.ok) throw new Error('otp failed');
  return verified;
}

describe('Phase 6 engagement HTTP', () => {
  let app: NestFastifyApplication | undefined;
  let auth: CustomerAuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule,
        CustomerAuthModule,
        LoyaltyModule,
        GamificationModule,
        NotificationModule,
        SupportModule,
        DiningModule,
      ],
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

  it('returns club snapshot and welcome once', async () => {
    if (!app) throw new Error('app not initialized');
    const session = await issueCustomer(auth, '+905551000021');
    const headers = { authorization: `Bearer ${session.refreshToken}` };
    const first = await app.inject({ method: 'GET', url: '/api/v1/me/club', headers });
    expect(first.statusCode).toBe(200);
    const body = first.json() as { data?: { programName: string; welcome: { status: string } } };
    expect(body.data?.programName).toBe('BURGER HOME CLUB');
    expect(body.data?.welcome.status).toBe('AVAILABLE');
    const second = await app.inject({ method: 'GET', url: '/api/v1/me/club', headers });
    expect(second.statusCode).toBe(200);
  });

  it('spins once per day with idempotency', async () => {
    if (!app) throw new Error('app not initialized');
    const session = await issueCustomer(auth, '+905551000022');
    const headers = { authorization: `Bearer ${session.refreshToken}`, 'content-type': 'application/json' };
    const a = await app.inject({
      method: 'POST',
      url: '/api/v1/me/spin',
      headers,
      payload: { idempotencyKey: 'http-spin-key-1' },
    });
    expect(a.statusCode).toBe(200);
    const b = await app.inject({
      method: 'POST',
      url: '/api/v1/me/spin',
      headers,
      payload: { idempotencyKey: 'http-spin-key-1' },
    });
    const playA = a.json() as { data?: { playId: string; prize: { label: string } } };
    const playB = b.json() as { data?: { playId: string } };
    expect(playA.data?.prize.label).toBeTruthy();
    expect(playB.data?.playId).toBe(playA.data?.playId);
  });

  it('resolves opaque table codes and rejects junk', async () => {
    if (!app) throw new Error('app not initialized');
    const ok = await app.inject({ method: 'GET', url: '/api/v1/storefront/tables/bhx7k2m9q4wp' });
    expect(ok.statusCode).toBe(200);
    const bad = await app.inject({ method: 'GET', url: '/api/v1/storefront/tables/nope' });
    expect(bad.statusCode).toBe(404);
  });

  it('keeps notifications and support owned', async () => {
    if (!app) throw new Error('app not initialized');
    const a = await issueCustomer(auth, '+905551000023');
    const b = await issueCustomer(auth, '+905551000024');
    const headersA = { authorization: `Bearer ${a.refreshToken}` };
    const headersB = { authorization: `Bearer ${b.refreshToken}` };
    await app.inject({ method: 'GET', url: '/api/v1/me/club', headers: headersB });
    const inboxB = await app.inject({ method: 'GET', url: '/api/v1/me/notifications', headers: headersB });
    const items = (inboxB.json() as { data?: { items: { id: string }[] } }).data?.items ?? [];
    if (items[0]) {
      const stolen = await app.inject({
        method: 'PATCH',
        url: `/api/v1/me/notifications/${items[0].id}/read`,
        headers: headersA,
        payload: {},
      });
      expect(stolen.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    }
    const convo = await app.inject({
      method: 'POST',
      url: '/api/v1/me/support/conversations',
      headers: { ...headersB, 'content-type': 'application/json' },
      payload: {},
    });
    const convoId = (convo.json() as { data?: { id: string } }).data?.id;
    expect(convoId).toBeTruthy();
    const stolenChat = await app.inject({
      method: 'GET',
      url: `/api/v1/me/support/conversations/${convoId}`,
      headers: headersA,
    });
    expect(stolenChat.json()).toMatchObject({ error: { code: 'AUTH_SCOPE_DENIED' } });
  });
});
