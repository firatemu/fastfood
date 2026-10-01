/** Client-side OTP resend window. Server remains the authority (OTP_COOLDOWN). */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function otpResendAvailableAt(sentAtMs: number, cooldownSeconds = OTP_RESEND_COOLDOWN_SECONDS): number {
  return sentAtMs + cooldownSeconds * 1000;
}

export function otpSecondsRemaining(nowMs: number, availableAtMs: number): number {
  return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
}
