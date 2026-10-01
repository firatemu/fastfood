/**
 * Wave 0 — serviceability routing + operating-hours param binding (services).
 */
import { describe, expect, it } from 'vitest';

import { BranchService } from '../../src/modules/branch/branch.service.js';
import { RoutingService } from '../../src/modules/branch/routing/routing.service.js';
import { CatalogService } from '../../src/modules/catalog/catalog.service.js';

describe('Wave 0 serviceability', () => {
  it('assigns a branch for coordinates inside the dev service area', async () => {
    const branchService = new BranchService();
    const routing = new RoutingService();
    const areas = await branchService.listServiceAreas();
    const assignment = routing.assign(41.036, 28.985, areas);
    expect(assignment).not.toBeNull();
    expect(assignment?.branchId).toBeDefined();
  });

  it('returns null assignment outside all service areas', async () => {
    const branchService = new BranchService();
    const routing = new RoutingService();
    const areas = await branchService.listServiceAreas();
    const assignment = routing.assign(40.0, 29.5, areas);
    expect(assignment).toBeNull();
  });

  it('loads operating hours by branch id', async () => {
    const branchService = new BranchService();
    const branchId = (await branchService.listBranches())[0]!.id;
    const hours = await branchService.getOperatingHours(branchId);
    expect(hours.length).toBe(7);
  });
});

describe('Wave 0 product availability persistence', () => {
  it('persists branch product availability via CatalogService', async () => {
    const catalog = new CatalogService();
    const branchService = new BranchService();
    const branchId = (await branchService.listBranches())[0]!.id;
    const productId = (await catalog.listProducts())[0]!.id;
    await catalog.setProductAvailability(branchId, productId, false, 'sold out');
    const available = await catalog.isProductAvailableAt(branchId, productId);
    expect(available).toBe(false);
  });
});
