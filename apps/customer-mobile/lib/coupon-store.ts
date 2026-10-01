/** Session-RAM coupon code. Not a secret; SecureStore is reserved for M4 credentials. */

let stored: string | null = null;

export function getStoredCouponCode(): string {
  return stored ?? '';
}

export function setStoredCouponCode(code: string | null): void {
  stored = code && code.trim().length > 0 ? code.trim() : null;
}

export function clearStoredCouponCode(): void {
  stored = null;
}
