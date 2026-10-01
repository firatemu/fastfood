import { ApiError, ApiNetworkError } from '@fastfood/api-client';
import { afterEach, describe, expect, it } from 'vitest';

import { memoryKv } from './kv.js';
import {
  SECRET_SESSION_KEY,
  configureSessionStores,
  getAuthBootstrapState,
  getCustomerSession,
  getGuestSessionId,
  resetSessionForTests,
  restoreSession,
  setSessionRefresh,
} from './session.js';

const expiredEnvelope = {
  error: {
    code: 'AUTH_SESSION_EXPIRED',
    message: 'Refresh failed.',
    requestId: '01900000-0000-7000-8000-000000000099',
  },
};

afterEach(async () => {
  await resetSessionForTests();
});

describe('session restore adapter', () => {
  it('restores a validated session through the secret store', async () => {
    const secret = memoryKv();
    const guest = memoryKv();
    await secret.setItem(
      SECRET_SESSION_KEY,
      JSON.stringify({
        customerId: 'cust-1',
        refreshToken: 'refresh-old',
        refreshExpiresAt: '2099-01-01T00:00:00.000Z',
      }),
    );
    configureSessionStores({ secret, guest });
    setSessionRefresh(async () => ({
      customerId: 'cust-1',
      accessToken: 'refresh-new',
      refreshToken: 'refresh-new',
      refreshExpiresAt: '2099-06-01T00:00:00.000Z',
    }));

    const state = await restoreSession();
    expect(state).toBe('ready');
    expect(getCustomerSession()?.refreshToken).toBe('refresh-new');
    expect(JSON.parse((await secret.getItem(SECRET_SESSION_KEY)) ?? '{}').refreshToken).toBe(
      'refresh-new',
    );
  });

  it('clears corrupt secret material and stays guest', async () => {
    const secret = memoryKv();
    const guest = memoryKv();
    await secret.setItem(SECRET_SESSION_KEY, '{not-json');
    configureSessionStores({ secret, guest });
    setSessionRefresh(async () => {
      throw new Error('should not refresh corrupt payload');
    });
    const state = await restoreSession();
    expect(state).toBe('ready');
    expect(getCustomerSession()).toBeNull();
    expect(await secret.getItem(SECRET_SESSION_KEY)).toBeNull();
    expect(getGuestSessionId().length).toBeGreaterThan(8);
  });

  it('clears revoked sessions and does not keep stale identity', async () => {
    const secret = memoryKv();
    configureSessionStores({ secret, guest: memoryKv() });
    await secret.setItem(
      SECRET_SESSION_KEY,
      JSON.stringify({
        customerId: 'cust-1',
        refreshToken: 'refresh-old',
        refreshExpiresAt: '2099-01-01T00:00:00.000Z',
      }),
    );
    setSessionRefresh(async () => {
      throw new ApiError(401, expiredEnvelope);
    });
    const state = await restoreSession();
    expect(state).toBe('ready');
    expect(getCustomerSession()).toBeNull();
    expect(await secret.getItem(SECRET_SESSION_KEY)).toBeNull();
  });

  it('keeps secret material on network failure and hides private identity', async () => {
    const secret = memoryKv();
    const payload = JSON.stringify({
      customerId: 'cust-1',
      refreshToken: 'refresh-old',
      refreshExpiresAt: '2099-01-01T00:00:00.000Z',
    });
    await secret.setItem(SECRET_SESSION_KEY, payload);
    configureSessionStores({ secret, guest: memoryKv() });
    setSessionRefresh(async () => {
      throw new ApiNetworkError('offline', new Error('offline'));
    });
    const state = await restoreSession();
    expect(state).toBe('offline');
    expect(getAuthBootstrapState()).toBe('offline');
    expect(getCustomerSession()).toBeNull();
    expect(await secret.getItem(SECRET_SESSION_KEY)).toBe(payload);
  });
});
