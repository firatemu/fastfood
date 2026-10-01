import { ApiClient } from '@fastfood/api-client';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const ACCESS_TOKEN_KEY = 'ff_staff_access_token';
const REFRESH_TOKEN_KEY = 'ff_staff_refresh_token';
const USER_ID_KEY = 'ff_staff_user_id';

export function getStaffAccessToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
}

export function getStaffRefreshToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
}

export function getStaffUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(USER_ID_KEY) ?? undefined;
}

export function setStaffSession(input: {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}): void {
  if (input.accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, input.accessToken);
  if (input.refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, input.refreshToken);
  if (input.userId) window.localStorage.setItem(USER_ID_KEY, input.userId);
}

export function clearStaffSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_ID_KEY);
}

export function createAdminClient(): ApiClient {
  return new ApiClient({
    baseUrl: API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`,
    getAccessToken: () => getStaffAccessToken(),
  });
}

/** Seeded downtown branch from BranchService.#seedDevData */
export const DEFAULT_BRANCH_ID = '01900000-0000-7000-8000-faaaaaaaaaaa';
