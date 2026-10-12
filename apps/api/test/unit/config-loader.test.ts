import { loadServerEnv } from '@fastfood/config';
import { describe, expect, it } from 'vitest';

describe('loadServerEnv (foundation)', () => {
  it('accepts a complete development environment', async () => {
    const env = loadServerEnv({
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
      API_DEV_SECRET: 'x'.repeat(40),
      DATABASE_URL: 'postgresql://fastfood:fastfood@localhost:5439/fastfood',
      REDIS_URL: 'redis://localhost:6388',
      S3_ENDPOINT: 'http://localhost:9098',
      S3_BUCKET: 'fastfood-dev',
      S3_ACCESS_KEY: 'fastfood',
      S3_SECRET_KEY: 'fastfood-dev-secret',
      IYZICO_BASE_URL: 'https://sandbox-api.iyzipay.com',
      IYZICO_API_KEY: 'k',
      IYZICO_SECRET_KEY: 's',
      MAPS_PROVIDER: 'google',
      GOOGLE_MAPS_API_KEY: 'k',
      JWT_ISSUER: 'fastfood-dev',
      JWT_AUDIENCE: 'fastfood-api',
    });
    expect(env.API_BASE_PATH).toBe('/api/v1');
    expect(env.APP_TIMEZONE).toBe('Europe/Istanbul');
    expect(env.IYZICO_USE_SANDBOX).toBe(true);
  });

  it('rejects the simulated payment gateway in production (ADR-022)', () => {
    const base = {
      API_DEV_SECRET: 'x'.repeat(40),
      DATABASE_URL: 'postgresql://fastfood:fastfood@localhost:5439/fastfood',
      REDIS_URL: 'redis://localhost:6388',
      S3_ENDPOINT: 'http://localhost:9098',
      S3_BUCKET: 'fastfood-dev',
      S3_ACCESS_KEY: 'fastfood',
      S3_SECRET_KEY: 'fastfood-dev-secret',
      IYZICO_BASE_URL: 'https://sandbox-api.iyzipay.com',
      IYZICO_API_KEY: 'k',
      IYZICO_SECRET_KEY: 's',
      GOOGLE_MAPS_API_KEY: 'k',
      JWT_ISSUER: 'fastfood',
      JWT_AUDIENCE: 'fastfood-api',
    };
    expect(loadServerEnv({ ...base, NODE_ENV: 'development' }).PAYMENT_GATEWAY).toBe('simulated');
    expect(() => loadServerEnv({ ...base, NODE_ENV: 'production' })).toThrow(/PAYMENT_GATEWAY/);
    expect(
      loadServerEnv({ ...base, NODE_ENV: 'production', PAYMENT_GATEWAY: 'iyzico' }).PAYMENT_GATEWAY,
    ).toBe('iyzico');
  });

  it('rejects an environment missing required values', async () => {
    expect(() =>
      loadServerEnv({
        NODE_ENV: 'development',
        API_DEV_SECRET: 'x'.repeat(40),
      }),
    ).toThrow(/Invalid server environment configuration/);
  });
});
