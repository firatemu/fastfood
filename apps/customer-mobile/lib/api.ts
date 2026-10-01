import { ApiClient, ApiError, ApiNetworkError, ApiTimeoutError } from '@fastfood/api-client';

import { getApiBaseUrl } from './env';
import { getCustomerSession, getGuestSessionId } from './session';

/**
 * Canonical API client for customer-mobile (document 17 + 40).
 * Guest cart uses `x-session-id`; authenticated flows send the opaque
 * refresh token as Bearer. Browser-supplied user ids are not trusted.
 */
export function getApiClient(): ApiClient {
  return new ApiClient({
    baseUrl: getApiBaseUrl(),
    getAccessToken: () => getCustomerSession()?.refreshToken ?? getCustomerSession()?.accessToken,
    fetchImpl: async (input, init) => {
      const headers = new Headers(init?.headers);
      const session = getCustomerSession();
      if (session?.customerId) {
        headers.delete('x-session-id');
      } else {
        headers.set('x-session-id', getGuestSessionId());
      }
      return fetch(input, { ...init, headers });
    },
  });
}

function isInternalErrorText(text: string): boolean {
  if (text.length > 240) return true;
  return /TypeError|ReferenceError|SyntaxError|Cannot read|ECONNREFUSED|ECONNRESET|prisma|nestjs|Failed to fetch|NetworkError|fetch failed|An unexpected error occurred|A customer session or guest session is required|API returned a payload that did not match the shared contract|Request failed\.| at [A-Za-z0-9_./:\\-]+\d+/i.test(
    text,
  );
}

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.envelope.error.code === 'AUTH_UNAUTHENTICATED') {
      return 'Oturum gerekli. Lütfen giriş yapın.';
    }
    if (error.status === 403 || error.envelope.error.code === 'AUTH_PERMISSION_DENIED') {
      return 'Bu işlem için yetkiniz yok.';
    }
    if (error.envelope.error.code === 'INTERNAL_ERROR') {
      return 'Beklenmeyen bir hata oluştu. Tekrar deneyin.';
    }
    const apiText = error.envelope.error.message;
    return isInternalErrorText(apiText) ? 'Beklenmeyen bir hata oluştu. Tekrar deneyin.' : apiText;
  }
  if (error instanceof ApiTimeoutError) {
    return 'İstek zaman aşımına uğradı.';
  }
  if (error instanceof ApiNetworkError) {
    return 'Ağ hatası — API’ye ulaşılamıyor.';
  }
  if (error instanceof Error) {
    return isInternalErrorText(error.message)
      ? 'Beklenmeyen bir hata oluştu. Tekrar deneyin.'
      : error.message;
  }
  return 'Beklenmeyen bir hata oluştu. Tekrar deneyin.';
}
