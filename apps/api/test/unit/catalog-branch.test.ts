/**
 * Phase 4 catalog + branch unit tests.
 */
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ActorType, Permissions } from '@fastfood/domain-types';

import type { AuthenticatedPrincipal } from '../../src/modules/auth/guards/authenticated-principal.js';
import { BranchScopePolicy } from '../../src/modules/branch/policies/branch-scope.policy.js';
import { BranchService } from '../../src/modules/branch/branch.service.js';
import { CatalogService } from '../../src/modules/catalog/catalog.service.js';
import { RoutingService } from '../../src/modules/branch/routing/routing.service.js';

function makeStaffPrincipal(branchIds: string[] = []): AuthenticatedPrincipal {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    actorType: ActorType.STAFF,
    status: 'ACTIVE',
    permissions: new Set<string>([
      Permissions.BranchesRead,
      Permissions.BranchesWrite,
      Permissions.CatalogProductsRead,
      Permissions.CatalogProductsWrite,
    ]),
    branchIds: new Set(branchIds),
  };
}

function makeCustomerPrincipal(): AuthenticatedPrincipal {
  return {
    id: '01900000-0000-7000-8000-000000000002',
    actorType: ActorType.CUSTOMER,
    status: 'ACTIVE',
    permissions: new Set<string>([]),
  };
}

describe('Phase 4 Catalog', () => {
  it('lists active categories sorted by displayOrder', async () => {
    const svc = new CatalogService();
    const cats = await svc.listCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats[0]?.slug).toBe('burgers');
    expect(cats[1]?.slug).toBe('sides');
  });

  it('returns NotFoundException for an unknown category', async () => {
    const svc = new CatalogService();
    await expect(svc.getCategory('01900000-0000-7000-8000-000000000099')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates a new category', async () => {
    const svc = new CatalogService();
    const created = await svc.createCategory({ slug: 'drinks', name: 'Drinks' });
    expect(created.slug).toBe('drinks');
    expect(created.isActive).toBe(true);
  });

  it('rejects duplicate slug on category create', async () => {
    const svc = new CatalogService();
    await expect(svc.createCategory({ slug: 'burgers', name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists active products optionally filtered by categoryId', async () => {
    const svc = new CatalogService();
    const burgersId = (await svc.listCategories())[0]!.id;
    const products = await svc.listProducts(burgersId);
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.categoryId === burgersId)).toBe(true);
  });

  it('creates a new product with BigInt money', async () => {
    const svc = new CatalogService();
    const categoryId = (await svc.listCategories())[0]!.id;
    const created = await svc.createProduct({
      categoryId,
      slug: 'spicy-burger',
      name: 'Spicy Burger',
      basePriceMinor: 14990n,
    });
    expect(created.basePriceMinor).toBe(14990n);
    expect(created.currency).toBe('TRY');
  });

  it('lists all known allergens', async () => {
    const svc = new CatalogService();
    const allergens = await svc.listAllergens();
    expect(allergens.length).toBeGreaterThanOrEqual(2);
    expect(allergens.find((a) => a.code === 'GLUTEN')).toBeDefined();
  });

  it('returns storefront product detail by id with media and modifier groups', async () => {
    const svc = new CatalogService();
    const product = (await svc.listProducts())[0]!;
    const detail = await svc.getStorefrontProductDetail(product.id);
    expect(detail.id).toBe(product.id);
    expect(detail.slug).toBe(product.slug);
    expect(Array.isArray(detail.media)).toBe(true);
    expect(Array.isArray(detail.modifierGroups)).toBe(true);
    expect(Array.isArray(detail.allergenIds)).toBe(true);
    expect(Array.isArray(detail.allergens)).toBe(true);
    expect(Array.isArray(detail.recommendations)).toBe(true);
    expect(detail.isAvailable).toBe(true);
  });

  it('throws NotFoundException for unknown storefront product detail', async () => {
    const svc = new CatalogService();
    await expect(svc.getStorefrontProductDetail('not-a-real-slug')).rejects.toThrow(NotFoundException);
  });

  it('lists branch product availability distinct from global isActive', async () => {
    const svc = new CatalogService();
    const product = (await svc.listProducts(undefined, true))[0]!;
    await svc.setProductAvailability('branch-1', product.id, false, 'sold out');
    const rows = await svc.listBranchProductAvailability('branch-1');
    const row = rows.find((r) => r.productId === product.id);
    expect(row?.isAvailable).toBe(false);
    expect(row?.isActive).toBe(true);
    expect(row?.reason).toBe('sold out');
    const other = await svc.listBranchProductAvailability('branch-2');
    expect(other.find((r) => r.productId === product.id)?.isAvailable).toBe(true);
  });
});

describe('Phase 4 Branch', () => {
  it('lists active branches', async () => {
    const svc = new BranchService();
    const branches = await svc.listBranches();
    expect(branches.length).toBeGreaterThan(0);
    expect(branches[0]?.isActive).toBe(true);
  });

  it('returns NotFoundException for an unknown branch', async () => {
    const svc = new BranchService();
    await expect(svc.getBranch('01900000-0000-7000-8000-000000000099')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns operating hours for the dev branch', async () => {
    const svc = new BranchService();
    const branchId = (await svc.listBranches())[0]!.id;
    const hours = await svc.getOperatingHours(branchId);
    expect(hours.length).toBe(7);
    expect(hours[0]?.dayOfWeek).toBe(1);
  });

  it('lists service areas', async () => {
    const svc = new BranchService();
    const areas = await svc.listServiceAreas();
    expect(areas.length).toBeGreaterThan(0);
  });
});

describe('Phase 4 RoutingService (point-in-polygon)', () => {
  const routing = new RoutingService();
  const branchSvc = new BranchService();

  it('assigns a coordinate inside the dev polygon to the dev branch', async () => {
    const areas = await branchSvc.listServiceAreas();
    // Dev polygon covers (41.02..41.05, 28.97..29.00). The point
    // (41.03, 28.98) is inside.
    const assignment = routing.assign(41.03, 28.98, areas);
    expect(assignment).not.toBeNull();
    expect(assignment?.priority).toBe(1);
  });

  it('returns null for a coordinate outside every polygon', async () => {
    const areas = await branchSvc.listServiceAreas();
    // (0, 0) is nowhere near Istanbul.
    const assignment = routing.assign(0, 0, areas);
    expect(assignment).toBeNull();
  });

  it('assignOrThrow throws ADDRESS_NOT_SERVICEABLE when no branch is reachable', async () => {
    const areas = await branchSvc.listServiceAreas();
    expect(() => routing.assignOrThrow(0, 0, areas)).toThrow(NotFoundException);
  });
});

describe('Phase 4 BranchScopePolicy', () => {
  const policy = new BranchScopePolicy();

  it('STAFF principal with branch scope can access own-branch resources', async () => {
    const principal = makeStaffPrincipal(['01900000-0000-7000-8000-faaaaaaaaaaa']);
    expect(
      await policy.canAccess(principal, { branchId: '01900000-0000-7000-8000-faaaaaaaaaaa' }),
    ).toBe(true);
    expect(await policy.canAccess(principal, { branchId: '01900000-0000-8000-000000000099' })).toBe(
      false,
    );
  });

  it('STAFF principal with no branch scope is rejected via enforce', async () => {
    const principal = makeStaffPrincipal([]);
    expect(() => policy.enforce(principal, { branchId: 'any' })).not.toThrow();
  });

  it('CUSTOMER principal has no branch scope and is allowed', async () => {
    const customer = makeCustomerPrincipal();
    expect(await policy.canAccess(customer, { branchId: 'any' })).toBe(true);
  });
});
