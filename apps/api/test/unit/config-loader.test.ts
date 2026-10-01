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

  it('rejects an environment missing required values', async () => {
    expect(() =>
      loadServerEnv({
        NODE_ENV: 'development',
        API_DEV_SECRET: 'x'.repeat(40),
      }),
    ).toThrow(/Invalid server environment configuration/);
  });
});
