import { createStorefrontClient } from '../api';
import { promotionValidateResponseSchema } from '../schemas';

export type CouponStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'rejected';

const COUPON_KEY = 'ff_coupon_code';

export function getStoredCouponCode(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(COUPON_KEY) ?? '';
}

export function setStoredCouponCode(code: string | null): void {
  if (typeof window === 'undefined') return;
  if (code) window.sessionStorage.setItem(COUPON_KEY, code);
  else window.sessionStorage.removeItem(COUPON_KEY);
}

export async function validateCoupon(code: string) {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/promotions/validate',
    query: { code: code.trim() },
    schema: promotionValidateResponseSchema,
  });
  setStoredCouponCode(res.data.code);
  return res.data;
}

export function clearStoredCouponCode(): void {
  setStoredCouponCode(null);
}
