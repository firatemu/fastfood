import type { z } from 'zod';

import { createStorefrontClient, sessionHeaders } from '../api';
import {
  favoriteResponseSchema,
  favoritesResponseSchema,
  okResponseSchema,
  type favoriteSchema,
} from '../schemas';

export type Favorite = z.infer<typeof favoriteSchema>;

export async function fetchFavorites(branchId?: string): Promise<Favorite[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'me/favorites',
    headers: sessionHeaders(),
    query: branchId ? { branchId } : undefined,
    schema: favoritesResponseSchema,
  });
  return res.data;
}

export async function addFavorite(productId: string): Promise<Favorite> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'me/favorites',
    headers: sessionHeaders(),
    body: { productId },
    schema: favoriteResponseSchema,
  });
  return res.data;
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'DELETE',
    path: `me/favorites/${favoriteId}`,
    headers: sessionHeaders(),
    schema: okResponseSchema,
  });
}
