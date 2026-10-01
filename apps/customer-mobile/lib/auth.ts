import { getApiClient } from './api';
import { mergeGuestCartAfterAuth } from './auth-merge';
import { mergeGuestCart } from './cart';
import { looksLikeEmail, looksLikePhone, normalizePhoneInput } from './phone';
import { clearPrivateCustomerCache, refreshPublicCartAfterAuthChange } from './private-cache';
import {
  authMethodsResponseSchema,
  authSessionResponseSchema,
  identitiesResponseSchema,
  oauthStartResponseSchema,
  okResponseSchema,
  otpRequestResponseSchema,
} from './schemas';
import {
  persistCustomerSession,
  getCustomerSession,
  getGuestSessionId,
  rotateGuestSessionId,
} from './session';

export { looksLikeEmail, looksLikePhone, normalizePhoneInput };

async function establishSession(payload: {
  customerId: string;
  refreshToken: string;
  refreshExpiresAt: string;
}): Promise<string> {
  const guestSessionId = getGuestSessionId();
  await persistCustomerSession({
    customerId: payload.customerId,
    accessToken: payload.refreshToken,
    refreshToken: payload.refreshToken,
    refreshExpiresAt: payload.refreshExpiresAt,
  });
  await mergeGuestCartAfterAuth({ guestSessionId, merge: mergeGuestCart });
  await refreshPublicCartAfterAuthChange();
  return payload.customerId;
}

export async function fetchAuthMethods(): Promise<{
  otp: boolean;
  password: boolean;
  google: boolean;
  apple: boolean;
}> {
  const res = await getApiClient().request({
    path: '/auth/customer/methods',
    schema: authMethodsResponseSchema,
  });
  return res.data;
}

export async function requestCustomerOtp(phoneRaw: string): Promise<{ expiresAt: string }> {
  const phoneNormalized = normalizePhoneInput(phoneRaw);
  const res = await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/otp/request',
    body: { phoneNormalized },
    schema: otpRequestResponseSchema,
  });
  return res.data;
}

export async function verifyCustomerOtp(
  phoneRaw: string,
  code: string,
  displayName?: string,
): Promise<string> {
  const phoneNormalized = normalizePhoneInput(phoneRaw);
  const res = await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/otp/verify',
    body: { phoneNormalized, code, displayName },
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data);
}

/**
 * ADR-010: register by phone + password + KVKK without SMS verification.
 * Available only while `CUSTOMER_REGISTRATION_OTP_SUSPENDED=true`; the
 * server returns `OTP_SUSPENDED` otherwise. Returns the customerId on
 * success and establishes the local session.
 */
export async function registerByPhoneAndPassword(input: {
  phoneRaw: string;
  password: string;
  displayName?: string;
  kvkkAccepted: boolean;
  newsletterOptIn?: boolean;
}): Promise<string> {
  const phoneNormalized = normalizePhoneInput(input.phoneRaw);
  const res = await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/register-phone',
    body: {
      phoneNormalized,
      password: input.password,
      displayName: input.displayName,
      kvkkAccepted: input.kvkkAccepted,
      newsletterOptIn: input.newsletterOptIn,
    },
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data);
}

export async function loginWithPassword(identifier: string, password: string): Promise<string> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/password/login',
    body: { identifier, password },
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data);
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
  kvkkAccepted: boolean;
  newsletterOptIn?: boolean;
}): Promise<string> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/password/register',
    body: input,
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/password/forgot',
    body: { email },
    schema: okResponseSchema,
  });
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
  await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/password/reset',
    body: { token, password },
    schema: okResponseSchema,
  });
}

export async function requestOAuthStart(
  provider: 'google' | 'apple',
  returnTo: string,
): Promise<string> {
  const res = await getApiClient().request({
    path: `/auth/customer/oauth/${provider}/start`,
    query: { returnTo },
    schema: oauthStartResponseSchema,
  });
  return res.data.authorizationUrl;
}

export async function logoutCustomer(): Promise<void> {
  const refreshToken = getCustomerSession()?.refreshToken;
  if (refreshToken) {
    try {
      await getApiClient().request({
        method: 'POST',
        path: '/auth/customer/logout',
        body: { refreshToken },
        schema: okResponseSchema,
      });
    } catch {
      // Local cleanup always proceeds.
    }
  }
  await persistCustomerSession(null);
  await rotateGuestSessionId();
  clearPrivateCustomerCache();
  await refreshPublicCartAfterAuthChange();
}

export async function fetchLinkedIdentities() {
  const res = await getApiClient().request({
    path: '/auth/customer/identities',
    schema: identitiesResponseSchema,
  });
  return res.data;
}

export async function changeCustomerPassword(
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/password/change',
    body: { currentPassword, nextPassword },
    schema: okResponseSchema,
  });
}

export async function createCustomerPassword(password: string): Promise<void> {
  await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/password/create',
    body: { password },
    schema: okResponseSchema,
  });
}

export async function establishSessionFromUntrustedCallback(input: {
  customerId?: string | null;
  refreshToken?: string | null;
  refreshExpiresAt?: string | null;
}): Promise<'authenticated' | 'rejected'> {
  const refreshToken = input.refreshToken?.trim() ?? '';
  if (refreshToken.length < 8) return 'rejected';
  const res = await getApiClient().request({
    method: 'POST',
    path: '/auth/customer/refresh',
    body: { refreshToken },
    schema: authSessionResponseSchema,
  });
  await establishSession(res.data);
  return 'authenticated';
}
