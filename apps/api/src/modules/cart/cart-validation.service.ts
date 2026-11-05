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
 * The unit price and currency returned here are the *catalog* values, never
 * the client's snapshot (audit P0-2). The client-side
 * `unitPriceMinorSnapshot` / `currencySnapshot` fields remain in the request
 * contract as a display snapshot, but the server must not price a cart line
 * from them — a client that posts a price of 1 would otherwise buy a
 * 349,90 TL product for 0,01 TL.
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
      // Authoritative: the catalog price, not the client snapshot.
      unitPriceMinor: product.basePriceMinor,
      currency: product.currency,
    };
  }
}
