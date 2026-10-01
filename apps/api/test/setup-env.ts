/**
 * Vitest setup — ensures required env vars are present before any
 * module that calls `getAppConfig()` is imported. Required because
 * Vitest does not auto-load `.env` files.
 */
process.env['NODE_ENV'] ??= 'test';
process.env['API_DEV_SECRET'] ??= 'test-secret-must-be-long-enough-32b';
process.env['DATABASE_URL'] ??= 'postgresql://test:test@127.0.0.1:5432/test';
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
process.env['OTP_HMAC_PEPPER'] ??= 'unit-test-otp-pepper';
process.env['ALLOW_DEV_MFA_BYPASS'] ??= 'true';
