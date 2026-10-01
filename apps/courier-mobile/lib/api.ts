import { ApiClient, ApiError, ApiNetworkError, ApiTimeoutError } from '@fastfood/api-client';

import { getApiBaseUrl } from './env';
import { getCourierSession } from './session';

/**
 * Canonical API client for courier-mobile.
 * Sends Bearer access token when present, plus `x-user-id` for the current
 * staff principal (dev identity bridge until JWT middleware lands).
 */
export function getApiClient(): ApiClient {
  return new ApiClient({
    baseUrl: getApiBaseUrl(),
    getAccessToken: () => getCourierSession()?.accessToken,
    fetchImpl: async (input, init) => {
      const headers = new Headers(init?.headers);
      const session = getCourierSession();
      if (session?.userId) {
        headers.set('x-user-id', session.userId);
      }
      return fetch(input, { ...init, headers });
    },
  });
}

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.envelope.error.message;
  }
  if (error instanceof ApiTimeoutError) {
    return 'İstek zaman aşımına uğradı.';
  }
  if (error instanceof ApiNetworkError) {
    return 'Ağ hatası — API’ye ulaşılamıyor.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Beklenmeyen bir hata oluştu.';
}
