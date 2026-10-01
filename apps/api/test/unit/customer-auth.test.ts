/**
 * Customer auth: OTP, password, identity linking, OAuth adapter boundary.
 */
import { describe, expect, it, vi } from 'vitest';

import { testFastPasswordHasher } from '../../src/common/crypto/index.js';
import { CustomerAuthService } from '../../src/modules/auth/customer/customer-auth.service.js';
import { FakeOAuthAdapter } from '../../src/modules/auth/customer/oauth-providers.js';

function service(): CustomerAuthService {
  const svc = new CustomerAuthService();
  svc.useTestHasher(testFastPasswordHasher);
  return svc;
}

describe('CustomerAuthService password + OTP + identity', () => {
  it('verifies fake-provider OTP and issues a session', async () => {
    const svc = service();
    const phone = '+905551000001';
    const requested = await svc.requestOtp(phone);
    expect(requested.ok).toBe(true);
    const result = await svc.verifyOtp(phone, '000000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.customerId.length).toBeGreaterThan(8);
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('rejects a wrong OTP without issuing a session', async () => {
    const svc = service();
    const phone = '+905551000002';
    await svc.requestOtp(phone);
    const result = await svc.verifyOtp(phone, '111111');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('OTP_MISMATCH');
  });

  it('registers email/password, logs in, and rejects a wrong password', async () => {
    const svc = service();
    const email = `pwd-${Date.now()}@example.com`;
    const registered = await svc.registerPassword({
      email,
      password: 'correct-horse',
      kvkkAccepted: true,
    });
    expect(registered.ok).toBe(true);
    const ok = await svc.loginPassword(email, 'correct-horse');
    expect(ok.ok).toBe(true);
    const bad = await svc.loginPassword(email, 'wrong-horse1');
    expect(bad.ok).toBe(false);
  });

  it('requires KVKK on registration', async () => {
    const svc = service();
    const result = await svc.registerPassword({
      email: 'kvkk@example.com',
      password: 'correct-horse',
      kvkkAccepted: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('KVKK_REQUIRED');
  });

  it('does not auto-merge unverified emails across accounts', async () => {
    const svc = service();
    const email = `dup-${Date.now()}@example.com`;
    const first = await svc.registerPassword({
      email,
      password: 'correct-horse',
      kvkkAccepted: true,
    });
    expect(first.ok).toBe(true);
    const second = await svc.registerPassword({
      email,
      password: 'other-horse1',
      kvkkAccepted: true,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('EMAIL_TAKEN');
  });

  it('resets a password with a hashed token and rejects reuse', async () => {
    const svc = service();
    const email = `reset-${Date.now()}@example.com`;
    await svc.registerPassword({ email, password: 'correct-horse', kvkkAccepted: true });
    const forgot = await svc.requestPasswordReset(email);
    expect(forgot.resetToken).toBeTruthy();
    const confirmed = await svc.confirmPasswordReset(forgot.resetToken!, 'new-horse-99');
    expect(confirmed.ok).toBe(true);
    const login = await svc.loginPassword(email, 'new-horse-99');
    expect(login.ok).toBe(true);
    const reuse = await svc.confirmPasswordReset(forgot.resetToken!, 'third-horse1');
    expect(reuse.ok).toBe(false);
  });

  it('links a Google identity via the adapter boundary without faking success in app code', async () => {
    const svc = service();
    svc.useTestOAuthAdapters([
      new FakeOAuthAdapter(
        'google',
        new Map([
          [
            'ok-code',
            {
              subject: 'google-sub-1',
              emailNormalized: 'g@example.com',
              emailVerifiedByProvider: true,
            },
          ],
        ]),
      ),
    ]);
    const start = svc.startOAuth('google', '/account');
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const url = new URL(start.authorizationUrl);
    const state = url.searchParams.get('state') ?? undefined;
    const done = await svc.completeOAuth('google', { code: 'ok-code', state });
    expect(done.ok).toBe(true);
    const denied = svc.startOAuth('google', '/account');
    expect(denied.ok).toBe(true);
    if (!denied.ok) return;
    const state2 = new URL(denied.authorizationUrl).searchParams.get('state') ?? undefined;
    const fail = await svc.completeOAuth('google', { code: 'bad-code', state: state2 });
    expect(fail.ok).toBe(false);
  });

  it('reports Google/Apple unavailable when adapters are not configured', async () => {
    const svc = service();
    svc.useTestOAuthAdapters([new FakeOAuthAdapter('google', new Map(), false)]);
    const start = svc.startOAuth('google', '/account');
    expect(start.ok).toBe(false);
    if (!start.ok) expect(start.reason).toBe('OAUTH_UNAVAILABLE');
  });

  it('logout is idempotent and malformed refresh tokens are rejected', async () => {
    const svc = service();
    expect((await svc.logout('a'.repeat(43))).ok).toBe(true);
    const refresh = await svc.refresh('not-a-real-token');
    expect(refresh.ok).toBe(false);
    if (!refresh.ok) expect(refresh.reason).toBe('TOKEN_MALFORMED');
  });
});

/**
 * ADR-010: phone OTP is suspended for customer registration during UI
 * maturation. These tests pin the gate behavior on both sides:
 * - while the flag is on, registerByPhoneAndPassword is the only path;
 *   OTP endpoints reject with OTP_SUSPENDED.
 * - while the flag is off, the new endpoint rejects with OTP_SUSPENDED
 *   and the OTP flow works as before.
 */
describe('CustomerAuthService OTP suspension (ADR-010)', () => {
  it('suspended: OTP endpoints return OTP_SUSPENDED and registerByPhoneAndPassword issues a session', async () => {
    vi.resetModules();
    process.env.CUSTOMER_REGISTRATION_OTP_SUSPENDED = '1';
    try {
      const { CustomerAuthService: LoadedService } = await import(
        '../../src/modules/auth/customer/customer-auth.service.js'
      );
      const svc = new LoadedService();
      svc.useTestHasher(testFastPasswordHasher);
      const phone = '+905551000050';

      const req = await svc.requestOtp(phone);
      expect(req.ok).toBe(false);
      if (!req.ok) expect(req.reason).toBe('OTP_SUSPENDED');

      const ver = await svc.verifyOtp(phone, '000000');
      expect(ver.ok).toBe(false);
      if (!ver.ok) expect(ver.reason).toBe('OTP_SUSPENDED');

      const reg = await svc.registerByPhoneAndPassword({
        phoneNormalized: phone,
        password: 'correct-horse',
        kvkkAccepted: true,
        newsletterOptIn: true,
      });
      expect(reg.ok).toBe(true);
      if (reg.ok) {
        expect(reg.customerId.length).toBeGreaterThan(8);
        expect(reg.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      }
    } finally {
      delete process.env.CUSTOMER_REGISTRATION_OTP_SUSPENDED;
      vi.resetModules();
    }
  });

  it('flag off: registerByPhoneAndPassword returns OTP_SUSPENDED and the OTP flow succeeds', async () => {
    vi.resetModules();
    delete process.env.CUSTOMER_REGISTRATION_OTP_SUSPENDED;
    try {
      const { CustomerAuthService: LoadedService } = await import(
        '../../src/modules/auth/customer/customer-auth.service.js'
      );
      const svc = new LoadedService();
      svc.useTestHasher(testFastPasswordHasher);
      const phone = '+905551000051';

      const reg = await svc.registerByPhoneAndPassword({
        phoneNormalized: phone,
        password: 'correct-horse',
        kvkkAccepted: true,
      });
      expect(reg.ok).toBe(false);
      if (!reg.ok) expect(reg.reason).toBe('OTP_SUSPENDED');

      const requested = await svc.requestOtp(phone);
      expect(requested.ok).toBe(true);
      const verified = await svc.verifyOtp(phone, '000000');
      expect(verified.ok).toBe(true);
    } finally {
      vi.resetModules();
    }
  });

  it('suspended: registerByPhoneAndPassword rejects missing KVKK and short password', async () => {
    vi.resetModules();
    process.env.CUSTOMER_REGISTRATION_OTP_SUSPENDED = '1';
    try {
      const { CustomerAuthService: LoadedService } = await import(
        '../../src/modules/auth/customer/customer-auth.service.js'
      );
      const svc = new LoadedService();
      svc.useTestHasher(testFastPasswordHasher);

      const noKvkk = await svc.registerByPhoneAndPassword({
        phoneNormalized: '+905551000060',
        password: 'correct-horse',
        kvkkAccepted: false,
      });
      expect(noKvkk.ok).toBe(false);
      if (!noKvkk.ok) expect(noKvkk.reason).toBe('KVKK_REQUIRED');

      const weakPwd = await svc.registerByPhoneAndPassword({
        phoneNormalized: '+905551000061',
        password: 'short',
        kvkkAccepted: true,
      });
      expect(weakPwd.ok).toBe(false);
      if (!weakPwd.ok) expect(weakPwd.reason).toBe('PASSWORD_POLICY');
    } finally {
      delete process.env.CUSTOMER_REGISTRATION_OTP_SUSPENDED;
      vi.resetModules();
    }
  });
});
