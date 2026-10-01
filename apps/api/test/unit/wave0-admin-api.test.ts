/**
 * Wave 0 — admin settings, promotions, payments list (in-memory mode).
 */
import { describe, expect, it } from 'vitest';

import { IdempotencyService } from '../../src/common/idempotency/idempotency.service.js';
import { SettingsService } from '../../src/modules/admin/settings.service.js';
import { PaymentService } from '../../src/modules/payment/payment.service.js';
import { PromotionService } from '../../src/modules/promotion/promotion.service.js';

describe('Wave 0 admin APIs (services)', () => {
  it('lists default in-memory business settings', async () => {
    const settings = new SettingsService();
    const rows = await settings.list();
    expect(rows.some((r) => r.key === 'loyalty.points_per_try_minor')).toBe(true);
  });

  it('creates and lists promotions', async () => {
    const promotions = new PromotionService();
    const created = await promotions.create({
      code: 'WELCOME10',
      name: 'Welcome 10%',
      kind: 'PERCENT_CART',
      discountPercentBps: 1000,
    });
    const listed = await promotions.list(true);
    expect(listed.some((p) => p.id === created.id)).toBe(true);
    const validated = await promotions.validateCode('welcome10');
    expect(validated?.id).toBe(created.id);
  });

  it('lists payment attempts after initialize', async () => {
    const payments = new PaymentService(new IdempotencyService());
    await payments.initialize({
      checkoutSessionId: '01900000-0000-7000-8000-111111111111',
      amountMinor: 5000n,
      currency: 'TRY',
      idempotencyKey: 'wave0-idem-001',
    });
    const rows = await payments.listPayments();
    expect(rows.length).toBeGreaterThan(0);
  });

  it('applies iyzico provider status to stored attempt', async () => {
    const payments = new PaymentService(new IdempotencyService());
    const init = await payments.initialize({
      checkoutSessionId: '01900000-0000-7000-8000-222222222222',
      amountMinor: 5000n,
      currency: 'TRY',
      idempotencyKey: 'wave0-idem-002',
    });
    const updated = await payments.applyProviderStatus(init.provider.providerPaymentId, 'PAID');
    expect(updated?.status).toBe('PAID');
  });

  it('includes loyalty pointsBalance on admin customer detail', async () => {
    const { AdminCustomerService } = await import(
      '../../src/modules/admin/admin-customer.service.js'
    );
    const { LoyaltyService } = await import('../../src/modules/loyalty/loyalty.service.js');
    const loyalty = new LoyaltyService();
    const userId = '01900000-0000-7000-8000-cccccccccccc';
    await loyalty.setBalance(userId, 150n);
    const customers = AdminCustomerService.createForTest(loyalty, [
      {
        userId,
        phone: null,
        phoneVerified: false,
        email: null,
        emailVerified: false,
        displayName: 'Loyalty Tester',
        status: 'ACTIVE',
        createdAt: null,
      },
    ]);
    const detail = await customers.get(userId);
    expect(detail?.pointsBalance).toBe('150');
    expect(detail?.displayName).toBe('Loyalty Tester');
  });
});
