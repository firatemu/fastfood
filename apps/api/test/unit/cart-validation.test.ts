/**
 * Phase 5 cart-validation unit tests (document 09 §5).
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CartValidationService } from '../../src/modules/cart/cart-validation.service.js';
import { CatalogService } from '../../src/modules/catalog/catalog.service.js';

describe('Phase 5 CartValidationService', () => {
  const validation = new CartValidationService();
  const catalog = new CatalogService();

  it('accepts an active product with positive quantity', async () => {
    const cheeseburgerId = '01900000-0000-7000-8000-cccccccccccc';
    const result = await validation.validate(
      {
        productId: cheeseburgerId,
        quantity: 1,
        unitPriceMinorSnapshot: 12990n,
      },
      catalog,
    );
    expect(result.productId).toBe(cheeseburgerId);
    expect(result.quantity).toBe(1);
    expect(result.currency).toBe('TRY');
  });

  it('rejects quantity <= 0', async () => {
    await expect(
      validation.validate(
        {
          productId: '01900000-0000-7000-8000-cccccccccccc',
          quantity: 0,
          unitPriceMinorSnapshot: 12990n,
        },
        catalog,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unknown product id', async () => {
    await expect(
      validation.validate(
        {
          productId: '01900000-0000-8000-000000000000',
          quantity: 1,
          unitPriceMinorSnapshot: 12990n,
        },
        catalog,
      ),
    ).rejects.toThrow();
  });
});
