import { describe, expect, it } from 'vitest';

import { parseAuthCallbackUrl, parsePaymentReturnUrl, parseResetToken } from './deep-link';

describe('parsePaymentReturnUrl', () => {
  it('reads a UUID checkout id from the custom scheme', () => {
    const id = '01900000-0000-7000-8000-c10000000099';
    expect(parsePaymentReturnUrl(`fastfoodcustomer://payment/return?checkoutId=${id}`)).toEqual({
      checkoutId: id,
    });
  });

  it('ignores untrusted status flags in the query', () => {
    const id = '01900000-0000-7000-8000-c10000000099';
    const parsed = parsePaymentReturnUrl(
      `fastfoodcustomer://payment/return?checkoutId=${id}&status=PAID&secret=abc`,
    );
    expect(parsed.checkoutId).toBe(id);
  });

  it('rejects non-uuid tokens', () => {
    expect(parsePaymentReturnUrl('fastfoodcustomer://payment/return?checkoutId=paid')).toEqual({
      checkoutId: null,
    });
  });

  it('reads a UUID from the payment path without trusting status', () => {
    const id = '01900000-0000-7000-8000-c10000000099';
    expect(parsePaymentReturnUrl(`fastfoodcustomer://payment/${id}?status=PAID`)).toEqual({
      checkoutId: id,
    });
  });
});

describe('parseAuthCallbackUrl', () => {
  it('extracts refresh material without treating it as proven identity', () => {
    const parsed = parseAuthCallbackUrl(
      'fastfoodcustomer://auth/callback?customerId=cust-12345&refreshToken=refresh-token-1&next=/account',
    );
    expect(parsed.refreshToken).toBe('refresh-token-1');
    expect(parsed.customerId).toBe('cust-12345');
    expect(parsed.next).toBe('/account');
  });

  it('rejects short untrusted tokens', () => {
    expect(parseAuthCallbackUrl('fastfoodcustomer://auth/callback?refreshToken=ab').refreshToken).toBeNull();
  });
});

describe('parseResetToken', () => {
  it('reads a reset token from the custom scheme', () => {
    expect(parseResetToken('fastfoodcustomer://auth/reset?token=reset-token-value')).toBe(
      'reset-token-value',
    );
  });
});
