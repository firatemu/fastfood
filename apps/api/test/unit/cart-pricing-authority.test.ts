/**
 * Server-authoritative cart pricing (audit P0-2).
 *
 * The cart must never be priced from the client-supplied snapshot. These
 * tests pin the behaviour that a client cannot post a price of its own.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CartPricingAuthorityService } from '../../src/modules/cart/cart-pricing-authority.service.js';

const PRODUCT_ID = '01900000-0000-7000-8000-cccccccccccc';
const VARIANT_ID = '01900000-0000-7000-8000-dddddddddddd';
const MODIFIER_ID = '01900000-0000-7000-8000-eeeeeeeeeeee';
const REMOVAL_ID = '01900000-0000-7000-8000-ffffffffffff';

function makeCatalog(overrides: Record<string, unknown> = {}) {
  return {
    getProduct: vi.fn(async (id: string) => {
      if (id !== PRODUCT_ID) throw new Error('not found');
      return {
        id: PRODUCT_ID,
        basePriceMinor: 12990n,
        currency: 'TRY',
        isActive: true,
      };
    }),
    getStorefrontProductDetail: vi.fn(async () => ({
      id: PRODUCT_ID,
      modifierGroups: [
        {
          id: 'group-1',
          name: 'Ekstra',
          selectionMin: 0,
          selectionMax: 3,
          modifiers: [{ id: MODIFIER_ID, name: 'Bacon', priceDeltaMinor: 4500n }],
        },
      ],
      variants: [{ id: VARIANT_ID, sku: 'CB-L', name: 'Large', priceMinor: 15990n }],
      removalOptions: [{ id: REMOVAL_ID, name: 'Soğan' }],
    })),
    ...overrides,
  };
}

describe('CartPricingAuthorityService', () => {
  it('ignores the client unit price snapshot and uses the catalog price', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    const priced = await service.priceAddLine({
      productId: PRODUCT_ID,
      quantity: 2,
      // A malicious client posting 1 kuruş.
      unitPriceMinorSnapshot: 1n,
      currencySnapshot: 'TRY',
    });

    expect(priced.unitPriceMinor).toBe(12990n);
    expect(priced.currency).toBe('TRY');
    expect(priced.quantity).toBe(2);
  });

  it('ignores the client modifier price delta and uses the catalog delta', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    const priced = await service.priceAddLine({
      productId: PRODUCT_ID,
      quantity: 1,
      modifiers: [{ modifierId: MODIFIER_ID, priceDeltaMinorSnapshot: 0n }],
    });

    expect(priced.modifiers).toEqual([{ modifierId: MODIFIER_ID, priceDeltaMinor: 4500n }]);
  });

  it('rejects a modifier that does not exist in the catalog', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    await expect(
      service.priceAddLine({
        productId: PRODUCT_ID,
        quantity: 1,
        modifiers: [
          { modifierId: '01900000-0000-7000-8000-0000000000aa', priceDeltaMinorSnapshot: 0n },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a removal option that does not exist in the catalog', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    await expect(
      service.priceAddLine({
        productId: PRODUCT_ID,
        quantity: 1,
        removals: [{ ingredientId: '01900000-0000-7000-8000-0000000000bb' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses the variant price when a variant is selected', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    const priced = await service.priceAddLine({
      productId: PRODUCT_ID,
      productVariantId: VARIANT_ID,
      quantity: 1,
      unitPriceMinorSnapshot: 1n,
    });

    expect(priced.unitPriceMinor).toBe(15990n);
  });

  it('rejects a variant that does not exist', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    await expect(
      service.priceAddLine({
        productId: PRODUCT_ID,
        productVariantId: '01900000-0000-7000-8000-0000000000cc',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a non-positive quantity', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    await expect(service.priceAddLine({ productId: PRODUCT_ID, quantity: 0 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an inactive product', async () => {
    const catalog = makeCatalog({
      getProduct: vi.fn(async () => ({
        id: PRODUCT_ID,
        basePriceMinor: 12990n,
        currency: 'TRY',
        isActive: false,
      })),
    });
    const service = new CartPricingAuthorityService(catalog as never);

    await expect(service.priceAddLine({ productId: PRODUCT_ID, quantity: 1 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('re-prices modifier deltas on the update path', async () => {
    const catalog = makeCatalog();
    const service = new CartPricingAuthorityService(catalog as never);

    const priced = await service.priceUpdateLine(PRODUCT_ID, {
      quantity: 3,
      modifiers: [{ modifierId: MODIFIER_ID, priceDeltaMinorSnapshot: -100n }],
    });

    expect(priced.quantity).toBe(3);
    expect(priced.modifiers).toEqual([{ modifierId: MODIFIER_ID, priceDeltaMinor: 4500n }]);
  });
});
