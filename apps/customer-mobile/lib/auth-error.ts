import { ApiError, ApiNetworkError, ApiTimeoutError } from '@fastfood/api-client';

const CUSTOMER_REASON_MESSAGES: Record<string, string> = {
  OTP_EXPIRED: 'Kodun süresi doldu. Yeni kod isteyin.',
  OTP_ATTEMPTS_EXHAUSTED: 'Çok fazla deneme. Yeni kod isteyin.',
  EMAIL_TAKEN: 'Bu e-posta zaten kayıtlı.',
  KVKK_REQUIRED: 'Devam etmek için KVKK onayını işaretleyin.',
  PASSWORD_POLICY: 'Şifre en az 10 karakter olmalı.',
  OAUTH_UNAVAILABLE: 'Bu giriş yöntemi henüz yapılandırılmadı.',
};

const CUSTOMER_CODE_MESSAGES: Record<string, string> = {
  RATE_LIMITED: 'Çok fazla deneme. Lütfen bekleyin.',
  AUTH_INVALID_CREDENTIALS:
    'Telefon numarası/e-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.',
  AUTH_SESSION_EXPIRED: 'Oturum sona erdi. Yeniden giriş yapın.',
  VALIDATION_ERROR: 'Girilen bilgiler doğrulanamadı. Lütfen alanları kontrol edin.',
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.envelope.error.details as
      | { reason?: string; retryAfterSeconds?: number }
      | undefined;
    const reason = details?.reason;
    if (reason === 'OTP_COOLDOWN') {
      return `Yeni kod için ${details?.retryAfterSeconds ?? 60} sn bekleyin.`;
    }
    if (reason && CUSTOMER_REASON_MESSAGES[reason]) {
      return CUSTOMER_REASON_MESSAGES[reason];
    }
    const codeMessage = CUSTOMER_CODE_MESSAGES[err.envelope.error.code];
    if (codeMessage) {
      return codeMessage;
    }
    if (err.status === 401) {
      return 'Oturum süresi doldu veya giriş bilgileri doğrulanamadı.';
    }
    if (err.status >= 500) {
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    }
    return err.envelope.error.message || 'İşlem tamamlanamadı.';
  }
  if (err instanceof ApiTimeoutError) {
    return 'Sunucu yanıt vermedi (zaman aşımı). Lütfen bağlantınızı kontrol edip tekrar deneyin.';
  }
  if (err instanceof ApiNetworkError) {
    return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'İşlem tamamlanamadı.';
}
