import { describe, expect, it } from 'vitest';

import { isPaymentTerminalStatus } from './payment-status';

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
