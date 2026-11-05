/**
 * Production-readiness audit P0-3 — the customer session contract.
 *
 * Document 32 §5: the access token is a short-lived RS256 JWT that travels as
 * `Authorization: Bearer`; the refresh credential is a 30-day opaque token that
 * a browser keeps in an HttpOnly cookie and a native client keeps in the
 * platform secure store. The refresh credential is never accepted as a bearer.
 */
import { describe, expect, it } from 'vitest';

import { testFastPasswordHasher } from '../../src/common/crypto/index.js';
import { CustomerAuthService } from '../../src/modules/auth/customer/customer-auth.service.js';

function service(): CustomerAuthService {
  const svc = new CustomerAuthService();
  svc.useTestHasher(testFastPasswordHasher);
  return svc;
}

describe('customer session transport (audit P0-3)', () => {
  it('issues an RS256 access token next to the refresh credential', async () => {
    const svc = service();
    const requested = await svc.requestOtp('+905551000071');
    expect(requested.ok).toBe(true);
    const result = await svc.verifyOtp('+905551000071', '000000');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(result.accessExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('accepts the access token as a bearer and rejects the refresh credential', async () => {
    const svc = service();
    await svc.requestOtp('+905551000072');
    const result = await svc.verifyOtp('+905551000072', '000000');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const resolved = await svc.resolveAccessToken(result.accessToken);
    expect(resolved).not.toBeNull();
    expect(resolved?.customerId).toBe(result.customerId);

    // The 30-day credential is the cookie/body transport, never a bearer.
    expect(await svc.resolveAccessToken(result.refreshToken)).toBeNull();
  });

  it('rotates the refresh credential on use and keeps the old one invalid', async () => {
    const svc = service();
    await svc.requestOtp('+905551000073');
    const issued = await svc.verifyOtp('+905551000073', '000000');
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const refreshed = await svc.refresh(issued.refreshToken);
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    expect(refreshed.refreshToken).not.toBe(issued.refreshToken);
    expect(refreshed.accessToken.split('.')).toHaveLength(3);

    expect((await svc.refresh(issued.refreshToken)).ok).toBe(false);
  });
});
