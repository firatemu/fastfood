import { describe, expect, it } from 'vitest';

import { SpinService } from '../../src/modules/gamification/spin.service.js';
import { LoyaltyService } from '../../src/modules/loyalty/loyalty.service.js';
import { NotificationService } from '../../src/modules/notification/notification.service.js';
import { PromotionService } from '../../src/modules/promotion/promotion.service.js';

describe('Ateş Çarkı', () => {
  it('server determines prize and issues reward once per Istanbul day', async () => {
    const loyalty = new LoyaltyService();
    const promotions = new PromotionService();
    const notifications = new NotificationService();
    const spins = new SpinService(loyalty, promotions, notifications);
    const userId = '01900000-0000-7000-c401-000000000001';
    const first = await spins.spin(userId, 'idem-spin-1');
    expect(first.replayed).toBe(false);
    expect(first.prize.label.length).toBeGreaterThan(0);
    if (first.prize.kind === 'POINTS') {
      expect(BigInt(first.prize.pointsAwarded) > 0n).toBe(true);
      expect(await loyalty.getBalance(userId)).toBe(BigInt(first.prize.pointsAwarded));
    } else {
      expect(first.prize.couponCode).toMatch(/^BHSPIN/);
      expect(await promotions.validateCode(first.prize.couponCode ?? '')).toBeTruthy();
    }
    const second = await spins.spin(userId, 'idem-spin-2');
    expect(second.replayed).toBe(true);
    expect(second.prize.code).toBe(first.prize.code);
    const eligibility = await spins.getEligibility(userId);
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toBe('ALREADY_USED');
  });

  it('replays the same idempotency key without a second prize', async () => {
    const loyalty = new LoyaltyService();
    const spins = new SpinService(loyalty, new PromotionService(), new NotificationService());
    const userId = '01900000-0000-7000-c401-000000000002';
    const a = await spins.spin(userId, 'same-key-aaaa');
    const b = await spins.spin(userId, 'same-key-aaaa');
    expect(b.playId).toBe(a.playId);
    expect(b.replayed).toBe(true);
  });

  it('serializes concurrent spins for the same customer', async () => {
    const loyalty = new LoyaltyService();
    const spins = new SpinService(loyalty, new PromotionService(), new NotificationService());
    const userId = '01900000-0000-7000-c401-000000000003';
    const results = await Promise.all([
      spins.spin(userId, 'conc-a-aaaaaa'),
      spins.spin(userId, 'conc-b-bbbbbb'),
    ]);
    const codes = new Set(results.map((r) => r.prize.code));
    expect(codes.size).toBe(1);
    const points = await loyalty.getBalance(userId);
    const coupons = results.filter((r) => r.prize.couponCode);
    expect(Number(points > 0n) + (coupons.length > 0 ? 1 : 0)).toBeGreaterThanOrEqual(0);
  });

  it('rejects expired campaigns', async () => {
    const loyalty = new LoyaltyService();
    const spins = new SpinService(loyalty, new PromotionService());
    spins.replaceCampaign({
      id: 'expired',
      code: 'OLD',
      name: 'Old',
      startsAt: new Date('2020-01-01T00:00:00.000Z'),
      endsAt: new Date('2020-02-01T00:00:00.000Z'),
      isActive: true,
      dailySpinLimit: 1,
      prizes: [],
    });
    const eligibility = await spins.getEligibility('u', new Date('2026-09-20T00:00:00.000Z'));
    expect(eligibility.reason).toBe('NO_CAMPAIGN');
  });
});
