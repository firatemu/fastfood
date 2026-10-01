/**
 * Unit tests for the Phase 3 staff auth service.
 */
import { describe, expect, it } from 'vitest';

import { StaffAuthService } from '../../src/modules/auth/staff/staff-auth.service.js';

describe('Phase 3 StaffAuthService', () => {
  it('rejects login with unknown identifier', async () => {
    const svc = new StaffAuthService();
    const r = await svc.login('unknown@example.com', 'password');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('USER_NOT_FOUND');
  });

  it('returns PASSWORD_MISMATCH for wrong password after registration', async () => {
    const svc = new StaffAuthService();
    await svc.registerDevStaff('staff@example.com', 'correct horse');
    const r = await svc.login('staff@example.com', 'wrong horse');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('PASSWORD_MISMATCH');
  });

  it('issues a refresh token + flags mfaRequired correctly (test mode = bypass)', async () => {
    const svc = new StaffAuthService();
    await svc.registerDevStaff('staff@example.com', 'correct horse');
    const r = await svc.login('staff@example.com', 'correct horse');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.userId).toMatch(/^01900000-0000-7000-8000-/);
      expect(r.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      // NODE_ENV='test' + ALLOW_DEV_MFA_BYPASS=true → MFA bypass enabled
      // → mfaRequired=false. In production this flips to true.
      expect(r.mfaRequired).toBe(false);
    }
  });

  it('verifies a 6-digit TOTP and issues an access token', async () => {
    const svc = new StaffAuthService();
    await svc.registerDevStaff('staff@example.com', 'correct horse');
    const login = await svc.login('staff@example.com', 'correct horse');
    if (!login.ok) throw new Error('login should succeed');
    const mfa = await svc.verifyMfa(login.refreshToken, '123456');
    // NODE_ENV=test so MFA bypass is enabled; a 6-digit code verifies.
    expect(mfa.ok).toBe(true);
    if (mfa.ok) {
      expect(mfa.userId).toBe(login.userId);
      expect(mfa.accessToken).toMatch(/^staff-/);
    }
  });

  it('rejects malformed TOTP', async () => {
    const svc = new StaffAuthService();
    await svc.registerDevStaff('staff@example.com', 'correct horse');
    const login = await svc.login('staff@example.com', 'correct horse');
    if (!login.ok) throw new Error('login should succeed');
    const mfa = await svc.verifyMfa(login.refreshToken, '12');
    expect(mfa.ok).toBe(false);
    if (!mfa.ok) expect(mfa.reason).toBe('TOTP_MALFORMED');
  });
});
