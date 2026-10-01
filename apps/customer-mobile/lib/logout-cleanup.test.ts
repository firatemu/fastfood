import { describe, expect, it } from 'vitest';

import { memoryKv } from './kv';
import { cacheProfile, clearPrivateCustomerCache, readCachedProfile } from './private-cache';
import {
  SECRET_SESSION_KEY,
  GUEST_SESSION_KEY,
  configureSessionStores,
  getCustomerSession,
  getGuestSessionId,
  persistCustomerSession,
  resetSessionForTests,
  rotateGuestSessionId,
} from './session';

describe('logout cleanup', () => {
  it('drops secure credentials and private cache together', async () => {
    await resetSessionForTests();
    const secret = memoryKv();
    configureSessionStores({ secret, guest: memoryKv() });
    await persistCustomerSession({
      customerId: 'cust-1',
      accessToken: 'refresh-1',
      refreshToken: 'refresh-1',
      refreshExpiresAt: '2099-01-01T00:00:00.000Z',
    });
    cacheProfile({ id: 'cust-1', displayName: 'A', email: 'a@b.c' });

    await persistCustomerSession(null);
    clearPrivateCustomerCache();

    expect(getCustomerSession()).toBeNull();
    expect(await secret.getItem(SECRET_SESSION_KEY)).toBeNull();
    expect(readCachedProfile()).toBeNull();
  });

  it('mints a new guest id so the merged cart key is not reused', async () => {
    await resetSessionForTests();
    const guest = memoryKv();
    configureSessionStores({ secret: memoryKv(), guest });
    const previous = getGuestSessionId();
    await guest.setItem(GUEST_SESSION_KEY, previous);
    const next = await rotateGuestSessionId();
    expect(next).not.toBe(previous);
    expect(getGuestSessionId()).toBe(next);
    expect(await guest.getItem(GUEST_SESSION_KEY)).toBe(next);
  });
});
