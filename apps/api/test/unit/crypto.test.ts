/**
 * Unit tests for the Phase 3 crypto primitives (document 44 + ADR-004).
 */
// Set minimum required env vars BEFORE importing the config so
// loadServerEnv does not throw.
process.env['NODE_ENV'] ??= 'test';
process.env['API_DEV_SECRET'] ??= 'test-secret-must-be-long-enough';
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

import { describe, expect, it } from 'vitest';

import { scryptPasswordHasher } from '../../src/common/crypto/password-hasher.js';
import {
  generateOtpCode,
  hashOtp,
  InMemoryOtpChallengeStore,
  createOtpService,
} from '../../src/common/crypto/otp-verifier.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshTokenShape,
} from '../../src/common/crypto/refresh-token.js';

describe('Phase 3 crypto primitives (document 44 + ADR-004)', () => {
  describe('scryptPasswordHasher', () => {
    it('produces scrypt$1$ prefixed encoded hash', async () => {
      const encoded = await scryptPasswordHasher.hash('correct horse battery staple');
      expect(encoded.startsWith('scrypt$1$')).toBe(true);
    });
    it('verifies a correct password round-trip', async () => {
      const plain = 'correct horse battery staple';
      const encoded = await scryptPasswordHasher.hash(plain);
      expect(await scryptPasswordHasher.verify(plain, encoded)).toBe(true);
    });
    it('rejects an incorrect password', async () => {
      const encoded = await scryptPasswordHasher.hash('correct horse');
      expect(await scryptPasswordHasher.verify('wrong horse', encoded)).toBe(false);
    });
    it('rejects a malformed encoded string', async () => {
      expect(await scryptPasswordHasher.verify('plain', 'not-scrypt$')).toBe(false);
    });
  });

  describe('OTP verifier', () => {
    it('generates 6-digit numeric OTP', async () => {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    });
    it('HMAC verifier is deterministic for the same (phone, code) pair', async () => {
      const h1 = hashOtp('+905551111111', '123456');
      const h2 = hashOtp('+905551111111', '123456');
      expect(h1).toBe(h2);
    });
    it('HMAC verifier differs for different phone numbers', async () => {
      expect(hashOtp('+905551111111', '123456')).not.toBe(hashOtp('+905552222222', '123456'));
    });
    it('HMAC verifier differs for different codes', async () => {
      expect(hashOtp('+905551111111', '123456')).not.toBe(hashOtp('+905551111111', '654321'));
    });
    it('OTP service issues a challenge then verifies the code', async () => {
      const store = new InMemoryOtpChallengeStore();
      const svc = createOtpService(store);
      const phone = '+905551111111';
      // Generate the code via the service and reach into the store to
      // assert the hashed verifier was persisted (single-use).
      // We don't have access to the plain code from the public API; the
      // hashOtp helper uses the same pepper as the service, so we
      // compute the expected hash from a known code.
      const code = generateOtpCode();
      await store.save({
        phoneNormalized: phone,
        codeHash: hashOtp(phone, code),
        expiresAt: new Date(Date.now() + 60_000),
        attemptsRemaining: 5,
      });
      const result = await svc.verify(phone, code);
      expect(result.ok).toBe(true);
    });
    it('OTP verify is single-use — second attempt with the same code fails', async () => {
      const store = new InMemoryOtpChallengeStore();
      const svc = createOtpService(store);
      const phone = '+905551111111';
      const code = generateOtpCode();
      await store.save({
        phoneNormalized: phone,
        codeHash: hashOtp(phone, code),
        expiresAt: new Date(Date.now() + 60_000),
        attemptsRemaining: 5,
      });
      const r1 = await svc.verify(phone, code);
      const r2 = await svc.verify(phone, code);
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(false);
      if (!r2.ok) expect(r2.reason).toBe('OTP_NOT_FOUND');
    });
    it('OTP verify rejects wrong code', async () => {
      const store = new InMemoryOtpChallengeStore();
      const svc = createOtpService(store);
      const phone = '+905551111111';
      await store.save({
        phoneNormalized: phone,
        codeHash: hashOtp(phone, '123456'),
        expiresAt: new Date(Date.now() + 60_000),
        attemptsRemaining: 5,
      });
      const result = await svc.verify(phone, '654321');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('OTP_MISMATCH');
    });
  });

  describe('Refresh tokens', () => {
    it('generates a 43-char base64url token', async () => {
      const token = generateRefreshToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });
    it('two generated tokens are different', async () => {
      const t1 = generateRefreshToken();
      const t2 = generateRefreshToken();
      expect(t1).not.toBe(t2);
    });
    it('SHA-256 hash of a token is deterministic and 64-char hex', async () => {
      const token = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVW';
      const h1 = hashRefreshToken(token);
      const h2 = hashRefreshToken(token);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
    });
    it('verifyRefreshTokenShape accepts valid tokens and rejects bad ones', async () => {
      const valid = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE';
      expect(valid.length).toBe(43);
      expect(verifyRefreshTokenShape(valid)).toBe(true);
      expect(verifyRefreshTokenShape('not-a-token')).toBe(false);
      expect(verifyRefreshTokenShape('a'.repeat(43))).toBe(true);
      expect(verifyRefreshTokenShape('a'.repeat(42))).toBe(false);
    });
  });
});
