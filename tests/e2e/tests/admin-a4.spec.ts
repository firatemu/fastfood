import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const ROUTES = '/home/azem/projects/fastfood/apps/admin-web/src/lib/admin-routes.ts';
const OPS = '/home/azem/projects/fastfood/apps/admin-web/src/lib/finance-ops.ts';
const SHELL = '/home/azem/projects/fastfood/apps/admin-web/src/components/ops/ops-shell.tsx';
const CUSTOMERS = '/home/azem/projects/fastfood/apps/admin-web/src/app/customers/page.tsx';
const LOYALTY = '/home/azem/projects/fastfood/apps/admin-web/src/app/loyalty/page.tsx';
const PROMOS = '/home/azem/projects/fastfood/apps/admin-web/src/app/promotions/page.tsx';
const PAYMENTS = '/home/azem/projects/fastfood/apps/admin-web/src/app/payments/page.tsx';
const REFUNDS = '/home/azem/projects/fastfood/apps/admin-web/src/app/refunds/page.tsx';
const CLUB = '/home/azem/projects/fastfood/apps/api/src/modules/loyalty/club.service.ts';

test.describe('Admin A4 customers/marketing/finance contracts', () => {
  test('A4 routes use OpsShell and not A0 scaffold', () => {
    expect(readFileSync(ROUTES, 'utf8')).toContain('isA4Path');
    expect(readFileSync(SHELL, 'utf8')).toContain('Küresel müşteri');
    expect(readFileSync(CUSTOMERS, 'utf8')).not.toContain('AdminPage');
    expect(readFileSync(PAYMENTS, 'utf8')).not.toContain('ff-admin-banner');
    expect(existsSync(LOYALTY)).toBe(true);
  });

  test('loyalty keeps spendable points distinct from tier and does not grant welcome', () => {
    expect(readFileSync(LOYALTY, 'utf8')).toContain('inspectSnapshot');
    expect(readFileSync(LOYALTY, 'utf8')).toContain('ömür boyu');
    expect(readFileSync(CLUB, 'utf8')).toContain('inspectSnapshot');
    expect(readFileSync(CLUB, 'utf8')).toContain('does not grant welcome');
    expect(readFileSync(OPS, 'utf8')).toContain('CUSTOMER_SCOPED');
  });

  test('promotions keep percent vs kuruş distinct and PATCH only isActive', () => {
    const promo = readFileSync(PROMOS, 'utf8');
    expect(promo).toContain('percentToBps');
    expect(promo).toContain('discountPercentBps');
    expect(promo).toContain('{ isActive }');
    expect(promo).not.toContain('SPIN');
  });

  test('refunds require PAID remaining guard and do not invent a refund list', () => {
    const refunds = readFileSync(REFUNDS, 'utf8');
    expect(refunds).toContain('canSubmitRefund');
    expect(refunds).toContain('Admin iade listesi yok');
    expect(readFileSync(PAYMENTS, 'utf8')).not.toContain('cardNumber');
    expect(readFileSync(PAYMENTS, 'utf8')).toContain('sipariş id DTO');
  });
});
