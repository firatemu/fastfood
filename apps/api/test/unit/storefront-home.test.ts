/**
 * Storefront Golden Home merchandising + newsletter.
 */
import { describe, expect, it } from 'vitest';

import { BranchService } from '../../src/modules/branch/branch.service.js';
import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import { StorefrontHomeService } from '../../src/modules/storefront-home/storefront-home.service.js';

describe('Storefront Home', () => {
  it('composes catalog products into a home payload without Prisma', async () => {
    const catalog = new CatalogService();
    const branches = new BranchService();
    const home = new StorefrontHomeService(null, catalog, branches);
    const payload = await home.getHome({});
    expect(payload.products.length).toBeGreaterThan(0);
    expect(payload.categories.length).toBeGreaterThan(0);
    expect(payload.hero?.slug).toBe('classic-cheeseburger');
    expect(payload.branch?.estimatedDeliveryMinutesMin).toBeGreaterThan(0);
    expect(payload.reviews.length).toBeGreaterThan(0);
  });

  it('filters vitrine products by search query', async () => {
    const catalog = new CatalogService();
    const home = new StorefrontHomeService(null, catalog, new BranchService());
    const payload = await home.getHome({ q: 'cheese' });
    expect(payload.products.every((p) => p.slug.includes('cheese'))).toBe(true);
  });

  it('subscribes newsletter emails idempotently', async () => {
    const home = new StorefrontHomeService();
    const first = await home.subscribeNewsletter('ember@example.com');
    const second = await home.subscribeNewsletter(' Ember@example.com ');
    expect(first.alreadySubscribed).toBe(false);
    expect(second.alreadySubscribed).toBe(true);
    expect(second.email).toBe('ember@example.com');
  });
});
