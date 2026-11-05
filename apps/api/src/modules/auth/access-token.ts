/**
 * Canonical RS256 access-token signer/verifier.
 *
 * Document 32 §5 locks the access-token shape: "RS256 JWT, 15-minute TTL,
 * minimal claims, issuer/audience validated". Staff, courier and customer
 * identities therefore share one claim shape, one key pair and one TTL
 * configuration — the customer session used to bypass this contract with an
 * opaque long-lived bearer token (production-readiness audit P0-3).
 */
import { createSign, createVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAppConfig } from '../../bootstrap/app-config.js';

export type AccessTokenActorType = 'STAFF' | 'COURIER' | 'CUSTOMER';

export interface AccessClaims {
  sub: string;
  sid: string;
  actorType: AccessTokenActorType;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

type JwtHeader = { alg: string; typ?: string };

/**
 * `apps/api` package root. Relative key paths resolve against the package,
 * not against `process.cwd()`, so the API signs with the same key whether it
 * is started from the repository root (CI, container entrypoint) or from
 * `apps/api` (local development).
 */
const API_PACKAGE_ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

let privateKeyCache: { path: string; value: Buffer } | undefined;
let publicKeyCache: { path: string; value: Buffer } | undefined;

function resolveKey(path: string): string {
  return isAbsolute(path) ? path : resolve(API_PACKAGE_ROOT, path);
}

function loadKey(kind: 'private' | 'public'): Buffer {
  const config = getAppConfig();
  const path = resolveKey(
    kind === 'private' ? config.JWT_PRIVATE_KEY_PATH : config.JWT_PUBLIC_KEY_PATH,
  );
  const cache = kind === 'private' ? privateKeyCache : publicKeyCache;
  if (cache?.path === path) return cache.value;
  const value = readFileSync(path);
  if (kind === 'private') privateKeyCache = { path, value };
  else publicKeyCache = { path, value };
  return value;
}

export function signAccessToken(input: {
  userId: string;
  sessionId: string;
  actorType: AccessTokenActorType;
  now?: Date;
}): string {
  const config = getAppConfig();
  const now = input.now ?? new Date();
  const iat = Math.floor(now.getTime() / 1000);
  const payload: AccessClaims = {
    sub: input.userId,
    sid: input.sessionId,
    actorType: input.actorType,
    iss: config.JWT_ISSUER,
    aud: config.JWT_AUDIENCE,
    iat,
    exp: iat + config.ACCESS_TOKEN_TTL_MINUTES * 60,
  };
  const encodedHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(loadKey('private')).toString('base64url');
  return `${signingInput}.${signature}`;
}

/**
 * Verify an access token. `isAllowed` narrows the accepted actor types so a
 * customer token can never be replayed against a staff-protected route and
 * the other way round.
 */
export function verifyAccessToken(
  token: string,
  isAllowed: (claims: AccessClaims) => boolean,
  now = new Date(),
): AccessClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
  try {
    const header = JSON.parse(
      Buffer.from(encodedHeader, 'base64url').toString('utf8'),
    ) as JwtHeader;
    if (header.alg !== 'RS256') return null;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    if (!verifier.verify(loadKey('public'), Buffer.from(encodedSignature, 'base64url')))
      return null;

    const claims = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<AccessClaims>;
    const config = getAppConfig();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    if (
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string' ||
      (claims.actorType !== 'STAFF' &&
        claims.actorType !== 'COURIER' &&
        claims.actorType !== 'CUSTOMER') ||
      claims.iss !== config.JWT_ISSUER ||
      claims.aud !== config.JWT_AUDIENCE ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number' ||
      claims.iat > nowSeconds + 60 ||
      claims.exp <= nowSeconds ||
      claims.exp - claims.iat > config.ACCESS_TOKEN_TTL_MINUTES * 60
    ) {
      return null;
    }
    if (!isAllowed(claims as AccessClaims)) return null;
    return claims as AccessClaims;
  } catch {
    return null;
  }
}
