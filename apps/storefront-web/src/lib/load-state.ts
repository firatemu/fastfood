import { ApiError } from '@fastfood/api-client';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'empty' }
  | { status: 'ready'; data: T };

const GENERIC_CUSTOMER_ERROR = 'Beklenmeyen bir hata oluştu. Tekrar deneyin.';

function isInternalErrorText(text: string): boolean {
  if (text.length > 240) return true;
  return /TypeError|ReferenceError|SyntaxError|Cannot read|ECONNREFUSED|ECONNRESET|prisma|nestjs|Failed to fetch|NetworkError|fetch failed|An unexpected error occurred|A customer session or guest session is required|API returned a payload that did not match the shared contract|Request failed\.| at [A-Za-z0-9_./:\\-]+\d+/i.test(
    text,
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.envelope.error.code === 'AUTH_UNAUTHENTICATED') {
      return 'Oturum gerekli. Lütfen giriş yapın.';
    }
    if (error.status === 403 || error.envelope.error.code === 'AUTH_PERMISSION_DENIED') {
      return 'Bu işlem için yetkiniz yok.';
    }
    if (error.envelope.error.code === 'INTERNAL_ERROR') {
      return GENERIC_CUSTOMER_ERROR;
    }
    const apiText = error.envelope.error.message;
    return isInternalErrorText(apiText) ? GENERIC_CUSTOMER_ERROR : apiText;
  }
  if (error instanceof Error) {
    return isInternalErrorText(error.message) ? GENERIC_CUSTOMER_ERROR : error.message;
  }
  return GENERIC_CUSTOMER_ERROR;
}
