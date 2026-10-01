import { getApiClient } from './api';
import { notifyCartChanged } from './cart-events';
import { selectedModifiersPayload, type ModifierGroup } from './modifiers';
import {
  cartQuoteResponseSchema,
  cartResponseSchema,
  productDetailResponseSchema,
  type Cart,
  type VitrineProduct,
} from './schemas';

export async function mergeGuestCart(guestSessionId: string): Promise<Cart> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/storefront/cart/merge',
    body: { guestSessionId },
    schema: cartResponseSchema,
  });
  notifyCartChanged(res.data);
  return res.data;
}

export async function fetchCart(): Promise<Cart> {
  const res = await getApiClient().request({
    method: 'GET',
    path: '/storefront/cart',
    schema: cartResponseSchema,
  });
  notifyCartChanged(res.data);
  return res.data;
}

export async function fetchCartQuote(): Promise<{
  currency: string;
  subtotalMinor: string;
  lineSubtotals: string[];
}> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/storefront/cart/quote',
    schema: cartQuoteResponseSchema,
  });
  return res.data;
}

export async function addProductToCart(input: {
  productId: string;
  quantity?: number;
  unitPriceMinorSnapshot: string;
  currencySnapshot: string;
}): Promise<Cart> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/storefront/cart/lines',
    body: {
      productId: input.productId,
      quantity: input.quantity ?? 1,
      unitPriceMinorSnapshot: input.unitPriceMinorSnapshot,
      currencySnapshot: input.currencySnapshot,
    },
    schema: cartResponseSchema,
  });
  notifyCartChanged(res.data);
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
  const res = await getApiClient().request({
    method: 'POST',
    path: '/storefront/cart/lines',
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
  notifyCartChanged(res.data);
  return res.data;
}

export async function updateCartLineQuantity(lineId: string, quantity: number): Promise<Cart> {
  const res =
    quantity < 1
      ? await getApiClient().request({
          method: 'DELETE',
          path: `/storefront/cart/lines/${lineId}`,
          schema: cartResponseSchema,
        })
      : await getApiClient().request({
          method: 'PATCH',
          path: `/storefront/cart/lines/${lineId}`,
          body: { quantity },
          schema: cartResponseSchema,
        });
  notifyCartChanged(res.data);
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

export async function addComboItemsToCart(
  items: ReadonlyArray<{ productId: string; quantity: number }>,
  catalog: ReadonlyArray<Pick<VitrineProduct, 'id' | 'basePriceMinor' | 'currency'>>,
): Promise<Cart | null> {
  let cart: Cart | null = null;
  for (const item of items) {
    const fromCatalog = catalog.find((product) => product.id === item.productId);
    if (fromCatalog) {
      cart = await addProductToCart({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceMinorSnapshot: fromCatalog.basePriceMinor,
        currencySnapshot: fromCatalog.currency,
      });
      continue;
    }
    const detail = await getApiClient().request({
      method: 'GET',
      path: `/storefront/catalog/products/${item.productId}`,
      schema: productDetailResponseSchema,
    });
    cart = await addProductToCart({
      productId: item.productId,
      quantity: item.quantity,
      unitPriceMinorSnapshot: detail.data.basePriceMinor,
      currencySnapshot: detail.data.currency,
    });
  }
  return cart;
}
