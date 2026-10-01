import { describe, expect, it } from 'vitest';

import { isPaymentTerminalStatus, postPaymentNavigation, shouldPollPayment } from './payment-status';

describe('isPaymentTerminalStatus', () => {
  it('stops polling after paid, failed, cancelled, or expired', () => {
    expect(isPaymentTerminalStatus('PAID')).toBe(true);
    expect(isPaymentTerminalStatus('FAILED')).toBe(true);
    expect(isPaymentTerminalStatus('CANCELLED')).toBe(true);
    expect(isPaymentTerminalStatus('EXPIRED')).toBe(true);
    expect(isPaymentTerminalStatus('PENDING')).toBe(false);
    expect(isPaymentTerminalStatus('INITIATED')).toBe(false);
  });
});

describe('shouldPollPayment', () => {
  it('polls only while mounted, foregrounded, and non-terminal', () => {
    expect(shouldPollPayment({ status: 'PENDING', appState: 'active', mounted: true })).toBe(true);
    expect(shouldPollPayment({ status: 'PENDING', appState: 'background', mounted: true })).toBe(
      false,
    );
    expect(shouldPollPayment({ status: 'PAID', appState: 'active', mounted: true })).toBe(false);
    expect(shouldPollPayment({ status: 'PENDING', appState: 'active', mounted: false })).toBe(false);
  });
});

describe('postPaymentNavigation', () => {
  it('routes paid checkouts to confirmation using the server order id', () => {
    expect(postPaymentNavigation('PAID', 'ord-1')).toEqual({
      kind: 'confirmation',
      href: '/orders/ord-1/confirmation',
    });
  });

  it('does not treat paid-without-order as confirmation', () => {
    expect(postPaymentNavigation('PAID', null).kind).toBe('pending');
  });

  it('sends failed states back to checkout', () => {
    expect(postPaymentNavigation('FAILED', null).href).toBe('/checkout');
    expect(postPaymentNavigation('EXPIRED', null).kind).toBe('failed');
  });
});
