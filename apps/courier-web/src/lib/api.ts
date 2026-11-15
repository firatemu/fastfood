import { ApiClient, ApiError, ApiNetworkError, ApiTimeoutError } from '@fastfood/api-client';
import {
  courierClaimResponseSchema,
  courierDeliveriesResponseSchema,
  courierDeliveryResponseSchema,
  courierLocationResponseSchema,
  courierMeProfileResponseSchema,
  courierNavigationResponseSchema,
  courierPerformanceResponseSchema,
} from '@fastfood/contracts';
import { z } from 'zod';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const session = { accessToken: undefined as string | undefined };
export const setAccessToken = (value?: string) => {
  session.accessToken = value;
};

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => session.accessToken,
  fetchImpl: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});

export const authResponse = z.object({
  data: z.object({
    userId: z.string(),
    refreshToken: z.string().optional(),
    accessToken: z.string().optional(),
    mfaRequired: z.boolean().optional(),
  }),
  meta: z.unknown().optional(),
});

export const refreshResponse = z.object({
  data: z.object({ userId: z.string(), accessToken: z.string() }),
  meta: z.unknown().optional(),
});

export const deliveriesResponseSchema = courierDeliveriesResponseSchema;
export const deliveryResponseSchema = courierDeliveryResponseSchema;
export const claimResponseSchema = courierClaimResponseSchema;
export const navigationResponseSchema = courierNavigationResponseSchema;
export const performanceResponseSchema = courierPerformanceResponseSchema;
export const meProfileResponseSchema = courierMeProfileResponseSchema;
export const locationResponseSchema = courierLocationResponseSchema;

const COURIER_ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS:
    'Kullanıcı adı/e-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.',
  AUTH_SESSION_EXPIRED: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
  AUTH_UNAUTHENTICATED: 'Devam etmek için giriş yapmalısınız.',
  AUTH_SCOPE_DENIED: 'Bu teslimat sizin hesabınızın kapsamı dışında.',
  AUTH_PERMISSION_DENIED: 'Bu işlem için yetkiniz bulunmuyor.',
  AUTH_ACCOUNT_DISABLED: 'Kurye hesabınız şu anda pasif durumda.',
  VALIDATION_ERROR: 'Lütfen girdiğiniz bilgileri kontrol edin.',
  RATE_LIMITED: 'Çok fazla deneme yapıldı. Lütfen biraz bekleyin.',
  QR_CLAIM_INVALID:
    'QR kodu geçersiz veya süresi dolmuş. Şube görevlisinden yeni QR kodu isteyin.',
  DELIVERY_ALREADY_ASSIGNED: 'Bu teslimat başka bir kuryeye atanmış.',
  DELIVERY_COURIER_LIMIT_REACHED: 'Maksimum aktif teslimat limitinize ulaştınız.',
  ADDRESS_LOCATION_REQUIRED: 'Bu teslimat için harita koordinatları tanımlı değil.',
  ORDER_INVALID_TRANSITION: 'Teslimat mevcut durumundan bu adıma geçirilemez.',
  NOT_FOUND: 'İstenen teslimat veya kurye kaydı bulunamadı.',
};

/** Maps API, timeout, and network failures to clear Turkish messages for courier screens. */
export function courierErrorMessage(err: unknown, fallback = 'İşlem tamamlanamadı.'): string {
  if (err instanceof ApiError) {
    const code = err.envelope.error.code;
    const mapped = COURIER_ERROR_MESSAGES[code];
    if (mapped) return mapped;
    if (err.status === 401) return 'Oturum süresi doldu veya kimlik bilgileri doğrulanamadı.';
    if (err.status === 403) return 'Bu işlem için yetkiniz bulunmuyor.';
    if (err.status >= 500) return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    return err.envelope.error.message || fallback;
  }
  if (err instanceof ApiTimeoutError) {
    return 'Sunucu yanıt vermedi (zaman aşımı). Lütfen bağlantınızı kontrol edip tekrar deneyin.';
  }
  if (err instanceof ApiNetworkError) {
    return 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
  }
  if (err instanceof Error && err.message) {
    return fallback;
  }
  return fallback;
}

const STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: 'Havuzda bekliyor',
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Şubeden alındı',
  ON_THE_WAY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal edildi',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const tryFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
});

/** Formats a BigInt/string minor amount (kurus) as TRY. */
export function formatTryMinor(minor?: string | number | null): string | null {
  if (minor === undefined || minor === null || minor === '') return null;
  const num = typeof minor === 'number' ? minor : Number(minor);
  if (!Number.isFinite(num)) return null;
  return tryFormatter.format(num / 100);
}

/** Computes whole minutes between two timestamps, returning null if incomplete. */
export function formatDurationMinutes(
  start?: string | number | null,
  end?: string | number | null,
): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return Math.max(1, Math.round((e - s) / 60_000));
}

export function formatDateTimeTr(value?: string | number | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeTr(value?: string | number | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
