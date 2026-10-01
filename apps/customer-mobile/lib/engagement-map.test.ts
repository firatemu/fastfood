import { describe, expect, it } from 'vitest';

import {
  clampSupportBody,
  clubProgressPercent,
  dedupeSupportMessages,
  favoriteAvailability,
  reorderHeadline,
  reorderOpensCart,
  spinReasonCopy,
  spinResultCopy,
  welcomeRewardCopy,
} from './engagement-map';
import type { ReorderResult, SpinPlay, SupportMessage } from './schemas';

const reorderPartial: ReorderResult = {
  status: 'partial',
  cartId: 'cart-1',
  restoredCount: 1,
  reviewCount: 1,
  unavailableCount: 0,
  items: [],
};

describe('reorder result mapping', () => {
  it('does not treat unavailable as a cart restore', () => {
    expect(reorderHeadline('unavailable')).toBe('Tekrar sipariş yapılamadı');
    expect(
      reorderOpensCart({
        ...reorderPartial,
        status: 'unavailable',
        restoredCount: 0,
      }),
    ).toBe(false);
    expect(reorderOpensCart(reorderPartial)).toBe(true);
  });
});

describe('favorite state mapping', () => {
  it('distinguishes missing, inactive, and unavailable products', () => {
    expect(favoriteAvailability(null)).toBe('missing');
    expect(
      favoriteAvailability({
        id: 'p1',
        slug: 'x',
        name: 'X',
        currency: 'TRY',
        basePriceMinor: '100',
        isActive: false,
        isAvailable: true,
        imageUrl: null,
      }),
    ).toBe('inactive');
    expect(
      favoriteAvailability({
        id: 'p1',
        slug: 'x',
        name: 'X',
        currency: 'TRY',
        basePriceMinor: '100',
        isActive: true,
        isAvailable: false,
        imageUrl: null,
      }),
    ).toBe('unavailable');
  });
});

describe('club presentation', () => {
  it('renders progress from basis points and welcome copy from server status', () => {
    expect(clubProgressPercent(4500)).toBe(45);
    expect(clubProgressPercent(12000)).toBe(100);
    expect(welcomeRewardCopy('AVAILABLE', 'HOSGELDIN')).toContain('HOSGELDIN');
    expect(welcomeRewardCopy('USED', null)).toContain('kullanıldı');
  });
});

describe('spin result mapping', () => {
  it('never invents a prize — copy comes from the server play', () => {
    expect(spinReasonCopy('ALREADY_USED')).toBe('Bugünkü hakkın kullanıldı.');
    const play: SpinPlay = {
      playId: 'play-1',
      campaignId: 'c1',
      periodKey: '2026-09-20',
      prize: {
        code: 'POINTS_10',
        label: '10 puan',
        kind: 'POINTS',
        pointsAwarded: '10',
        couponCode: null,
      },
      replayed: true,
    };
    expect(spinResultCopy(play)).toBe('Önceki sonuç: 10 puan');
  });
});

describe('support message safety', () => {
  it('clamps body length and dedupes by id', () => {
    expect(clampSupportBody(`  ${'a'.repeat(2100)}  `).length).toBe(2000);
    const messages: SupportMessage[] = [
      { id: 'm1', conversationId: 'c', senderType: 'CUSTOMER', body: 'a', createdAt: 't' },
      { id: 'm1', conversationId: 'c', senderType: 'CUSTOMER', body: 'a', createdAt: 't' },
      { id: 'm2', conversationId: 'c', senderType: 'SYSTEM', body: 'ok', createdAt: 't' },
    ];
    expect(dedupeSupportMessages(messages).map((item) => item.id)).toEqual(['m1', 'm2']);
  });
});
