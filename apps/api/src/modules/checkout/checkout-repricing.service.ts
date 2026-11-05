import { ErrorCodes } from '@fastfood/contracts';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { CartDto } from '../cart/cart.service.js';
import { CatalogService } from '../catalog/catalog.service.js';

export interface RepricedCartModifier {
  modifierId: string;
  name: string;
  priceDeltaMinor: bigint;
}

export interface RepricedCartRemoval {
  ingredientId: string;
  name: string;
}

export interface RepricedCartLine {
  lineId: string;
  productId: string;
  productName: string;
  productVariantId: string | null;
  productVariantName: string | null;
  quantity: number;
  unitPriceMinor: bigint;
  currency: string;
  modifiers: RepricedCartModifier[];
  removals: RepricedCartRemoval[];
  modifierTotalMinor: bigint;
  /** True when the catalog price differs from the price stored on the cart line. */
  priceChanged: boolean;
}

export interface RepricedCart {
  lines: RepricedCartLine[];
  currency: string;
  /** True when at least one line's price changed since it was added to the cart. */
  priceChanged: boolean;
}

/**
 * Checkout-side re-pricing (audit P0-2, step 3).
 *
 * The cart stores a *price snapshot* from the moment the line was added. A
 * price change between "add to cart" and "checkout" would otherwise be
 * silently charged at the stale price, and a client that managed to persist a
 * bogus snapshot would keep it. This service re-reads the catalog at checkout
 * time and produces the authoritative line prices that the pricing engine,
 * the quote and the persisted order items must use.
 *
 * The catalog is the only source of truth:
 *   - the base unit price comes from the product (or the selected variant),
 *   - each modifier's price delta comes from the modifier row,
 *   - an unknown modifier or removal option fails the quote instead of being
 *     priced at zero.
 */
@Injectable()
export class CheckoutRepricingService {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  /**
   * Re-read the catalog for every line of the cart and return the
   * authoritative prices.
   *
   * Throws `BadRequestException` when a line references a product, variant,
   * modifier or removal option that no longer exists in the catalog.
   */
  async repriceCart(cart: CartDto): Promise<RepricedCart> {
    const lines: RepricedCartLine[] = [];
    let priceChanged = false;
    let currency = 'TRY';

    // One catalog read per distinct product — the detail payload carries the
    // base price, the currency and every variant / modifier / removal row.
    const detailByProduct = new Map<
      string,
      Awaited<ReturnType<CatalogService['getStorefrontProductDetail']>>
    >();
    for (const li of cart.lineItems) {
      if (detailByProduct.has(li.productId)) continue;
      const detail = await this.catalog.getStorefrontProductDetail(li.productId).catch(() => null);
      if (!detail || !detail.isActive) {
        throw new BadRequestException({
          code: ErrorCodes.PRODUCT_UNAVAILABLE,
          message: 'Sepetinizdeki bir ürün artık satışta değil.',
          details: { productId: li.productId },
        });
      }
      detailByProduct.set(li.productId, detail);
    }

    for (const li of cart.lineItems) {
      const detail = detailByProduct.get(li.productId);
      if (!detail) continue;

      let unitPriceMinor = detail.basePriceMinor;
      let productVariantName: string | null = null;
      if (li.productVariantId) {
        const variant = detail.variants.find((v) => v.id === li.productVariantId);
        if (!variant) {
          throw new BadRequestException({
            code: ErrorCodes.VARIANT_UNAVAILABLE,
            message: 'Sepetinizdeki bir varyant artık satışta değil.',
            details: { productId: li.productId, productVariantId: li.productVariantId },
          });
        }
        unitPriceMinor = variant.priceMinor;
        productVariantName = variant.name;
      }

      const catalogModifiers = new Map(
        detail.modifierGroups.flatMap((group) =>
          group.modifiers.map((modifier) => [modifier.id, modifier] as const),
        ),
      );
      const modifiers: RepricedCartModifier[] = li.modifiers.map((requested) => {
        const catalogModifier = catalogModifiers.get(requested.modifierId);
        if (!catalogModifier) {
          throw new BadRequestException({
            code: ErrorCodes.MODIFIER_INVALID_SELECTION,
            message: 'Sepetinizdeki bir seçenek artık geçerli değil.',
            details: { productId: li.productId, modifierId: requested.modifierId },
          });
        }
        return {
          modifierId: catalogModifier.id,
          name: catalogModifier.name,
          priceDeltaMinor: catalogModifier.priceDeltaMinor,
        };
      });
      const modifierTotalMinor = modifiers.reduce((acc, m) => acc + m.priceDeltaMinor, 0n);

      const catalogRemovals = new Map(detail.removalOptions.map((r) => [r.id, r.name] as const));
      const removals: RepricedCartRemoval[] = li.removals.map((requested) => {
        const name = catalogRemovals.get(requested.ingredientId);
        if (name === undefined) {
          throw new BadRequestException({
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Sepetinizdeki bir malzeme çıkarma isteği artık geçerli değil.',
            details: { productId: li.productId, ingredientId: requested.ingredientId },
          });
        }
        return { ingredientId: requested.ingredientId, name };
      });

      const lineChanged =
        unitPriceMinor !== li.unitPriceMinorSnapshot ||
        modifiers.some(
          (m, index) => m.priceDeltaMinor !== li.modifiers[index]?.priceDeltaMinorSnapshot,
        );
      if (lineChanged) priceChanged = true;

      currency = detail.currency;
      lines.push({
        lineId: li.id,
        productId: li.productId,
        productName: detail.name,
        productVariantId: li.productVariantId,
        productVariantName,
        quantity: li.quantity,
        unitPriceMinor,
        currency: detail.currency,
        modifiers,
        removals,
        modifierTotalMinor,
        priceChanged: lineChanged,
      });
    }

    return { lines, currency, priceChanged };
  }
}
