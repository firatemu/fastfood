// Integration test environment.
//
// The integration suite talks to the real local PostgreSQL/Redis from
// apps/api/.env (see `pnpm infra:up`). Vitest does not load .env files on
// its own, and DATABASE_URL was previously only present when the operator
// exported it by hand - which is why the integration gate was reported as
// NOT RUN in the production-readiness audit.
//
// Precedence: an already-exported variable always wins over the .env file,
// so CI can point the suite at a different database.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../.env');

if (existsSync(envFile)) {
  const raw = readFileSync(envFile, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

process.env['NODE_ENV'] ??= 'test';
process.env['API_DEV_SECRET'] ??= 'test-secret-must-be-long-enough-32b';
process.env['REDIS_URL'] ??= 'redis://127.0.0.1:6379';
process.env['S3_ENDPOINT'] ??= 'http://127.0.0.1:9000';
process.env['S3_BUCKET'] ??= 'test';
process.env['S3_ACCESS_KEY'] ??= 'test';
process.env['S3_SECRET_KEY'] ??= 'test';
process.env['IYZICO_BASE_URL'] ??= 'https://sandbox-api.iyzipay.com';
process.env['IYZICO_API_KEY'] ??= 'test';
process.env['IYZICO_SECRET_KEY'] ??= 'test';
process.env['GOOGLE_MAPS_API_KEY'] ??= 'test';
process.env['JWT_ISSUER'] ??= 'fastfood';
process.env['JWT_AUDIENCE'] ??= 'fastfood-api';
process.env['OTP_HMAC_PEPPER'] ??= 'integration-test-otp-pepper';
process.env['ALLOW_DEV_MFA_BYPASS'] ??= 'true';

if (!process.env['DATABASE_URL']) {
  throw new Error(
    'DATABASE_URL is required for the integration suite. Run `pnpm infra:up` and keep apps/api/.env in place.',
  );
}
