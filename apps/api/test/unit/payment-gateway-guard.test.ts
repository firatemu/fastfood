/**
 * Production-readiness audit P0-6 — the simulated payment gateway must never
 * boot in production, and it trusts client-asserted payment status, so the
 * guard is a fatal error rather than a warning.
 */
import { describe, expect, it } from 'vitest';

import { SimulatedPaymentAdapter } from '../../src/modules/payment/simulated-payment.adapter.js';

describe('simulated payment gateway guard (audit P0-6)', () => {
  it('refuses to boot in production', () => {
    expect(
      () =>
        new SimulatedPaymentAdapter({
          nodeEnv: 'production',
          explicitlyAllowed: true,
        }),
    ).toThrow(/production/);
  });

  it('refuses to boot in production even without the explicit flag', () => {
    expect(() => new SimulatedPaymentAdapter({ nodeEnv: 'production' })).toThrow(/production/);
  });

  it('boots in development and test without the explicit flag', () => {
    expect(new SimulatedPaymentAdapter({ nodeEnv: 'development' })).toBeInstanceOf(
      SimulatedPaymentAdapter,
    );
    expect(new SimulatedPaymentAdapter({ nodeEnv: 'test' })).toBeInstanceOf(
      SimulatedPaymentAdapter,
    );
  });

  it('requires the explicit flag outside development and test', () => {
    expect(() => new SimulatedPaymentAdapter({ nodeEnv: 'staging' })).toThrow(
      /ALLOW_SIMULATED_PAYMENTS/,
    );
    expect(
      new SimulatedPaymentAdapter({ nodeEnv: 'staging', explicitlyAllowed: true }),
    ).toBeInstanceOf(SimulatedPaymentAdapter);
  });

  it('still trusts client-asserted status — the reason the guard exists', () => {
    const adapter = new SimulatedPaymentAdapter({ nodeEnv: 'test' });
    expect(adapter.acceptsClientAssertedStatus).toBe(true);
  });
});
