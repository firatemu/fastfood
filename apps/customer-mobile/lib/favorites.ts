import { getApiClient } from './api';
import {
  favoriteResponseSchema,
  favoritesResponseSchema,
  okResponseSchema,
  type Favorite,
} from './schemas';

export async function fetchFavorites(branchId?: string): Promise<Favorite[]> {
  const res = await getApiClient().request({
    path: '/me/favorites',
    query: branchId ? { branchId } : undefined,
    schema: favoritesResponseSchema,
  });
  return res.data;
}

export async function addFavorite(productId: string): Promise<Favorite> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/me/favorites',
    body: { productId },
    schema: favoriteResponseSchema,
  });
  return res.data;
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  await getApiClient().request({
    method: 'DELETE',
    path: `/me/favorites/${favoriteId}`,
    schema: okResponseSchema,
  });
}
