import { createHash, randomBytes } from 'node:crypto';

/**
 * Opaque refresh token utilities (document 44 §3).
 *
 * - `generateRefreshToken()` produces a 256-bit CSPRNG opaque token,
 *   base64url-encoded.
 * - `hashRefreshToken(token)` returns the SHA-256 hex digest that is
 *   the ONLY thing stored server-side (document 44 §3).
 *
 * Rotation policy and session-family revocation logic live in the
 * `AuthService` (P3-005). This module only generates + hashes.
 */

const REFRESH_TOKEN_BYTES = 32;

export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * The shape of a refresh-token verifier comparison.
 *
 * Returned by `verifyRefreshTokenShape` to allow the auth service to
 * reject malformed tokens before the database lookup.
 */
export function verifyRefreshTokenShape(token: string): boolean {
  // Base64url alphabet + minimum length for 32 random bytes.
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
