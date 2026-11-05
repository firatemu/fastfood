/**
 * Staff/courier access token.
 *
 * Thin wrapper over the canonical access-token module (document 32 §5). The
 * claim shape, key pair and TTL are shared with the customer access token so
 * there is exactly one access-token implementation in the API.
 */
import {
  signAccessToken,
  verifyAccessToken,
  type AccessClaims,
  type AccessTokenActorType,
} from '../access-token.js';

export type StaffAccessClaims = AccessClaims;

export function signStaffAccessToken(input: {
  userId: string;
  sessionId: string;
  actorType?: Extract<AccessTokenActorType, 'STAFF' | 'COURIER'>;
  now?: Date;
}): string {
  return signAccessToken({
    userId: input.userId,
    sessionId: input.sessionId,
    actorType: input.actorType ?? 'STAFF',
    now: input.now,
  });
}

export function verifyStaffAccessToken(token: string, now = new Date()): StaffAccessClaims | null {
  return verifyAccessToken(
    token,
    (claims) => claims.actorType === 'STAFF' || claims.actorType === 'COURIER',
    now,
  );
}
