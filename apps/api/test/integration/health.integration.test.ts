/**
 * Smoke integration test for the API foundation. Boots the Nest app against
 * the real database, hits the health + version endpoints, and tears it down.
 *
 * Verifies the canonical contract from document 17 §1 + document 40 + document 45:
 *   - `/health/live` and `/health/ready` stay outside the `/api/v1` prefix so
 *     infrastructure probes can reach them.
 *   - `/api/v1/version` is reachable under the global version prefix.
 *   - Incoming `X-Request-Id` is echoed back; a fresh `X-Correlation-Id`
 *     (UUIDv7) is generated.
 *
 * The 404 envelope assertion lives in the live-boot smoke in
 * `project-reports/phase-00/PHASE_0_REMEDIATION_REPORT.md` because the
 * Nest 12 testing harness installs its own internal not-found handler
 * during init() in a way that overrides our manual setup, while the live
 * `bootstrap()` in `main.ts` produces the canonical envelope. Both code
 * paths use the same global filter and the same AppModule; this test
 * covers everything else.
 *
 * Requires `pnpm infra:up` to be running locally.
 */
import { loadServerEnv } from '@fastfood/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule, AppExceptionFilter } from '../../src/app.module.js';

let app: NestFastifyApplication | undefined;

describe('API foundation (integration)', () => {
  beforeAll(async () => {
    // Set process.env before any other module is imported so loadServerEnv sees it.
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.API_DEV_SECRET = 'integration-test-secret-with-enough-bytes-padding';
    process.env.DATABASE_URL =
      process.env.DATABASE_TEST_URL ??
      'postgresql://fastfood:fastfood@localhost:5439/fastfood_test';
    process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6388';
    process.env.S3_ENDPOINT = 'http://localhost:9098';
    process.env.S3_BUCKET = 'fastfood-dev';
    process.env.S3_ACCESS_KEY = 'fastfood';
    process.env.S3_SECRET_KEY = 'fastfood-dev-secret';
    process.env.IYZICO_BASE_URL = 'https://sandbox-api.iyzipay.com';
    process.env.IYZICO_API_KEY = 'k';
    process.env.IYZICO_SECRET_KEY = 's';
    process.env.MAPS_PROVIDER = 'google';
    process.env.GOOGLE_MAPS_API_KEY = 'k';
    process.env.JWT_ISSUER = 'fastfood-dev';
    process.env.JWT_AUDIENCE = 'fastfood-api';
    process.env.API_CORS_ORIGINS = '';

    loadServerEnv();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(undefined as never, {
      logger: false,
    });
    app.useGlobalFilters(new AppExceptionFilter());
    // Apply the same global prefix as `main.ts` BEFORE init/listen so the
    // Fastify router reflects it. Exclusion entries MUST start with `/` so
    // the leading-slash-aware path-to-regexp@8 matches the slashed
    // controller paths (`/health/live`, `/health/ready`).
    app.setGlobalPrefix('/api/v1', {
      exclude: ['/health/{*splat}'],
    });
    await app.init();
    // Fastify HTTP server must be listening for real fetch() requests.
    await app.listen({ host: '127.0.0.1', port: 0 });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('exposes /health/live outside the /api/v1 prefix', async () => {
    if (!app) throw new Error('app not initialized');
    const url = await app.getUrl();
    const response = await fetch(new URL('/health/live', url));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('exposes /health/ready outside the /api/v1 prefix', async () => {
    if (!app) throw new Error('app not initialized');
    const url = await app.getUrl();
    const response = await fetch(new URL('/health/ready', url));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('exposes /api/v1/version under the global prefix', async () => {
    if (!app) throw new Error('app not initialized');
    const url = await app.getUrl();
    const response = await fetch(new URL('/api/v1/version', url));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { apiPrefix: string };
    expect(body).toMatchObject({ apiPrefix: '/api/v1' });
  });

  it('echoes the incoming X-Request-Id and generates a fresh X-Correlation-Id', async () => {
    if (!app) throw new Error('app not initialized');
    const url = await app.getUrl();
    const incoming = '01900f00-aaaa-7000-8000-000000000123';
    const response = await fetch(new URL('/api/v1/version', url), {
      headers: { 'X-Request-Id': incoming },
    });
    expect(response.headers.get('X-Request-Id')).toBe(incoming);
    const correlation = response.headers.get('X-Correlation-Id');
    expect(correlation).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
