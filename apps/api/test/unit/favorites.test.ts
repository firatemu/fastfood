import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import { FavoritesService } from '../../src/modules/customer/favorites.service.js';

const CHEESE = '01900000-0000-7000-8000-cccccccccccc';
const USER_A = '01900000-0000-7000-8000-0000000000a1';
const USER_B = '01900000-0000-7000-8000-0000000000a2';

describe('FavoritesService', () => {
  it('creates, lists, and is idempotent per product', async () => {
    const catalog = new CatalogService();
    const svc = new FavoritesService(null, catalog);
    const first = await svc.add(USER_A, CHEESE);
    const second = await svc.add(USER_A, CHEESE);
    expect(second.id).toBe(first.id);
    const listed = await svc.list(USER_A);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.product?.isAvailable).toBe(true);
  });

  it('prevents Customer B from deleting Customer A favorite', async () => {
    const catalog = new CatalogService();
    const svc = new FavoritesService(null, catalog);
    const favorite = await svc.add(USER_A, CHEESE);
    await expect(svc.remove(USER_B, favorite.id)).rejects.toThrow(NotFoundException);
    expect(await svc.list(USER_A)).toHaveLength(1);
  });

  it('marks inactive products unavailable without breaking the list', async () => {
    const catalog = new CatalogService();
    const svc = new FavoritesService(null, catalog);
    await svc.add(USER_A, CHEESE);
    await catalog.updateProduct(CHEESE, { isActive: false });
    const listed = await svc.list(USER_A);
    expect(listed[0]?.product?.isActive).toBe(false);
    expect(listed[0]?.product?.isAvailable).toBe(false);
  });

  it('marks branch-unavailable products without dropping the favorite', async () => {
    const catalog = new CatalogService();
    const svc = new FavoritesService(null, catalog);
    const branchId = '01900000-0000-7000-8000-bbbb00000001';
    await svc.add(USER_A, CHEESE);
    await catalog.setProductAvailability(branchId, CHEESE, false);
    const listed = await svc.list(USER_A, branchId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.product?.isAvailable).toBe(false);
  });
});
