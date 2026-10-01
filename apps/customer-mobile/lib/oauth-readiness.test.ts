import { describe, expect, it } from 'vitest';

import { classifyOAuthProvider, oauthUnavailableCopy } from './oauth-readiness';

describe('oauth readiness', () => {
  it('does not mark Google/Apple operational without a native exchange', () => {
    expect(
      classifyOAuthProvider({ configured: false, platform: 'android', provider: 'google' }),
    ).toBe('CONFIG_READY_BUT_CREDENTIALS_MISSING');
    expect(
      classifyOAuthProvider({ configured: true, platform: 'android', provider: 'google' }),
    ).toBe('MOBILE_NATIVE_CONFIG_REQUIRED');
    expect(
      classifyOAuthProvider({ configured: true, platform: 'ios', provider: 'apple' }),
    ).toBe('MOBILE_NATIVE_CONFIG_REQUIRED');
    expect(oauthUnavailableCopy('CONFIG_READY_BUT_CREDENTIALS_MISSING', 'google')).toMatch(/Google/);
  });
});
