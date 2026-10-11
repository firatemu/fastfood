import { describe, expect, it } from 'vitest';

import { isA4Path, isOpsShellPath } from './admin-routes';
import {
  a4ResourceScope,
  accountStatusLabel,
  bpsToPercentLabel,
  canSubmitRefund,
  filterCustomers,
  filterPayments,
  paymentStatusLabel,
  paymentStatusTone,
  percentToBps,
  promotionValueSummary,
  remainingRefundableMinor,
} from './finance-ops';

describe('isA4Path', () => {
  it('covers customers/loyalty/promotions/payments/refunds only', () => {
    expect(isA4Path('/customers')).toBe(true);
    expect(isA4Path('/customers/abc')).toBe(true);
    expect(isA4Path('/loyalty')).toBe(true);
    expect(isA4Path('/promotions')).toBe(true);
    expect(isA4Path('/payments/xyz')).toBe(true);
    expect(isA4Path('/refunds')).toBe(true);
    expect(isA4Path('/reports')).toBe(false);
    expect(isA4Path('/users')).toBe(false);
    expect(isA4Path('/branches')).toBe(false);
    expect(isOpsShellPath('/customers')).toBe(true);
    expect(isOpsShellPath('/reports')).toBe(true);
  });
});

describe('a4ResourceScope', () => {
  it('classifies customer vs payment vs global promotions', () => {
    expect(a4ResourceScope('/customers')).toBe('GLOBAL_MASTER_DATA');
    expect(a4ResourceScope('/customers/abc')).toBe('CUSTOMER_SCOPED');
    expect(a4ResourceScope('/loyalty')).toBe('CUSTOMER_SCOPED');
    expect(a4ResourceScope('/promotions')).toBe('GLOBAL_MASTER_DATA');
    expect(a4ResourceScope('/payments')).toBe('PAYMENT_SCOPED');
    expect(a4ResourceScope('/refunds')).toBe('PAYMENT_SCOPED');
    expect(a4ResourceScope('/orders')).toBeNull();
  });
});

describe('customer mapping', () => {
  it('filters client-side without inventing spend/order counts', () => {
    const rows = [
      { userId: 'u1', displayName: 'Ayşe', phone: '+90555', status: 'ACTIVE' },
      { userId: 'u2', displayName: 'Ali', email: 'ali@x.test', status: 'DISABLED' },
    ];
    expect(filterCustomers(rows, { q: 'ayşe', status: '' }).map((r) => r.userId)).toEqual(['u1']);
    expect(filterCustomers(rows, { q: '', status: 'DISABLED' }).map((r) => r.userId)).toEqual([
      'u2',
    ]);
    expect(accountStatusLabel('ACTIVE')).toBe('Aktif');
  });
});

describe('promotion units', () => {
  it('keeps percent and formatted fixed amount distinct', () => {
    expect(percentToBps('10')).toBe(1000);
    expect(percentToBps('101')).toBeNull();
    expect(bpsToPercentLabel(1000)).toBe('10%');
    expect(promotionValueSummary({ kind: 'PERCENT_CART', discountPercentBps: 1500 })).toBe('15%');
    expect(promotionValueSummary({ kind: 'FIXED_CART_MINOR', discountMinor: '2500' })).toBe('25 ₺');
    expect(promotionValueSummary({ kind: 'DELIVERY_FEE_WAIVER' })).toBe('Teslimat ücreti muaf');
  });
});

describe('payment / refund guards', () => {
  it('maps operational payment labels and remaining refundable', () => {
    expect(paymentStatusLabel('PAID')).toBe('Ödendi');
    expect(paymentStatusTone('FAILED')).toBe('critical');
    expect(
      remainingRefundableMinor('5000', [
        { amountMinor: '1000', status: 'SUCCEEDED' },
        { amountMinor: '500', status: 'FAILED' },
      ]),
    ).toBe(4000n);
    expect(
      canSubmitRefund({
        paymentId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        amountMinor: '1000',
        paymentStatus: 'PAID',
        remainingMinor: 4000n,
      }),
    ).toBe(true);
    expect(
      canSubmitRefund({
        paymentId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        amountMinor: '5000',
        paymentStatus: 'PAID',
        remainingMinor: 4000n,
      }),
    ).toBe(false);
    expect(
      canSubmitRefund({
        paymentId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        amountMinor: '1000',
        paymentStatus: 'PENDING',
        remainingMinor: 4000n,
      }),
    ).toBe(false);
  });

  it('does not invent payment search beyond id/checkout/provider', () => {
    const rows = [
      { id: 'p1', status: 'PAID', checkoutSessionId: 'c-aaa' },
      { id: 'p2', status: 'FAILED', providerPaymentId: 'prov-9' },
    ];
    expect(filterPayments(rows, { q: 'prov-9', status: '' }).map((r) => r.id)).toEqual(['p2']);
  });
});
