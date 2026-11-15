import { ApiError, ApiNetworkError, ApiTimeoutError } from '@fastfood/api-client';

import {
  clearCustomerSession,
  createStorefrontClient,
  getGuestSessionId,
  refreshCustomerSession,
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

async function establishSession(payload: {
  customerId: string;
  accessToken: string;
  accessExpiresAt: string;
}): Promise<string> {
  const guestSessionId = getGuestSessionId();
  setCustomerSession({
    customerId: payload.customerId,
    accessToken: payload.accessToken,
    accessExpiresAt: payload.accessExpiresAt,
  });
  try {
    await mergeGuestCart(guestSessionId);
  } catch {
    // Empty guest carts are expected.
  }
  return payload.customerId;
}

/**
 * OAuth callback. The API no longer puts the refresh credential in the
 * redirect URL — the browser session already holds it as an HttpOnly cookie,
 * so the callback only has to exchange it for an access token.
 */
export async function completeOAuthCallback(): Promise<string> {
  const guestSessionId = getGuestSessionId();
  const session = await refreshCustomerSession();
  if (!session) {
    throw new Error('Oturum kurulamadı.');
  }
  try {
    await mergeGuestCart(guestSessionId);
  } catch {
    // Empty guest carts are expected.
  }
  return session.customerId;
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
  return establishSession(res.data);
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
  return establishSession(res.data);
}

export async function loginWithPassword(identifier: string, password: string): Promise<string> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'auth/customer/password/login',
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
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'auth/customer/password/register',
    body: input,
    schema: authSessionResponseSchema,
  });
  return establishSession(res.data);
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

/**
 * Logout revokes the server session. The browser has no refresh credential
 * to send — the API reads it from the HttpOnly cookie — so the request only
 * needs the cookie transport.
 */
export async function logoutCustomer(): Promise<void> {
  try {
    const client = createStorefrontClient();
    await client.request({
      method: 'POST',
      path: 'auth/customer/logout',
      body: {},
      credentials: 'include',
      schema: okResponseSchema,
    });
  } catch {
    // Local session is cleared regardless of network.
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

const STOREFRONT_REASON_MESSAGES: Record<string, string> = {
  OTP_EXPIRED: 'Kodun süresi doldu. Yeni kod isteyin.',
  OTP_ATTEMPTS_EXHAUSTED: 'Çok fazla deneme. Yeni kod isteyin.',
  EMAIL_TAKEN: 'Bu e-posta zaten kayıtlı.',
  KVKK_REQUIRED: 'Devam etmek için KVKK onayını işaretleyin.',
  PASSWORD_POLICY: 'Şifre en az 10 karakter olmalı.',
  OAUTH_UNAVAILABLE: 'Bu giriş yöntemi henüz yapılandırılmadı.',
};

const STOREFRONT_CODE_MESSAGES: Record<string, string> = {
  RATE_LIMITED: 'Çok fazla deneme. Lütfen bekleyin.',
  AUTH_INVALID_CREDENTIALS:
    'Telefon numarası/e-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.',
  AUTH_SESSION_EXPIRED: 'Oturum sona erdi. Yeniden giriş yapın.',
  VALIDATION_ERROR: 'Girilen bilgiler doğrulanamadı. Lütfen alanları kontrol edin.',
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.envelope.error.details as
      | { reason?: string; retryAfterSeconds?: number }
      | undefined;
    const reason = details?.reason;
    if (reason === 'OTP_COOLDOWN') {
      return `Yeni kod için ${details?.retryAfterSeconds ?? 60} sn bekleyin.`;
    }
    if (reason && STOREFRONT_REASON_MESSAGES[reason]) {
      return STOREFRONT_REASON_MESSAGES[reason];
    }
    const codeMessage = STOREFRONT_CODE_MESSAGES[err.envelope.error.code];
    if (codeMessage) {
      return codeMessage;
    }
    if (err.status === 401) {
      return 'Oturum süresi doldu veya giriş bilgileri doğrulanamadı.';
    }
    if (err.status >= 500) {
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    }
    return err.envelope.error.message || 'İşlem tamamlanamadı.';
  }
  if (err instanceof ApiTimeoutError) {
    return 'Sunucu yanıt vermedi (zaman aşımı). Lütfen bağlantınızı kontrol edip tekrar deneyin.';
  }
  if (err instanceof ApiNetworkError) {
    return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
  }
  return err instanceof Error && err.message ? err.message : 'İşlem tamamlanamadı.';
}
