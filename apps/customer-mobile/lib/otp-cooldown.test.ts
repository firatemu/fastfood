import { describe, expect, it } from 'vitest';

import { otpResendAvailableAt, otpSecondsRemaining } from './otp-cooldown';

describe('otpSecondsRemaining', () => {
  it('counts down until the cooldown elapses', () => {
    const availableAt = otpResendAvailableAt(1_000, 60);
    expect(availableAt).toBe(61_000);
    expect(otpSecondsRemaining(1_000, availableAt)).toBe(60);
    expect(otpSecondsRemaining(61_000, availableAt)).toBe(0);
    expect(otpSecondsRemaining(80_000, availableAt)).toBe(0);
  });
});
