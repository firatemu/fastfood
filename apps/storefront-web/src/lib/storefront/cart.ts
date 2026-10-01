import type { z } from 'zod';

import { createStorefrontClient, sessionHeaders } from '../api';
import { notifyCartChanged } from '../cart-events';
import { selectedModifiersPayload, type ModifierGroup } from '../modifiers';
import {
  cartQuoteResponseSchema,
  cartResponseSchema,
  productDetailResponseSchema,
  type cartSchema,
} from '../schemas';

import { fetchVitrineProducts } from './catalog';

export type Cart = z.infer<typeof cartSchema>;

export async function fetchCart(): Promise<Cart> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/cart',
    headers: sessionHeaders(),
    schema: cartResponseSchema,
  });
  return res.data;
}

export function cartItemCount(cart: Cart): number {
  return cart.lineItems.reduce((n, line) => n + line.quantity, 0);
}

export async function addProductToCart(productId: string, quantity = 1): Promise<Cart> {
  const client = createStorefrontClient();
  const detail = await client.request({
    path: `storefront/catalog/products/${productId}`,
    schema: productDetailResponseSchema,
  });
  const product = detail.data;
  const res = await client.request({
    method: 'POST',
    path: 'storefront/cart/lines',
    headers: sessionHeaders(),
    body: {
      productId: product.id,
      quantity,
      unitPriceMinorSnapshot: product.basePriceMinor,
      currencySnapshot: product.currency,
    },
    schema: cartResponseSchema,
  });
  notifyCartChanged();
  return res.data;
}

export async function addConfiguredProductToCart(input: {
  productId: string;
  quantity: number;
  unitPriceMinorSnapshot: string;
  currencySnapshot: string;
  productVariantId?: string;
  modifierGroups?: ModifierGroup[];
  selectedByGroup?: Record<string, string[]>;
  removalIngredientIds?: string[];
}): Promise<Cart> {
  const modifiers =
    input.modifierGroups && input.selectedByGroup
      ? selectedModifiersPayload(input.modifierGroups, input.selectedByGroup)
      : [];
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'storefront/cart/lines',
    headers: sessionHeaders(),
    body: {
      productId: input.productId,
      productVariantId: input.productVariantId,
      quantity: input.quantity,
      unitPriceMinorSnapshot: input.unitPriceMinorSnapshot,
      currencySnapshot: input.currencySnapshot,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
      removals:
        input.removalIngredientIds && input.removalIngredientIds.length > 0
          ? input.removalIngredientIds.map((ingredientId) => ({ ingredientId }))
          : undefined,
    },
    schema: cartResponseSchema,
  });
  notifyCartChanged();
  return res.data;
}

export async function updateCartLineQuantity(lineId: string, quantity: number): Promise<Cart> {
  const client = createStorefrontClient();
  const res =
    quantity < 1
      ? await client.request({
          method: 'DELETE',
          path: `storefront/cart/lines/${lineId}`,
          headers: sessionHeaders(),
          schema: cartResponseSchema,
        })
      : await client.request({
          method: 'PATCH',
          path: `storefront/cart/lines/${lineId}`,
          headers: sessionHeaders(),
          body: { quantity },
          schema: cartResponseSchema,
        });
  notifyCartChanged();
  return res.data;
}

export async function fetchCartQuote(): Promise<{
  currency: string;
  subtotalMinor: string;
  lineSubtotals: string[];
}> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'storefront/cart/quote',
    headers: sessionHeaders(),
    schema: cartQuoteResponseSchema,
  });
  return res.data;
}

export async function removeCartLine(lineId: string): Promise<Cart> {
  return updateCartLineQuantity(lineId, 0);
}

export async function clearCart(lines: ReadonlyArray<{ id: string }>): Promise<Cart | null> {
  let cart: Cart | null = null;
  for (const line of lines) {
    cart = await removeCartLine(line.id);
  }
  return cart;
}

export async function mergeGuestCart(guestSessionId: string): Promise<Cart> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'storefront/cart/merge',
    headers: sessionHeaders(),
    body: { guestSessionId },
    schema: cartResponseSchema,
  });
  notifyCartChanged();
  return res.data;
}

/** Add combo offer items as individual catalog lines. */
export async function addComboItemsToCart(
  items: ReadonlyArray<{ productId: string; quantity: number }>,
): Promise<Cart | null> {
  let cart: Cart | null = null;
  for (const item of items) {
    cart = await addProductToCart(item.productId, item.quantity);
  }
  return cart;
}

/** Add first vitrine product when PDP context unknown (home CTA). */
export async function addDefaultVitrineToCart(): Promise<Cart | null> {
  const products = await fetchVitrineProducts();
  const first = products[0];
  if (!first) return null;
  return addProductToCart(first.id, 1);
}
