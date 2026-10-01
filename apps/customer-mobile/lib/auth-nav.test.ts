import { describe, expect, it } from 'vitest';

import { resolveProtectedNavigation, safeReturnDestination } from './auth-nav';

describe('safeReturnDestination', () => {
  it('allows known in-app destinations', () => {
    expect(safeReturnDestination('/checkout')).toBe('/checkout');
    expect(safeReturnDestination('/account/club')).toBe('/account/club');
    expect(safeReturnDestination('/branches')).toBe('/branches');
    expect(safeReturnDestination('/table/scan')).toBe('/table/scan');
    expect(safeReturnDestination('/(tabs)/account')).toBe('/(tabs)/account');
  });

  it('rejects open redirects and auth loops', () => {
    expect(safeReturnDestination('https://evil.example/phish')).toBe('/(tabs)/account');
    expect(safeReturnDestination('//evil.example')).toBe('/(tabs)/account');
    expect(safeReturnDestination('/auth')).toBe('/(tabs)/account');
    expect(safeReturnDestination('/auth/callback')).toBe('/(tabs)/account');
    expect(safeReturnDestination('/payment/return?token=abc')).toBe('/(tabs)/account');
    expect(safeReturnDestination('../etc/passwd')).toBe('/(tabs)/account');
  });
});

describe('protected-route decision', () => {
  it('waits while bootstrap is unresolved', () => {
    expect(
      resolveProtectedNavigation({
        path: '/account/security',
        bootstrap: 'pending',
        authenticated: false,
      }),
    ).toBe('wait');
  });

  it('sends guests on protected screens to auth', () => {
    expect(
      resolveProtectedNavigation({
        path: '/account/addresses',
        bootstrap: 'ready',
        authenticated: false,
      }),
    ).toBe('send_to_auth');
    expect(
      resolveProtectedNavigation({
        path: '/account/favorites',
        bootstrap: 'ready',
        authenticated: false,
      }),
    ).toBe('send_to_auth');
    expect(
      resolveProtectedNavigation({
        path: '/cart',
        bootstrap: 'ready',
        authenticated: false,
      }),
    ).toBe('send_to_auth');
  });

  it('allows public screens for guests', () => {
    expect(
      resolveProtectedNavigation({
        path: '/checkout',
        bootstrap: 'ready',
        authenticated: false,
      }),
    ).toBe('allow_public');
    expect(
      resolveProtectedNavigation({
        path: '/table/T12',
        bootstrap: 'ready',
        authenticated: false,
      }),
    ).toBe('allow_public');
  });
});
