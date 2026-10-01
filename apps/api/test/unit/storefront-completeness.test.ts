import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import { PromotionService } from '../../src/modules/promotion/promotion.service.js';
import { StorefrontContentService } from '../../src/modules/storefront-content/storefront-content.service.js';

describe('Storefront Phase 7 completeness domain', () => {
  it('filters catalog products by case-insensitive query', async () => {
    const catalog = new CatalogService();
    const hits = await catalog.listProducts(undefined, false, { q: 'CHEESE' });
    expect(hits.some((p) => p.slug === 'classic-cheeseburger')).toBe(true);
    const none = await catalog.listProducts(undefined, false, { q: 'zzzz-no-such' });
    expect(none).toEqual([]);
  });

  it('returns the builder base product from catalog memory seed', async () => {
    const catalog = new CatalogService();
    const builder = await catalog.getBuilderProduct();
    expect(builder.slug).toBe('ozel-burger');
    expect(builder.modifierGroups.length).toBeGreaterThan(0);
    expect(builder.modifierGroups.every((g) => g.selectionMin <= g.selectionMax)).toBe(true);
  });

  it('lists only storefront-listed, in-window promotions as public deals', async () => {
    const promotions = new PromotionService();
    await promotions.create({
      code: 'SECRETSPIN',
      name: 'Hidden spin coupon',
      kind: 'PERCENT_CART',
      discountPercentBps: 1500,
      listedOnStorefront: false,
    });
    await promotions.create({
      code: 'BURGERLOVER',
      name: 'BURGERLOVER',
      kind: 'PERCENT_CART',
      discountPercentBps: 1000,
      listedOnStorefront: true,
      customerHeadline: '%10 menü indirimi',
      customerDescription: 'Sepette BURGERLOVER kodu.',
    });
    const expired = await promotions.create({
      code: 'OLD',
      name: 'Expired',
      kind: 'FIXED_CART_MINOR',
      discountMinor: 100n,
      listedOnStorefront: true,
      validTo: new Date('2020-01-01T00:00:00.000Z'),
    });
    expect(expired.isActive).toBe(true);

    const deals = await promotions.listPublicDeals(new Date('2026-09-20T00:00:00.000Z'));
    expect(deals.map((d) => d.code)).toEqual(['BURGERLOVER']);
    expect(deals[0]?.headline).toBe('%10 menü indirimi');
    expect(deals[0]?.discountPercentBps).toBe(1000);
    expect(deals[0]?.discountMinor).toBeNull();
    expect(deals[0]?.discountSummary).toBe('%10 sepet indirimi');
    expect(JSON.stringify(deals)).not.toContain('usageLimitTotal');
    expect(JSON.stringify(deals)).not.toContain('SECRETSPIN');
  });

  it('publishes customer content by slug and kind without unpublished rows', async () => {
    const content = new StorefrontContentService();
    content.seedMemory([
      {
        slug: 'kvkk',
        kind: 'LEGAL',
        title: 'KVKK',
        body: 'Aydınlatma metni.',
        isPublished: true,
        displayOrder: 1,
      },
      {
        slug: 'draft',
        kind: 'LEGAL',
        title: 'Draft',
        body: 'Hidden',
        isPublished: false,
        displayOrder: 2,
      },
      {
        slug: 'hikaye',
        kind: 'STORY',
        title: 'Hikaye',
        body: 'Döküm ızgara.',
        isPublished: true,
        displayOrder: 0,
      },
    ]);
    const legal = await content.listPublished('LEGAL');
    expect(legal.map((d) => d.slug)).toEqual(['kvkk']);
    const hikaye = await content.getPublished('hikaye');
    expect(hikaye.title).toBe('Hikaye');
    await expect(content.getPublished('draft')).rejects.toThrow(NotFoundException);
  });
});
