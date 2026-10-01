import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { getAppConfig } from '../../bootstrap/app-config.js';

/**
 * Customer OTP verifier (document 44 §2).
 *
 * Properties:
 *   - 6-digit numeric, generated via CSPRNG.
 *   - Stored verifier = HMAC-SHA-256(otp, server-side pepper) per
 *     challenge metadata; never plaintext.
 *   - 180s TTL baseline (configurable via `OTP_TTL_SECONDS`).
 *   - 5 verify attempts per challenge.
 *   - Single-use (challenge invalidated on successful verify).
 *
 * Phase 3 ships the verifier primitive + a single-ch
 *  memory-resident `OtpChallengeStore` for local development /
 * unit / integration tests. The Redis-backed store used by
 * horizontal production deployments lands under P3-005.
 */

export interface OtpChallenge {
  readonly phoneNormalized: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly attemptsRemaining: number;
}

export interface OtpChallengeStore {
  save(challenge: OtpChallenge): Promise<void>;
  get(phoneNormalized: string): Promise<OtpChallenge | null>;
  delete(phoneNormalized: string): Promise<void>;
  consume(phoneNormalized: string): Promise<OtpChallenge | null>;
}

export interface OtpService {
  request(phoneNormalized: string): Promise<{ expiresAt: Date }>;
  verify(phoneNormalized: string, code: string): Promise<OtpVerifyResult>;
}

export type OtpVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'OTP_NOT_FOUND' | 'OTP_EXPIRED' | 'OTP_ATTEMPTS_EXHAUSTED' | 'OTP_MISMATCH';
    };

function pepper(): string {
  const cfg = getAppConfig();
  // OTP_HMAC_PEPPER is required by config validator in production
  // deployments; the placeholder string is the development default.
  return cfg.OTP_HMAC_PEPPER;
}

export function hashOtp(phoneNormalized: string, code: string): string {
  return createHmac('sha256', pepper()).update(`${phoneNormalized}|${code}`).digest('hex');
}

export function generateOtpCode(): string {
  // 6-digit numeric from CSPRNG; reject leading-zero bias.
  const bytes = randomBytes(4);
  const n = (bytes.readUInt32BE(0) % 1_000_000) + 0;
  return n.toString().padStart(6, '0');
}

export class InMemoryOtpChallengeStore implements OtpChallengeStore {
  readonly #map = new Map<string, OtpChallenge>();

  async save(challenge: OtpChallenge): Promise<void> {
    this.#map.set(challenge.phoneNormalized, challenge);
  }

  async get(phoneNormalized: string): Promise<OtpChallenge | null> {
    return this.#map.get(phoneNormalized) ?? null;
  }

  async delete(phoneNormalized: string): Promise<void> {
    this.#map.delete(phoneNormalized);
  }

  async consume(phoneNormalized: string): Promise<OtpChallenge | null> {
    const challenge = this.#map.get(phoneNormalized);
    if (!challenge) {
      return null;
    }
    this.#map.delete(phoneNormalized);
    return challenge;
  }
}

export function createOtpService(store: OtpChallengeStore): OtpService {
  return {
    async request(phoneNormalized: string) {
      const cfg = getAppConfig();
      const code = cfg.OTP_PROVIDER === 'fake' ? cfg.OTP_FAKE_FIXED_CODE : generateOtpCode();
      const codeHash = hashOtp(phoneNormalized, code);
      const expiresAt = new Date(Date.now() + cfg.OTP_TTL_SECONDS * 1000);
      await store.save({
        phoneNormalized,
        codeHash,
        expiresAt,
        attemptsRemaining: cfg.OTP_MAX_VERIFY_ATTEMPTS,
      });
      // Plaintext is never logged. Fake-provider tests use OTP_FAKE_FIXED_CODE.
      return { expiresAt };
    },

    async verify(phoneNormalized: string, code: string): Promise<OtpVerifyResult> {
      const challenge = (await store.get(phoneNormalized)) ?? (await store.consume(phoneNormalized));
      if (!challenge) {
        return { ok: false, reason: 'OTP_NOT_FOUND' };
      }
      if (challenge.expiresAt.getTime() < Date.now()) {
        await store.delete(phoneNormalized);
        return { ok: false, reason: 'OTP_EXPIRED' };
      }
      if (challenge.attemptsRemaining <= 0) {
        await store.delete(phoneNormalized);
        return { ok: false, reason: 'OTP_ATTEMPTS_EXHAUSTED' };
      }
      const expected = Buffer.from(challenge.codeHash, 'hex');
      const actual = Buffer.from(hashOtp(phoneNormalized, code), 'hex');
      const mismatch =
        expected.length !== actual.length || !timingSafeEqual(expected, actual);
      if (mismatch) {
        const remaining = challenge.attemptsRemaining - 1;
        if (remaining <= 0) {
          await store.delete(phoneNormalized);
          return { ok: false, reason: 'OTP_ATTEMPTS_EXHAUSTED' };
        }
        await store.save({ ...challenge, attemptsRemaining: remaining });
        return { ok: false, reason: 'OTP_MISMATCH' };
      }
      await store.delete(phoneNormalized);
      return { ok: true };
    },
  };
}
