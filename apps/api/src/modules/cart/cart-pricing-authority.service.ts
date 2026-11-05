import { ErrorCodes } from '@fastfood/contracts';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { CatalogService } from '../catalog/catalog.service.js';

import type { AddCartLineInput, UpdateCartLineInput } from './cart.service.js';

/**
 * Server-authoritative cart pricing (audit P0-2).
 *
 * The cart is a *suggestion* submitted by the client. Every monetary value
 * that ends up on a cart line — the unit price and each modifier's price
 * delta — must come from the catalog, never from the request body. A client
 * that sends `unitPriceMinorSnapshot: "1"` would otherwise be able to buy a
 * 349,90 TL burger for 0,01 TL.
 *
 * The client-side snapshot fields stay in the contract (document 09 §5 keeps
 * them as a *display* snapshot so the cart can be rendered without a catalog
 * round-trip) but the server now recomputes them from the authoritative
 * catalog rows before persisting.
 */
export interface PricedCartLine {
  productId: string;
  productVariantId: string | undefined;
  quantity: number;
  unitPriceMinor: bigint;
  currency: string;
  modifiers: Array<{ modifierId: string; priceDeltaMinor: bigint }>;
  removals: Array<{ ingredientId: string }>;
}

export interface PricedCartUpdate {
  quantity?: number;
  deliveryNote?: string;
  /**
   * `undefined` means "the client did not send a modifier list" — the line
   * keeps its current modifiers. An empty array means "the client explicitly
   * removed every modifier".
   */
  modifiers: Array<{ modifierId: string; priceDeltaMinor: bigint }> | undefined;
  removals: Array<{ ingredientId: string }> | undefined;
}

@Injectable()
export class CartPricingAuthorityService {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  /**
   * Recompute the authoritative price of a line that is being added.
   *
   * Throws `BadRequestException` when the product, variant, modifier or
   * removal option does not exist in the catalog — an unknown modifier is a
   * client error, not something to silently price at 0.
   */
  async priceAddLine(input: AddCartLineInput): Promise<PricedCartLine> {
    if (input.quantity <= 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Quantity must be positive.',
        details: { field: 'quantity' },
      });
    }
    const product = await this.catalog.getProduct(input.productId);
    if (!product.isActive) {
      throw new BadRequestException({
        code: ErrorCodes.PRODUCT_UNAVAILABLE,
        message: 'Product is not available.',
        details: { productId: input.productId },
      });
    }

    let unitPriceMinor = product.basePriceMinor;
    if (input.productVariantId) {
      const detail = await this.catalog.getStorefrontProductDetail(input.productId);
      const variant = detail.variants.find((v) => v.id === input.productVariantId);
      if (!variant) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Product variant does not exist.',
          details: { productId: input.productId, productVariantId: input.productVariantId },
        });
      }
      unitPriceMinor = variant.priceMinor;
    }

    const modifiers = await this.#priceModifiers(input.productId, input.modifiers);
    const removals = await this.#validateRemovals(input.productId, input.removals);

    return {
      productId: input.productId,
      productVariantId: input.productVariantId,
      quantity: input.quantity,
      unitPriceMinor,
      currency: product.currency,
      modifiers: modifiers ?? [],
      removals: removals ?? [],
    };
  }

  /**
   * Recompute the authoritative price of an existing line being updated.
   *
   * The line's product is read from the catalog rather than the request, so
   * the update path cannot be used to re-point a line at another product.
   */
  async priceUpdateLine(productId: string, input: UpdateCartLineInput): Promise<PricedCartUpdate> {
    const product = await this.catalog.getProduct(productId);
    if (!product.isActive) {
      throw new BadRequestException({
        code: ErrorCodes.PRODUCT_UNAVAILABLE,
        message: 'Product is not available.',
        details: { productId },
      });
    }
    const modifiers = await this.#priceModifiers(productId, input.modifiers);
    const removals = await this.#validateRemovals(productId, input.removals);
    return {
      quantity: input.quantity,
      deliveryNote: input.deliveryNote,
      modifiers,
      removals,
    };
  }

  /**
   * Price a set of modifiers against the catalog.
   *
   * The `priceDeltaMinorSnapshot` supplied by the client is ignored: the
   * catalog row is the only source of truth. When the client sends no
   * modifier list at all (`undefined`), `undefined` is returned so the caller
   * can distinguish "not provided" (keep the line's modifiers) from
   * "explicitly empty" (drop every modifier).
   */
  async #priceModifiers(
    productId: string,
    requested: Array<{ modifierId: string; priceDeltaMinorSnapshot: bigint }> | undefined,
  ): Promise<Array<{ modifierId: string; priceDeltaMinor: bigint }> | undefined> {
    if (requested === undefined) return undefined;
    if (requested.length === 0) return [];

    const detail = await this.catalog.getStorefrontProductDetail(productId);
    const catalogModifiers = new Map(
      detail.modifierGroups.flatMap((group) =>
        group.modifiers.map((m) => [m.id, m.priceDeltaMinor] as const),
      ),
    );

    return requested.map((m) => {
      const priceDeltaMinor = catalogModifiers.get(m.modifierId);
      if (priceDeltaMinor === undefined) {
        throw new BadRequestException({
          code: ErrorCodes.MODIFIER_INVALID_SELECTION,
          message: 'Modifier does not exist for this product.',
          details: { productId, modifierId: m.modifierId },
        });
      }
      return { modifierId: m.modifierId, priceDeltaMinor };
    });
  }

  /**
   * Validate removal options against the catalog. Removals have no price of
   * their own, but an unknown ingredient id must not be accepted silently.
   *
   * `undefined` is returned when the client sent no removal list, so the
   * caller can keep the line's current removals.
   */
  async #validateRemovals(
    productId: string,
    requested: Array<{ ingredientId: string }> | undefined,
  ): Promise<Array<{ ingredientId: string }> | undefined> {
    if (requested === undefined) return undefined;
    if (requested.length === 0) return [];

    const detail = await this.catalog.getStorefrontProductDetail(productId);
    const known = new Set(detail.removalOptions.map((r) => r.id));
    for (const removal of requested) {
      if (!known.has(removal.ingredientId)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Removal option does not exist for this product.',
          details: { productId, ingredientId: removal.ingredientId },
        });
      }
    }
    return requested.map((r) => ({ ingredientId: r.ingredientId }));
  }
}
