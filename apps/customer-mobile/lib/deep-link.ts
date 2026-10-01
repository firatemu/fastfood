import { parseTableCode } from './table-code';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOrderId(value: string | null | undefined): value is string {
  return Boolean(value && UUID.test(value));
}

export function isCheckoutSessionId(value: string | null | undefined): value is string {
  return Boolean(value && UUID.test(value));
}

/**
 * Deep-link inputs are untrusted. Never treat `status=PAID` (or any query flag)
 * as proof of payment — only a UUID-shaped checkout id is extracted.
 * Auth callback tokens are extracted for server validation only.
 */
export function parseAuthCallbackUrl(url: string): {
  refreshToken: string | null;
  customerId: string | null;
  next: string | null;
} {
  try {
    const parsed = new URL(url);
    const refreshToken = parsed.searchParams.get('refreshToken');
    const customerId = parsed.searchParams.get('customerId');
    const next = parsed.searchParams.get('next') ?? parsed.searchParams.get('returnTo');
    return {
      refreshToken: refreshToken && refreshToken.length >= 8 ? refreshToken : null,
      customerId: customerId && customerId.length >= 8 ? customerId : null,
      next,
    };
  } catch {
    return { refreshToken: null, customerId: null, next: null };
  }
}

export function parseResetToken(urlOrToken: string): string | null {
  const raw = urlOrToken.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const token = parsed.searchParams.get('token') ?? parsed.searchParams.get('resetToken');
    return token && token.length >= 8 ? token : null;
  } catch {
    return raw.length >= 8 && !raw.includes('://') ? raw : null;
  }
}

export function parsePaymentReturnUrl(url: string): { checkoutId: string | null } {
  try {
    const parsed = new URL(url);
    const fromQuery =
      parsed.searchParams.get('checkoutId') ??
      parsed.searchParams.get('checkoutSessionId') ??
      parsed.searchParams.get('token');
    if (isCheckoutSessionId(fromQuery)) return { checkoutId: fromQuery };

    const parts = parsed.pathname.split('/').filter(Boolean);
    const paymentIdx = parts.findIndex((part) => part === 'payment' || part === 'return');
    if (paymentIdx >= 0) {
      const maybeId = parts[paymentIdx + 1];
      if (isCheckoutSessionId(maybeId) && parts[paymentIdx] === 'payment') {
        return { checkoutId: maybeId };
      }
    }
    const last = parts[parts.length - 1];
    if (isCheckoutSessionId(last)) return { checkoutId: last };
  } catch {
    const loose = url.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    if (loose && isCheckoutSessionId(loose[0])) return { checkoutId: loose[0] };
  }
  return { checkoutId: null };
}

export function parseOrderDeepLink(url: string): { orderId: string | null } {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get('orderId') ?? parsed.searchParams.get('id');
    if (isOrderId(fromQuery)) return { orderId: fromQuery };
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname === 'orders' || parsed.host === 'orders') {
      const maybeId = parts[0];
      if (isOrderId(maybeId)) return { orderId: maybeId };
    }
    const ordersIdx = parts.findIndex((part) => part === 'orders');
    if (ordersIdx >= 0) {
      const maybeId = parts[ordersIdx + 1];
      if (isOrderId(maybeId)) return { orderId: maybeId };
    }
  } catch {
    const loose = url.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    if (loose && isOrderId(loose[0])) return { orderId: loose[0] };
  }
  return { orderId: null };
}

export function parseTableDeepLink(url: string): { code: string | null } {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get('code') ?? parsed.searchParams.get('table');
    if (fromQuery) {
      const code = parseTableCode(fromQuery);
      if (code) return { code };
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname === 'table' || parsed.host === 'table') {
      const code = parseTableCode(parts[0] ?? '');
      if (code) return { code };
    }
    const tableIdx = parts.findIndex((part) => part === 'table');
    if (tableIdx >= 0) {
      const code = parseTableCode(parts[tableIdx + 1] ?? '');
      if (code) return { code };
    }
  } catch {
    const code = parseTableCode(url);
    if (code) return { code };
  }
  return { code: null };
}
