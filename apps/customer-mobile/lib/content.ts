import { getApiClient } from './api';
import {
  allergensResponseSchema,
  branchesResponseSchema,
  publicDealsResponseSchema,
  storefrontContentListResponseSchema,
  storefrontContentResponseSchema,
  type CatalogAllergen,
  type CustomerBranch,
  type PublicDeal,
  type StorefrontContent,
} from './schemas';

export async function fetchCustomerBranches(): Promise<CustomerBranch[]> {
  const res = await getApiClient().request({
    path: '/storefront/branches',
    schema: branchesResponseSchema,
  });
  return res.data;
}

export async function fetchPublicDeals(): Promise<PublicDeal[]> {
  const res = await getApiClient().request({
    path: '/storefront/promotions',
    schema: publicDealsResponseSchema,
  });
  return res.data;
}

export async function fetchPublishedContent(): Promise<StorefrontContent[]> {
  const res = await getApiClient().request({
    path: '/storefront/content',
    schema: storefrontContentListResponseSchema,
  });
  return res.data;
}

export async function fetchContentBySlug(slug: string): Promise<StorefrontContent> {
  const res = await getApiClient().request({
    path: `/storefront/content/${encodeURIComponent(slug)}`,
    schema: storefrontContentResponseSchema,
  });
  return res.data;
}

export async function fetchCatalogAllergens(): Promise<CatalogAllergen[]> {
  const res = await getApiClient().request({
    path: '/storefront/catalog/allergens',
    schema: allergensResponseSchema,
  });
  return res.data;
}
