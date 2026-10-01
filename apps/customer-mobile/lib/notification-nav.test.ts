import { describe, expect, it } from 'vitest';

import { notificationDestination } from './notification-nav';

describe('notification navigation validation', () => {
  it('allows known in-app destinations', () => {
    expect(notificationDestination('/orders/01900000-0000-7000-8000-c10000000099')).toBe(
      '/orders/01900000-0000-7000-8000-c10000000099',
    );
    expect(notificationDestination('/deals')).toBe('/deals');
    expect(notificationDestination('/legal/allergens')).toBe('/legal/allergens');
    expect(notificationDestination('/account/support?orderId=abc')).toBe(
      '/account/support?orderId=abc',
    );
    expect(notificationDestination('/orders')).toBe('/(tabs)/orders');
  });

  it('rejects arbitrary or privileged destinations', () => {
    expect(notificationDestination('https://evil.example/phish')).toBeNull();
    expect(notificationDestination('javascript:alert(1)')).toBeNull();
    expect(notificationDestination('/auth/callback?refreshToken=abc')).toBeNull();
    expect(notificationDestination('/payment/return?checkoutId=x')).toBeNull();
    expect(notificationDestination('/admin')).toBeNull();
    expect(notificationDestination(null)).toBeNull();
  });
});
