import { getApiClient } from './api';
import { homeResponseSchema, type StorefrontHome } from './schemas';

export async function fetchStorefrontHome(input?: {
  categoryId?: string;
  q?: string;
}): Promise<StorefrontHome> {
  const query: Record<string, string> = {};
  if (input?.categoryId) query.categoryId = input.categoryId;
  if (input?.q) query.q = input.q;
  const res = await getApiClient().request({
    method: 'GET',
    path: '/storefront/home',
    query: Object.keys(query).length > 0 ? query : undefined,
    schema: homeResponseSchema,
  });
  return res.data;
}
