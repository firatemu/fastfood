'use client';

import { ApiError, ApiNetworkError, ApiTimeoutError } from '@fastfood/api-client';

/**
 * Load-state yardimcilari.
 *
 * Once burada `AsyncBoundary` ve `ForbiddenNotice` de yasiyordu ve
 * `@fastfood/ui-web` primitiflerini (`LoadingState`, `ErrorState`,
 * `EmptyState`, `AccessDenied`, `Button`) kullaniyordu. Bu, emekli tasarim
 * sisteminin butun admin yuzeyine global olarak tasinmasinin son ayak noktasi
 *ydi: `styles.css` bu bilesenlerin `ff-*` siniflarini tasiyordu.
 *
 * Durum yuzeyleri icin tek Navy ilkeli `OpsBoundary` kullanilir
 * (`components/ops/ops-boundary.tsx`); `/catalog/products` de buna gecirildi.
 * Bu dosya artik yalnizca veri sekli ve hata cozumlemesi tasir.
 */

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'empty' }
  | { status: 'ready'; data: T };

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Kullanıcı adı/e-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.',
  AUTH_SESSION_EXPIRED: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
  AUTH_UNAUTHENTICATED: 'Devam etmek için giriş yapmalısınız.',
  AUTH_PERMISSION_DENIED: 'Bu işlem için yetkiniz bulunmuyor.',
  AUTH_SCOPE_DENIED: 'Bu şube veya kapsam için erişim yetkiniz bulunmuyor.',
  VALIDATION_ERROR: 'Lütfen girdiğiniz bilgileri kontrol edin.',
  RATE_LIMITED: 'Çok fazla deneme yapıldı. Lütfen biraz bekleyin.',
  NOT_FOUND: 'İstenen kayıt bulunamadı.',
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = ADMIN_ERROR_MESSAGES[error.envelope.error.code];
    if (mapped) return mapped;
    if (error.status === 401) return 'Oturum süresi doldu veya kimlik bilgileri doğrulanamadı.';
    if (error.status === 403) return 'Bu işlem için yetkiniz bulunmuyor.';
    if (error.status >= 500) return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    return error.envelope.error.message || 'İşlem tamamlanamadı.';
  }
  if (error instanceof ApiTimeoutError) {
    return 'Sunucu yanıt vermedi (zaman aşımı). Lütfen bağlantınızı kontrol edip tekrar deneyin.';
  }
  if (error instanceof ApiNetworkError) {
    return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Beklenmeyen bir hata oluştu.';
}

export function isForbidden(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 403 || error.envelope.error.code === 'AUTH_PERMISSION_DENIED')
  );
}

export function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.envelope.error.code === 'AUTH_UNAUTHENTICATED')
  );
}
