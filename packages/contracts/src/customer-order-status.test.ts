import { describe, expect, it } from 'vitest';

import { mapOrderStatusToStitchStepperIndex } from './customer-order-status.js';

describe('customer-safe order tracker mapping', () => {
  it('keeps cancelled off the happy-path stepper', () => {
    expect(mapOrderStatusToStitchStepperIndex('CANCELLED')).toBe(-1);
    expect(mapOrderStatusToStitchStepperIndex('REJECTED')).toBe(-1);
    expect(mapOrderStatusToStitchStepperIndex('PAYMENT_FAILED')).toBe(-1);
    expect(mapOrderStatusToStitchStepperIndex('PREPARING')).toBe(1);
    expect(mapOrderStatusToStitchStepperIndex('ON_THE_WAY')).toBe(2);
    expect(mapOrderStatusToStitchStepperIndex('DELIVERED')).toBe(3);
  });
});
