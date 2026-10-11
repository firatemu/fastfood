import { describe, expect, it } from 'vitest';

import { securityPosture } from './account-security-posture';

describe('securityPosture', () => {
  it('reports strong only when all three required checks pass', () => {
    const posture = securityPosture({
      hasPassword: true,
      emailVerified: true,
      phoneVerified: true,
    });
    expect(posture.level).toBe('strong');
    expect(posture.score).toBe(3);
    expect(posture.total).toBe(3);
    expect(posture.headline).toBe('Hesabın güçlü korunuyor');
    expect(posture.summary).toBe('Parola ve iki doğrulama kanıtın yerinde.');
  });

  it('reports fair with exactly one step outstanding', () => {
    const posture = securityPosture({
      hasPassword: true,
      emailVerified: true,
      phoneVerified: false,
    });
    expect(posture.level).toBe('fair');
    expect(posture.score).toBe(2);
    expect(posture.summary).toBe('1 adım tamamlanmadı.');
  });

  it('reports weak when more than one step is outstanding', () => {
    const posture = securityPosture({
      hasPassword: true,
      emailVerified: false,
      phoneVerified: false,
    });
    expect(posture.level).toBe('weak');
    expect(posture.score).toBe(1);
    expect(posture.summary).toBe('2 adım tamamlanmadı.');
  });

  it('treats a passwordless account with no verifications as weak, not fair', () => {
    const posture = securityPosture({
      hasPassword: false,
      emailVerified: false,
      phoneVerified: false,
    });
    expect(posture.level).toBe('weak');
    expect(posture.score).toBe(0);
    expect(posture.summary).toBe('3 adım tamamlanmadı.');
  });

  it('never marks an unsatisfied check as done', () => {
    const posture = securityPosture({
      hasPassword: false,
      emailVerified: false,
      phoneVerified: true,
    });
    const byId = Object.fromEntries(posture.checks.map((c) => [c.id, c]));
    expect(byId.password?.satisfied).toBe(false);
    expect(byId.email?.satisfied).toBe(false);
    expect(byId.phone?.satisfied).toBe(true);
  });

  it('always returns exactly the three required checks in a stable order', () => {
    const posture = securityPosture({
      hasPassword: true,
      emailVerified: true,
      phoneVerified: true,
    });
    expect(posture.checks.map((c) => c.id)).toEqual(['password', 'email', 'phone']);
  });
});