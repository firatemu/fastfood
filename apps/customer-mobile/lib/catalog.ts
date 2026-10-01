import { getApiClient } from './api';
import { productDetailResponseSchema, type ProductDetail } from './schemas';

export async function fetchProductDetail(idOrSlug: string): Promise<ProductDetail> {
  const res = await getApiClient().request({
    method: 'GET',
    path: `/storefront/catalog/products/${idOrSlug}`,
    schema: productDetailResponseSchema,
  });
  return res.data;
}

export async function fetchBuilderProduct(): Promise<ProductDetail> {
  const res = await getApiClient().request({
    method: 'GET',
    path: '/storefront/catalog/builder',
    schema: productDetailResponseSchema,
  });
  return res.data;
}
