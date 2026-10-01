import { describe, expect, it } from 'vitest';

import { readPaymentSummary, writePaymentSummary } from './payment-session';
import {
  cacheAddresses,
  cacheClub,
  cacheFavorites,
  cacheIdentities,
  cacheLoyaltyPoints,
  cacheNotifications,
  cachePreferences,
  cacheProfile,
  clearPrivateCustomerCache,
  readCachedAddresses,
  readCachedClub,
  readCachedFavorites,
  readCachedIdentities,
  readCachedLoyaltyPoints,
  readCachedNotifications,
  readCachedPreferences,
  readCachedProfile,
} from './private-cache';

describe('private cache invalidation', () => {
  it('clears profile, addresses, preferences, identities, and payment snapshot', () => {
    cacheProfile({ id: 'cust-1', displayName: 'A', email: 'a@b.c' });
    cachePreferences({
      marketingOptIn: true,
      newsletterOptIn: true,
      orderUpdatesOptIn: true,
    });
    cacheAddresses([
      {
        id: 'addr-1',
        recipientName: 'A',
        recipientPhone: '+905321234567',
        latitude: 41,
        longitude: 29,
      },
    ]);
    cacheIdentities({
      phoneVerified: true,
      emailVerified: true,
      hasPassword: true,
      identities: [{ provider: 'EMAIL_PASSWORD', emailNormalized: 'a@b.c' }],
    });
    cacheLoyaltyPoints('12');
    writePaymentSummary({
      checkoutSessionId: '01900000-0000-7000-8000-c10000000099',
      lines: [],
      currency: 'TRY',
      merchandiseGrossSubtotalMinor: '0',
      finalPayableMinor: '0',
    });
    cacheFavorites([
      {
        id: 'fav-1',
        productId: 'prod-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        product: null,
      },
    ]);
    cacheClub({
      programName: 'BURGER HOME CLUB',
      points: '10',
      lifetimeEarnedPoints: '20',
      currentTier: { code: 'BRONZE', displayName: 'Bronz', minLifetimeEarnedPoints: '0' },
      nextTier: null,
      pointsToNextTier: null,
      progressBps: 0,
      welcome: { status: 'USED', promotionCode: null, discountMinor: null, expiresAt: null },
      activity: [],
    });
    cacheNotifications([{ id: 'n1', title: 't', body: 'b', href: null, read: false, createdAt: '2026-01-01T00:00:00.000Z' }]);

    clearPrivateCustomerCache();

    expect(readCachedProfile()).toBeNull();
    expect(readCachedPreferences()).toBeNull();
    expect(readCachedAddresses()).toBeNull();
    expect(readCachedIdentities()).toBeNull();
    expect(readCachedLoyaltyPoints()).toBeNull();
    expect(readCachedFavorites()).toBeNull();
    expect(readCachedClub()).toBeNull();
    expect(readCachedNotifications()).toBeNull();
    expect(readPaymentSummary()).toBeNull();
  });
});
