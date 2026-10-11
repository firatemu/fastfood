import { z } from 'zod';

/**
 * Canonical boolean coercion: handles "true"/"false" strings as well as native booleans.
 */
const booleanFromString = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === 'boolean') return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  throw new Error(`Invalid boolean string: ${value}`);
});

const nonEmptyString = z.string().min(1);

/**
 * Server-side environment schema. Used by api/worker.
 * Strict by design — missing required keys fail startup, never silently fallback.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_TIMEZONE: z.literal('Europe/Istanbul').default('Europe/Istanbul'),

  API_HOST: nonEmptyString.default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_BASE_PATH: z.string().startsWith('/').default('/api/v1'),
  API_CORS_ORIGINS: z.string().default(''),
  API_DEV_SECRET: nonEmptyString,
  /**
   * Absolute public origin of the API (no base path), used to build URLs the
   * browser/mobile fetch directly, e.g. product media. Unset means
   * `http://localhost:${API_PORT}`.
   */
  API_PUBLIC_URL: z.string().url().optional(),

  DATABASE_URL: z.string().url(),
  DATABASE_TEST_URL: z.string().url().optional(),

  REDIS_URL: z.string().url(),

  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: nonEmptyString.default('us-east-1'),
  S3_BUCKET: nonEmptyString,
  S3_ACCESS_KEY: nonEmptyString,
  S3_SECRET_KEY: nonEmptyString,
  S3_FORCE_PATH_STYLE: booleanFromString.default(true),

  IYZICO_BASE_URL: z.string().url(),
  IYZICO_API_KEY: nonEmptyString,
  IYZICO_SECRET_KEY: nonEmptyString,
  IYZICO_USE_SANDBOX: booleanFromString.default(true),

  OTP_PROVIDER: z.enum(['fake', 'live']).default('fake'),
  OTP_FAKE_FIXED_CODE: z
    .string()
    .regex(/^\d{6}$/)
    .default('000000'),
  /**
   * ADR-010: when true, customer registration skips the SMS OTP step.
   * `/auth/customer/otp/request` and `/auth/customer/otp/verify` return
   * `OTP_SUSPENDED`. The new `POST /auth/customer/register-phone`
   * endpoint becomes the registration path. Default false.
   */
  CUSTOMER_REGISTRATION_OTP_SUSPENDED: booleanFromString.default(false),
  OTP_HMAC_PEPPER: nonEmptyString.default('dev-otp-pepper-do-not-use-in-production'),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(180),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_REQUEST_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  OTP_MAX_REQUESTS_PER_15_MIN: z.coerce.number().int().positive().default(5),

  STOREFRONT_PUBLIC_URL: z.string().url().default('http://localhost:3100'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().default(''),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().default(''),
  APPLE_OAUTH_CLIENT_ID: z.string().default(''),
  APPLE_OAUTH_TEAM_ID: z.string().default(''),
  APPLE_OAUTH_KEY_ID: z.string().default(''),
  APPLE_OAUTH_PRIVATE_KEY: z.string().default(''),
  APPLE_OAUTH_REDIRECT_URI: z.string().default(''),

  MAPS_PROVIDER: z.enum(['google', 'osm']).default('google'),
  GOOGLE_MAPS_API_KEY: z.string(),

  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ISSUER: nonEmptyString,
  JWT_AUDIENCE: nonEmptyString,
  JWT_PRIVATE_KEY_PATH: z.string().default('./secrets/dev/jwt-private.pem'),
  JWT_PUBLIC_KEY_PATH: z.string().default('./secrets/dev/jwt-public.pem'),

  RATE_LIMIT_DEFAULT_PER_MINUTE: z.coerce.number().int().positive().default(120),

  /**
   * Durable outbox consumer (document 17 §4). The consumer runs in the API
   * process and drains `outbox_events`; it is forced off under
   * `NODE_ENV=test` so integration tests own event dispatch themselves and
   * cannot race the poller for a leased row.
   */
  OUTBOX_CONSUMER_ENABLED: booleanFromString.default(true),
  OUTBOX_CONSUMER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  OUTBOX_CONSUMER_BATCH_SIZE: z.coerce.number().int().positive().default(25),
  /** How long one consumer may hold a row before another may recover it. */
  OUTBOX_CONSUMER_LEASE_MS: z.coerce.number().int().positive().default(60_000),
  /** Attempts before a row is dead-lettered and stops being claimed. */
  OUTBOX_CONSUMER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  OUTBOX_CONSUMER_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(1_000),
  OUTBOX_CONSUMER_BACKOFF_MAX_MS: z.coerce.number().int().positive().default(300_000),

  OTEL_ENABLED: booleanFromString.default(false),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Client-side environment schema. Used by storefront-web, admin-web, customer-mobile,
 * courier-mobile. Only NEXT_PUBLIC_/EXPO_PUBLIC_ keys are visible to the browser.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: nonEmptyString.default('FASTFOOD'),
  NEXT_PUBLIC_APP_TIMEZONE: z.literal('Europe/Istanbul').default('Europe/Istanbul'),
  NEXT_PUBLIC_MAPS_PROVIDER: z.enum(['google', 'osm']).default('google'),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().default(''),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
