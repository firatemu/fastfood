import type { z } from 'zod';

import { createStorefrontClient } from '../api';
import {
  allergensResponseSchema,
  branchesResponseSchema,
  productDetailResponseSchema,
  publicDealsResponseSchema,
  storefrontContentListResponseSchema,
  storefrontContentResponseSchema,
  type allergenSchema,
  type branchSchema,
  type productDetailSchema,
  type publicDealSchema,
  type storefrontContentSchema,
} from '../schemas';

export type CustomerBranch = z.infer<typeof branchSchema>;
export type PublicDeal = z.infer<typeof publicDealSchema>;
export type StorefrontContent = z.infer<typeof storefrontContentSchema>;
export type StorefrontAllergen = z.infer<typeof allergenSchema>;
export type BuilderProduct = z.infer<typeof productDetailSchema>;

export async function fetchBuilderProduct(): Promise<BuilderProduct> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/catalog/builder',
    schema: productDetailResponseSchema,
  });
  return res.data;
}

export async function fetchPublicDeals(): Promise<PublicDeal[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/promotions',
    schema: publicDealsResponseSchema,
  });
  return res.data;
}

export async function fetchCustomerBranches(): Promise<CustomerBranch[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/branches',
    schema: branchesResponseSchema,
  });
  return res.data;
}

export async function fetchPublishedContent(kind?: string): Promise<StorefrontContent[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/content',
    query: kind ? { kind } : undefined,
    schema: storefrontContentListResponseSchema,
  });
  return res.data;
}

export async function fetchContentBySlug(slug: string): Promise<StorefrontContent> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `storefront/content/${slug}`,
    schema: storefrontContentResponseSchema,
  });
  return res.data;
}

export async function fetchAllergens(): Promise<StorefrontAllergen[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'storefront/catalog/allergens',
    schema: allergensResponseSchema,
  });
  return res.data;
}
