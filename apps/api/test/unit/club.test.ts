import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ClubService } from '../../src/modules/loyalty/club.service.js';
import { LoyaltyService } from '../../src/modules/loyalty/loyalty.service.js';
import { NotificationService } from '../../src/modules/notification/notification.service.js';
import { PromotionService } from '../../src/modules/promotion/promotion.service.js';

describe('BURGER HOME CLUB', () => {
  it('keeps spendable balance separate from lifetime earned / tier', async () => {
    const loyalty = new LoyaltyService();
    const club = new ClubService(loyalty, new PromotionService(), new NotificationService());
    const userId = '01900000-0000-7000-c400-000000000001';
    await loyalty.setBalance(userId, 600n);
    await loyalty.reserve({ userId, points: 200n });
    const snapshot = await club.getSnapshot(userId);
    expect(snapshot.points).toBe('400');
    expect(snapshot.lifetimeEarnedPoints).toBe('600');
    expect(snapshot.currentTier.code).toBe('ATES');
    expect(snapshot.nextTier?.code).toBe('MASTER');
    expect(snapshot.pointsToNextTier).toBe('1900');
  });

  it('uses threshold boundaries for Kor / Ateş / Master', async () => {
    const loyalty = new LoyaltyService();
    const club = new ClubService(loyalty);
    expect(club.resolveTier(0n).code).toBe('KOR');
    expect(club.resolveTier(499n).code).toBe('KOR');
    expect(club.resolveTier(500n).code).toBe('ATES');
    expect(club.resolveTier(2499n).code).toBe('ATES');
    expect(club.resolveTier(2500n).code).toBe('MASTER');
    expect(club.nextTier(2500n)).toBeNull();
  });

  it('exposes customer-safe activity without operator notes', async () => {
    const loyalty = new LoyaltyService();
    const userId = '01900000-0000-7000-c400-000000000002';
    await loyalty.credit({ userId, points: 100n, reason: 'spin_reward' });
    const rows = await loyalty.listCustomerActivity(userId);
    expect(rows[0]?.reason).toBe('spin_reward');
    expect(rows[0]?.entryType).toBe('EARNED');
    expect(JSON.stringify(rows)).not.toMatch(/fraud|operator/i);
  });

  it('grants welcome once and concurrent attempts share the grant', async () => {
    const loyalty = new LoyaltyService();
    const promotions = new PromotionService();
    const notifications = new NotificationService();
    const club = new ClubService(loyalty, promotions, notifications);
    const userId = '01900000-0000-7000-c400-000000000003';
    const [a, b] = await Promise.all([
      club.grantWelcomeIfEligible(userId),
      club.grantWelcomeIfEligible(userId),
    ]);
    expect(a?.promotionId).toBe(b?.promotionId);
    const snapshot = await club.getSnapshot(userId);
    expect(snapshot.welcome.status).toBe('AVAILABLE');
    expect(snapshot.welcome.promotionCode).toBe('BHCLUBWELCOME');
    const inbox = await notifications.listCustomerInbox(userId);
    expect(inbox.some((n) => n.templateKey === 'loyalty.welcome')).toBe(true);
  });

  it('inspectSnapshot does not grant welcome', async () => {
    const loyalty = new LoyaltyService();
    const promotions = new PromotionService();
    const notifications = new NotificationService();
    const club = new ClubService(loyalty, promotions, notifications);
    const userId = '01900000-0000-7000-c400-000000000099';
    const snapshot = await club.inspectSnapshot(userId);
    expect(snapshot.programName).toBe('BURGER HOME CLUB');
    expect(snapshot.points).toBe('0');
    expect(snapshot.lifetimeEarnedPoints).toBe('0');
    const inbox = await notifications.listCustomerInbox(userId);
    expect(inbox.some((n) => n.templateKey === 'loyalty.welcome')).toBe(false);
  });
});

describe('Phase 6 LoyaltyService credit', () => {
  it('rejects non-positive credit', async () => {
    const loyalty = new LoyaltyService();
    await expect(
      loyalty.credit({ userId: 'u', points: 0n, reason: 'spin_reward' }),
    ).rejects.toThrow(BadRequestException);
  });
});
