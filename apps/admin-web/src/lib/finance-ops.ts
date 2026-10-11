import { formatTryMinor } from '@fastfood/contracts';

import type { StatusTone } from './order-status';

export type A4ResourceScope = 'GLOBAL_MASTER_DATA' | 'CUSTOMER_SCOPED' | 'PAYMENT_SCOPED' | 'MIXED';

export function a4ResourceScope(pathname: string): A4ResourceScope | null {
  if (pathname === '/customers' || pathname === '/loyalty' || pathname === '/promotions') {
    return pathname === '/loyalty' ? 'CUSTOMER_SCOPED' : 'GLOBAL_MASTER_DATA';
  }
  if (pathname.startsWith('/customers/')) return 'CUSTOMER_SCOPED';
  if (pathname.startsWith('/promotions/')) return 'GLOBAL_MASTER_DATA';
  if (pathname === '/payments' || pathname.startsWith('/payments/')) return 'PAYMENT_SCOPED';
  if (pathname === '/refunds') return 'PAYMENT_SCOPED';
  return null;
}

export type CustomerRow = {
  userId: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string;
};

export function filterCustomers<T extends CustomerRow>(
  rows: readonly T[],
  opts: { q: string; status: string },
): T[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.status && row.status !== opts.status) return false;
    if (!q) return true;
    return (
      row.userId.toLowerCase().includes(q) ||
      (row.displayName ?? '').toLowerCase().includes(q) ||
      (row.phone ?? '').toLowerCase().includes(q) ||
      (row.email ?? '').toLowerCase().includes(q)
    );
  });
}

export function accountStatusLabel(status: string | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    ACTIVE: 'Aktif',
    DISABLED: 'Devre dışı',
    PENDING_VERIFICATION: 'Doğrulama bekliyor',
    SUSPENDED: 'Askıda',
  };
  return map[status] ?? status;
}

export function accountStatusTone(status: string | undefined): StatusTone {
  if (status === 'ACTIVE') return 'ready';
  if (status === 'DISABLED' || status === 'SUSPENDED') return 'critical';
  if (status === 'PENDING_VERIFICATION') return 'warn';
  return 'idle';
}

export function paymentStatusLabel(status: string | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    PENDING: 'Bekliyor',
    PAID: 'Ödendi',
    FAILED: 'Başarısız',
    CANCELLED: 'İptal',
  };
  return map[status] ?? status;
}

export function paymentStatusTone(status: string | undefined): StatusTone {
  if (status === 'PAID') return 'ready';
  if (status === 'FAILED') return 'critical';
  if (status === 'PENDING') return 'warn';
  return 'idle';
}

export function isPaymentPaid(status: string | undefined): boolean {
  return status === 'PAID';
}

export function refundStatusLabel(status: string | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    PENDING: 'Bekliyor',
    SUCCEEDED: 'Tamam',
    FAILED: 'Başarısız',
  };
  return map[status] ?? status;
}

export function refundStatusTone(status: string | undefined): StatusTone {
  if (status === 'SUCCEEDED') return 'ready';
  if (status === 'FAILED') return 'critical';
  return 'warn';
}

export function remainingRefundableMinor(
  paymentAmountMinor: string | undefined,
  refunds: readonly { amountMinor?: string; status?: string }[],
): bigint {
  let paid = 0n;
  try {
    paid = BigInt(paymentAmountMinor || '0');
  } catch {
    paid = 0n;
  }
  const used = refunds
    .filter((row) => row.status !== 'FAILED')
    .reduce((sum, row) => {
      try {
        return sum + BigInt(row.amountMinor || '0');
      } catch {
        return sum;
      }
    }, 0n);
  const left = paid - used;
  return left > 0n ? left : 0n;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFinanceUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function canSubmitRefund(input: {
  paymentId: string;
  amountMinor: string;
  paymentStatus?: string;
  remainingMinor: bigint;
}): boolean {
  if (!isFinanceUuid(input.paymentId)) return false;
  if (input.paymentStatus !== undefined && input.paymentStatus !== 'PAID') return false;
  if (!/^\d+$/.test(input.amountMinor.trim()) || input.amountMinor.trim() === '0') return false;
  try {
    const amount = BigInt(input.amountMinor.trim());
    return amount > 0n && amount <= input.remainingMinor;
  } catch {
    return false;
  }
}

export const PROMOTION_KINDS = [
  { value: 'FIXED_CART_MINOR', label: 'Sabit sepet' },
  { value: 'PERCENT_CART', label: 'Yüzde sepet' },
  { value: 'DELIVERY_FEE_WAIVER', label: 'Teslimat ücreti muaf' },
] as const;

export type PromotionKind = (typeof PROMOTION_KINDS)[number]['value'];

export function promotionKindLabel(kind: string | undefined): string {
  const found = PROMOTION_KINDS.find((k) => k.value === kind);
  return found?.label ?? kind ?? '—';
}

/** 10 → 1000 bps. Rejects values outside 0–100. */
export function percentToBps(raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

export function bpsToPercentLabel(bps: number | null | undefined): string {
  if (bps == null) return '—';
  return `${(bps / 100).toLocaleString('tr-TR')}%`;
}

export function promotionValueSummary(row: {
  kind?: string;
  discountMinor?: string | null;
  discountPercentBps?: number | null;
}): string {
  if (row.kind === 'DELIVERY_FEE_WAIVER') return 'Teslimat ücreti muaf';
  if (row.kind === 'PERCENT_CART') return bpsToPercentLabel(row.discountPercentBps ?? undefined);
  if (row.kind === 'FIXED_CART_MINOR' && row.discountMinor)
    return formatTryMinor(row.discountMinor);
  return '—';
}

export function filterPromotions<
  T extends { isActive?: boolean; kind?: string; code?: string | null; name?: string },
>(rows: readonly T[], opts: { q: string; active: '' | 'active' | 'inactive'; kind: string }): T[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.kind && row.kind !== opts.kind) return false;
    if (opts.active === 'active' && row.isActive === false) return false;
    if (opts.active === 'inactive' && row.isActive !== false) return false;
    if (!q) return true;
    return (row.name ?? '').toLowerCase().includes(q) || (row.code ?? '').toLowerCase().includes(q);
  });
}

export function filterPayments<
  T extends { id: string; status?: string; checkoutSessionId?: string; providerPaymentId?: string },
>(rows: readonly T[], opts: { q: string; status: string }): T[] {
  const q = opts.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.status && row.status !== opts.status) return false;
    if (!q) return true;
    return (
      row.id.toLowerCase().includes(q) ||
      (row.checkoutSessionId ?? '').toLowerCase().includes(q) ||
      (row.providerPaymentId ?? '').toLowerCase().includes(q)
    );
  });
}
