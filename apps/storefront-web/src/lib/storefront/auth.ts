import { ApiError } from '@fastfood/api-client';

import {
  clearCustomerSession,
  createStorefrontClient,
  getCustomerRefreshToken,
  getGuestSessionId,
  sessionHeaders,
  setCustomerSession,
} from '../api';
import {
  authMethodsResponseSchema,
  authSessionResponseSchema,
  identitiesResponseSchema,
  oauthStartResponseSchema,
  okResponseSchema,
  otpRequestResponseSchema,
} from '../schemas';

import { mergeGuestCart } from './cart';

export function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('0')) return `+9${digits}`;
  if (digits.startsWith('5')) return `+90${digits}`;
  return trimmed;
}

export function looksLikeEmail(raw: string): boolean {
  return raw.includes('@');
}

export function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && !raw.includes('@');
}

async function establishSession(customerId: string, refreshToken: string): Promise<string> {
  const guestSessionId = getGuestSessionId();
  setCustomerSession(customerId, refreshToken);
  try {
    await mergeGuestCart(guestSessionId);
  } catch {
    // Empty guest carts are expected.
  }
  return customerId;
}

export function completeOAuthCallback(customerId: string, refreshToken: string): Promise<string> {
  return establishSession(customerId, refreshToken);
}

export async function fetchAuthMethods(): Promise<{
  otp: boolean;
  password: boolean;
  google: boolean;
  apple: boolean;
}> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'auth/customer/methods',
    schema: authMethodsResponseSchema,
  });
  return res.data;
}

export async function requestCustomerOtp(phoneRaw: string): Promise<{ expiresAt: string }> {
  const phone = normalizePhoneInput(phoneRaw);
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'auth/customer/otp/request',
    body: { phoneNormalized: phone },
    schema: otpRequestResponseSchema,
  });
  return res.data;
}

export async function verifyCustomerOtp(
  phoneRaw: string,
  code: string,
  displayName?: string,
): Promise<string> {
  const phone = normalizePhoneInput(phoneRaw);
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'auth/customer/otp/verify',
    body: { phoneNormalized: phone, code, displayName },
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data.customerId, res.data.refreshToken);
}

/**
 * ADR-010: register by phone + password + KVKK without SMS verification.
 * Available only while `CUSTOMER_REGISTRATION_OTP_SUSPENDED=true`; the
 * server returns `OTP_SUSPENDED` otherwise. Returns the customerId on
 * success and persists the session locally.
 */
export async function registerByPhoneAndPassword(input: {
  phoneRaw: string;
  password: string;
  displayName?: string;
  kvkkAccepted: boolean;
  newsletterOptIn?: boolean;
}): Promise<string> {
  const phone = normalizePhoneInput(input.phoneRaw);
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'auth/customer/register-phone',
    body: {
      phoneNormalized: phone,
      password: input.password,
      displayName: input.displayName,
      kvkkAccepted: input.kvkkAccepted,
      newsletterOptIn: input.newsletterOptIn,
    },
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data.customerId, res.data.refreshToken);
}

export async function loginWithPassword(identifier: string, password: string): Promise<string> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'auth/customer/password/login',
    body: { identifier, password },
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data.customerId, res.data.refreshToken);
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
  kvkkAccepted: boolean;
  newsletterOptIn?: boolean;
}): Promise<string> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'auth/customer/password/register',
    body: input,
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data.customerId, res.data.refreshToken);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'POST',
    path: 'auth/customer/password/forgot',
    body: { email },
    schema: okResponseSchema,
  });
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'POST',
    path: 'auth/customer/password/reset',
    body: { token, password },
    schema: okResponseSchema,
  });
}

export async function requestOAuthStart(
  provider: 'google' | 'apple',
  returnTo: string,
): Promise<string> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `auth/customer/oauth/${provider}/start`,
    query: { returnTo },
    schema: oauthStartResponseSchema,
  });
  return res.data.authorizationUrl;
}

export async function logoutCustomer(): Promise<void> {
  const refreshToken = getCustomerRefreshToken();
  if (refreshToken) {
    try {
      const client = createStorefrontClient();
      await client.request({
        method: 'POST',
        path: 'auth/customer/logout',
        body: { refreshToken },
        schema: okResponseSchema,
      });
    } catch {
      // Local session is cleared regardless of network.
    }
  }
  clearCustomerSession();
}

export async function fetchLinkedIdentities(): Promise<{
  phoneVerified: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  identities: Array<{ provider: string; emailNormalized: string | null }>;
}> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'auth/customer/identities',
    headers: sessionHeaders(),
    schema: identitiesResponseSchema,
  });
  return res.data;
}

export async function changeCustomerPassword(
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'POST',
    path: 'auth/customer/password/change',
    headers: sessionHeaders(),
    body: { currentPassword, nextPassword },
    schema: okResponseSchema,
  });
}

export async function createCustomerPassword(password: string): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'POST',
    path: 'auth/customer/password/create',
    headers: sessionHeaders(),
    body: { password },
    schema: okResponseSchema,
  });
}

export async function requestEmailVerification(): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'POST',
    path: 'auth/customer/email/verify/request',
    headers: sessionHeaders(),
    // The endpoint takes no body, but it rejects a request that carries
    // `content-type: application/json` with an empty body. Sending an empty
    // object keeps the client's content-type honest and the request valid.
    body: {},
    schema: okResponseSchema,
  });
}

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.envelope.error.details as
      | { reason?: string; retryAfterSeconds?: number }
      | undefined;
    const reason = details?.reason;
    if (reason === 'OTP_EXPIRED') return 'Kodun süresi doldu. Yeni kod isteyin.';
    if (reason === 'OTP_ATTEMPTS_EXHAUSTED') return 'Çok fazla deneme. Yeni kod isteyin.';
    if (reason === 'OTP_COOLDOWN') {
      return `Yeni kod için ${details?.retryAfterSeconds ?? 60} sn bekleyin.`;
    }
    if (reason === 'EMAIL_TAKEN') return 'Bu e-posta zaten kayıtlı.';
    if (reason === 'KVKK_REQUIRED') return 'Devam etmek için KVKK onayını işaretleyin.';
    if (reason === 'PASSWORD_POLICY') return 'Şifre en az 10 karakter olmalı.';
    if (err.envelope.error.code === 'RATE_LIMITED') return 'Çok fazla deneme. Lütfen bekleyin.';
    if (err.envelope.error.code === 'AUTH_INVALID_CREDENTIALS')
      return 'Giriş bilgileri doğrulanamadı.';
    return err.envelope.error.message;
  }
  return err instanceof Error ? err.message : 'İşlem tamamlanamadı.';
}
