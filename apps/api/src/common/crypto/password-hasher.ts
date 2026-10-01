import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number },
) => Promise<Buffer>;

import { getAppConfig } from '../../bootstrap/app-config.js';

/**
 * Staff password hashing (document 44 §1).
 *
 * Algorithm: scrypt with the canonical baseline parameters. Per
 * ADR-004, the Phase 3 baseline uses `crypto.scrypt` because no new
 * runtime dependency is being introduced. The parameters are
 * equivalent to the Argon2id baseline `m=19456 KiB, t=2, p=1` in
 * adversarial-cost terms. When a future ADR adopts the native
 * `argon2` binding, this module is replaced via the `PasswordHasher`
 * interface.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, encoded: string): Promise<boolean>;
}

const SCRYPT_N = 1 << 15; // 32768
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LEN = 64;
const SCRYPT_MAX_MEM = 64 * 1024 * 1024; // 64 MiB

const FORMAT_PREFIX = 'scrypt$1$';

/**
 * scrypt-encoded hash. Format: `scrypt$1$<salt-base64url>$<hash-base64url>`.
 * The `1` is the format version; a future Argon2id migration adds
 * `argon2id$1$…` and the verify routine dispatches by prefix.
 */
export const scryptPasswordHasher: PasswordHasher = {
  async hash(plain: string): Promise<string> {
    const cfg = getAppConfig();
    void cfg;
    const salt = randomBytes(16);
    const derived = await scrypt(plain, salt, SCRYPT_KEY_LEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAX_MEM,
    });
    return `${FORMAT_PREFIX}${salt.toString('base64url')}$${derived.toString('base64url')}`;
  },

  async verify(plain: string, encoded: string): Promise<boolean> {
    if (!encoded.startsWith(FORMAT_PREFIX)) {
      return false;
    }
    const body = encoded.slice(FORMAT_PREFIX.length);
    const sep = body.indexOf('$');
    if (sep < 0) {
      return false;
    }
    const saltB64 = body.slice(0, sep);
    const hashB64 = body.slice(sep + 1);
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(hashB64, 'base64url');
    const derived = await scrypt(plain, salt, expected.length, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAX_MEM,
    });
    if (derived.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(derived, expected);
  },
};

/**
 * Test-only password hasher that uses fast bcrypt-equivalent
 * `crypto.scrypt` with low parameters. NEVER used in production.
 * Exposed for unit tests; the application uses
 * `scryptPasswordHasher`.
 */
export const testFastPasswordHasher: PasswordHasher = {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(8);
    const derived = await scrypt(plain, salt, 32, {
      N: 1 << 10,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024,
    });
    return `test-scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
  },
  async verify(plain: string, encoded: string): Promise<boolean> {
    if (!encoded.startsWith('test-scrypt$')) return false;
    const body = encoded.slice('test-scrypt$'.length);
    const sep = body.indexOf('$');
    if (sep < 0) return false;
    const salt = Buffer.from(body.slice(0, sep), 'base64url');
    const expected = Buffer.from(body.slice(sep + 1), 'base64url');
    const derived = await scrypt(plain, salt, expected.length, {
      N: 1 << 10,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024,
    });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  },
};
