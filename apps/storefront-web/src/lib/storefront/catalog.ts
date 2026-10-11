import type { z } from 'zod';

import { createStorefrontClient } from '../api';
import { vitrineProducts } from '../catalog-present';
import {
  categoriesResponseSchema,
  type categorySchema,
  productDetailResponseSchema,
  productsResponseSchema,
  type productDetailSchema,
  type productSchema,
} from '../schemas';

export type StorefrontProduct = z.infer<typeof productSchema>;
export type StorefrontProductDetail = z.infer<typeof productDetailSchema>;
export type StorefrontCategory = z.infer<typeof categorySchema>;

export async function fetchStorefrontCategories(): Promise<StorefrontCategory[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/catalog/categories',
    schema: categoriesResponseSchema,
  });
  return res.data;
}

export async function fetchProductDetail(idOrSlug: string): Promise<StorefrontProductDetail> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `storefront/catalog/products/${idOrSlug}`,
    schema: productDetailResponseSchema,
  });
  return res.data;
}

let cached: StorefrontProduct[] | null = null;

export async function fetchVitrineProducts(): Promise<StorefrontProduct[]> {
  if (cached) return cached;
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/catalog/products',
    schema: productsResponseSchema,
  });
  cached = vitrineProducts(res.data);
  return cached;
}

export async function productIdByVitrineIndex(index: number): Promise<string | null> {
  const products = await fetchVitrineProducts();
  const product = products[index];
  return product?.id ?? null;
}

export function clearCatalogCache(): void {
  cached = null;
}
