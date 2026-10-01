import { describe, expect, it } from 'vitest';

import { parseOrderDeepLink, parseTableDeepLink } from './deep-link';
import { parseTableCode } from './table-code';

describe('table-code deep-link validation', () => {
  it('accepts a public alphanumeric code from the custom scheme', () => {
    expect(parseTableCode('T12')).toBe('T12');
    expect(parseTableDeepLink('fastfoodcustomer://table/T12-A')).toEqual({ code: 'T12-A' });
    expect(parseTableDeepLink('fastfoodcustomer://table?code=BR1')).toEqual({ code: 'BR1' });
  });

  it('rejects junk, paths, and oversized codes', () => {
    expect(parseTableCode('../etc')).toBeNull();
    expect(parseTableCode('ab')).toBeNull();
    expect(parseTableCode('x'.repeat(33))).toBeNull();
    expect(parseTableDeepLink('fastfoodcustomer://table/no spaces')).toEqual({ code: null });
  });
});

describe('order deep-link validation', () => {
  it('extracts a UUID order id and ignores status flags', () => {
    const id = '01900000-0000-7000-8000-c10000000099';
    expect(parseOrderDeepLink(`fastfoodcustomer://orders/${id}?status=DELIVERED`)).toEqual({
      orderId: id,
    });
    expect(parseOrderDeepLink('fastfoodcustomer://orders/not-an-id')).toEqual({ orderId: null });
  });
});
