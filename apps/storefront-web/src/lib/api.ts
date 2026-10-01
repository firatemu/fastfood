import { ApiClient } from '@fastfood/api-client';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const GUEST_SESSION_KEY = 'ff_guest_session_id';
const CUSTOMER_ID_KEY = 'ff_customer_id';
const CUSTOMER_REFRESH_KEY = 'ff_customer_refresh';

function randomSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  }
  return `guest${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

export function getGuestSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-guest';
  let id = window.localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = randomSessionId();
    window.localStorage.setItem(GUEST_SESSION_KEY, id);
    document.cookie = `ff_guest_session=${id}; path=/; SameSite=Lax; max-age=2592000`;
  }
  return id;
}

export function getCustomerId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(CUSTOMER_ID_KEY) ?? undefined;
}

export function getCustomerRefreshToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(CUSTOMER_REFRESH_KEY) ?? undefined;
}

export function isCustomerAuthenticated(): boolean {
  return Boolean(getCustomerId() && getCustomerRefreshToken());
}

export function setCustomerSession(customerId: string, refreshToken: string): void {
  window.localStorage.setItem(CUSTOMER_ID_KEY, customerId);
  window.localStorage.setItem(CUSTOMER_REFRESH_KEY, refreshToken);
}

export function clearCustomerSession(): void {
  window.localStorage.removeItem(CUSTOMER_ID_KEY);
  window.localStorage.removeItem(CUSTOMER_REFRESH_KEY);
}

export function createStorefrontClient(): ApiClient {
  return new ApiClient({
    baseUrl: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
    getAccessToken: () => getCustomerRefreshToken() ?? undefined,
  });
}

export function sessionHeaders(): Record<string, string> {
  return {
    'X-Session-Id': getGuestSessionId(),
  };
}
