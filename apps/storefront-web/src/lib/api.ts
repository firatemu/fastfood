import { ApiClient } from '@fastfood/api-client';

import { authSessionResponseSchema } from './schemas';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const GUEST_SESSION_KEY = 'ff_guest_session_id';
const CUSTOMER_ID_KEY = 'ff_customer_id';

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

/**
 * The customer id is an identity hint, not a credential: it never authorises
 * an API call. The refresh credential lives in an HttpOnly cookie and the
 * access token lives in memory only (document 32 §5, audit P0-3).
 */
export function getCustomerId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(CUSTOMER_ID_KEY) ?? undefined;
}

let accessToken: string | undefined;
let accessTokenExpiresAt = 0;
let accessTokenRequest: Promise<string | undefined> | undefined;

export interface CustomerSession {
  customerId: string;
  accessToken: string;
  accessExpiresAt: string;
}

const REFRESH_SKEW_MS = 60_000;

function apiBaseUrl(): string {
  return API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
}

/**
 * Session client — never carries a bearer token and always sends the
 * HttpOnly refresh cookie.
 */
function createSessionClient(): ApiClient {
  return new ApiClient({
    baseUrl: apiBaseUrl(),
    credentials: 'include',
  });
}

export function isCustomerAuthenticated(): boolean {
  return Boolean(getCustomerId());
}

export function setCustomerSession(input: {
  customerId: string;
  accessToken: string;
  accessExpiresAt?: string;
}): void {
  accessToken = input.accessToken;
  accessTokenExpiresAt = input.accessExpiresAt
    ? new Date(input.accessExpiresAt).getTime()
    : Date.now() + 10 * 60 * 1000;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOMER_ID_KEY, input.customerId);
  }
}

export function clearCustomerSession(): void {
  accessToken = undefined;
  accessTokenExpiresAt = 0;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CUSTOMER_ID_KEY);
  }
}

/**
 * Exchange the HttpOnly refresh cookie for a fresh access token. The refresh
 * credential never reaches JavaScript.
 */
export async function refreshCustomerSession(): Promise<CustomerSession | null> {
  const res = await createSessionClient().request({
    method: 'POST',
    path: 'auth/customer/refresh',
    body: {},
    credentials: 'include',
    schema: authSessionResponseSchema,
  });
  const session: CustomerSession = {
    customerId: res.data.customerId,
    accessToken: res.data.accessToken,
    accessExpiresAt: res.data.accessExpiresAt,
  };
  setCustomerSession(session);
  return session;
}

/**
 * Resolve the bearer token for a business request. A missing or expired
 * access token is refreshed transparently from the session cookie.
 */
async function resolveCustomerAccessToken(): Promise<string | undefined> {
  if (accessToken && Date.now() < accessTokenExpiresAt - REFRESH_SKEW_MS) {
    return accessToken;
  }
  if (!getCustomerId()) return undefined;
  if (!accessTokenRequest) {
    accessTokenRequest = refreshCustomerSession()
      .then((session) => session?.accessToken)
      .catch(() => {
        clearCustomerSession();
        return undefined;
      })
      .finally(() => {
        accessTokenRequest = undefined;
      });
  }
  return accessTokenRequest;
}

export function createStorefrontClient(): ApiClient {
  return new ApiClient({
    baseUrl: apiBaseUrl(),
    // The session cookie is set by the API on the auth responses, so every
    // request has to carry the credential transport — without it the browser
    // ignores the `Set-Cookie` header of a cross-origin response.
    credentials: 'include',
    getAccessToken: () => resolveCustomerAccessToken(),
    onUnauthorized: () => {
      if (getCustomerId()) clearCustomerSession();
    },
  });
}

export function sessionHeaders(): Record<string, string> {
  return {
    'X-Session-Id': getGuestSessionId(),
  };
}
