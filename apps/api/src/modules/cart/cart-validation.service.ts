import { ErrorCodes } from '@fastfood/contracts';
import { BadRequestException, Injectable } from '@nestjs/common';

import type { CatalogService } from '../catalog/catalog.service.js';

import type { AddCartLineInput } from './cart.service.js';

/**
 * Cart validation service (document 09 §5).
 *
 * Centralized validation for add-to-cart operations:
 *   - product is active,
 *   - quantity is positive.
 *
 * Phase 5 ships product-level validation. Variant + modifier
 * selection min/max enforcement land under P5-006 once the catalog
 * controller surface exposes them; Phase 5's contract here is
 * intentionally minimal so it can run before the catalog endpoints
 * are wired.
 */
export interface CartValidationResult {
  productId: string;
  productVariantId: string | undefined;
  quantity: number;
  unitPriceMinor: bigint;
  currency: string;
}

@Injectable()
export class CartValidationService {
  async validate(
    input: AddCartLineInput,
    catalog: Pick<CatalogService, 'getProduct'>,
  ): Promise<CartValidationResult> {
    if (input.quantity <= 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Quantity must be positive.',
        details: { field: 'quantity' },
      });
    }
    const product = await catalog.getProduct(input.productId);
    if (!product.isActive) {
      throw new BadRequestException({
        code: ErrorCodes.PRODUCT_UNAVAILABLE,
        message: 'Product is not available.',
        details: { productId: input.productId },
      });
    }
    return {
      productId: input.productId,
      productVariantId: input.productVariantId,
      quantity: input.quantity,
      unitPriceMinor: input.unitPriceMinorSnapshot ?? product.basePriceMinor,
      currency: input.currencySnapshot ?? product.currency,
    };
  }
}
