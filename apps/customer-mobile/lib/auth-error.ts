import { ApiError } from '@fastfood/api-client';

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.envelope.error.details as
      | { reason?: string; retryAfterSeconds?: number }
      | undefined;
    const reason = details?.reason;
    if (reason === 'OTP_EXPIRED') return 'Kodun süresi doldu. Yeni kod isteyin.';
    if (reason === 'OTP_ATTEMPTS_EXHAUSTED') return 'Çok fazla deneme. Yeni kod isteyin.';
    if (reason === 'OTP_COOLDOWN') {
      return `Yeni kod için ${details?.retryAfterSeconds ?? 60} sn bekleyin.`;
    }
    if (reason === 'EMAIL_TAKEN') return 'Bu e-posta zaten kayıtlı.';
    if (reason === 'KVKK_REQUIRED') return 'Devam etmek için KVKK onayını işaretleyin.';
    if (reason === 'PASSWORD_POLICY') return 'Şifre en az 10 karakter olmalı.';
    if (reason === 'OAUTH_UNAVAILABLE') return 'Bu giriş yöntemi henüz yapılandırılmadı.';
    if (err.envelope.error.code === 'RATE_LIMITED') return 'Çok fazla deneme. Lütfen bekleyin.';
    if (err.envelope.error.code === 'AUTH_INVALID_CREDENTIALS') return 'Giriş bilgileri doğrulanamadı.';
    if (err.envelope.error.code === 'AUTH_SESSION_EXPIRED') return 'Oturum sona erdi. Yeniden giriş yapın.';
    if (err.envelope.error.code === 'VALIDATION_ERROR') return 'Girilen bilgiler doğrulanamadı.';
    return err.envelope.error.message;
  }
  if (err instanceof Error) return err.message;
  return 'İşlem tamamlanamadı.';
}
