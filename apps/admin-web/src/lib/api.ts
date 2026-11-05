import { ApiClient } from '@fastfood/api-client';

import { staffRefreshSchema } from './schemas';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const USER_ID_KEY = 'ff_staff_user_id';

/**
 * Staff session storage (production-readiness audit P0-3).
 *
 * The refresh credential lives in an HttpOnly cookie set by the API — it is
 * never readable from JavaScript and is never written to `localStorage`. The
 * access token is short-lived (15 minutes, document 32 §5) and is kept in
 * module scope only, so an XSS cannot read it out of persistent storage.
 * The user id is an identity hint, not a credential.
 */
let accessToken: string | undefined;
let accessTokenExpiresAt = 0;
let refreshPromise: Promise<string | undefined> | undefined;
let sessionExpected = false;
const listeners = new Set<() => void>();

const REFRESH_SKEW_MS = 60_000;

function notify(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeStaffSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStaffAccessToken(): string | undefined {
  return accessToken;
}

/**
 * The refresh credential is an HttpOnly cookie. There is deliberately no
 * accessor for it: JavaScript cannot read it and must not try.
 */
export function getStaffRefreshToken(): string | undefined {
  return undefined;
}

export function getStaffUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(USER_ID_KEY) ?? undefined;
}

export function setStaffSession(input: { accessToken?: string; userId?: string }): void {
  if (input.accessToken) {
    accessToken = input.accessToken;
    accessTokenExpiresAt = Date.now() + 10 * 60 * 1000;
    sessionExpected = true;
  }
  if (input.userId && typeof window !== 'undefined') {
    window.localStorage.setItem(USER_ID_KEY, input.userId);
  }
  notify();
}

export function clearStaffSession(): void {
  accessToken = undefined;
  accessTokenExpiresAt = 0;
  sessionExpected = false;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_ID_KEY);
  }
  notify();
}

function adminBaseUrl(): string {
  return API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
}

/**
 * Exchange the HttpOnly session cookie for a fresh access token. The refresh
 * credential never reaches JavaScript.
 */
async function refreshOnce(): Promise<string | undefined> {
  if (!refreshPromise) {
    refreshPromise = new ApiClient({
      baseUrl: adminBaseUrl(),
      credentials: 'include',
    })
      .request({
        method: 'POST',
        path: 'auth/staff/refresh',
        body: {},
        credentials: 'include',
        schema: staffRefreshSchema,
      })
      .then((res) => {
        setStaffSession({ accessToken: res.data.accessToken, userId: res.data.userId });
        return res.data.accessToken;
      })
      .catch(() => {
        clearStaffSession();
        return undefined;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }
  return refreshPromise;
}

/**
 * Restore a session after a full page load. The access token lives in memory
 * only, so a reload starts empty; the HttpOnly cookie still holds the server
 * session and can be exchanged for a new access token.
 */
export function restoreStaffSession(): Promise<string | undefined> {
  sessionExpected = true;
  return refreshOnce();
}

/**
 * Resolve the bearer token for a business request. A missing or expired
 * access token is refreshed transparently from the session cookie — but only
 * when a server session is actually expected, so an anonymous visitor never
 * fires a doomed refresh request.
 */
async function resolveStaffAccessToken(): Promise<string | undefined> {
  if (accessToken && Date.now() < accessTokenExpiresAt - REFRESH_SKEW_MS) {
    return accessToken;
  }
  if (!sessionExpected) return undefined;
  return refreshOnce();
}

export function createAdminClient(): ApiClient {
  return new ApiClient({
    baseUrl: adminBaseUrl(),
    credentials: 'include',
    getAccessToken: () => resolveStaffAccessToken(),
    onUnauthorized: () => {
      clearStaffSession();
    },
  });
}

/** Seeded downtown branch from BranchService.#seedDevData */
export const DEFAULT_BRANCH_ID = '01900000-0000-7000-8000-faaaaaaaaaaa';
