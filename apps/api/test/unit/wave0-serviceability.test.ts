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

describe('generateCirclePolygon and pointInPolygon', () => {
  it('generates a valid closed GeoJSON Polygon approximating a circle', async () => {
    const { generateCirclePolygon, pointInPolygon } = await import(
      '../../src/modules/branch/routing/routing.service.js'
    );
    const centerLat = 41.036;
    const centerLng = 28.985;
    const radiusKm = 10;
    const polygon = generateCirclePolygon(centerLat, centerLng, radiusKm, 64);

    expect(polygon.type).toBe('Polygon');
    expect(polygon.coordinates.length).toBe(1);
    const ring = polygon.coordinates[0]!;
    // 64 points + 1 closing point
    expect(ring.length).toBe(65);
    // Closed ring (first point = last point)
    expect(ring[0]).toEqual(ring[ring.length - 1]);

    // Center point is inside
    expect(pointInPolygon(centerLat, centerLng, polygon)).toBe(true);
    // Point ~5km away is inside (approx 0.045 deg latitude)
    expect(pointInPolygon(centerLat + 0.04, centerLng, polygon)).toBe(true);
    // Point ~25km away is outside (approx 0.22 deg latitude)
    expect(pointInPolygon(centerLat + 0.25, centerLng, polygon)).toBe(false);
  });
});

describe('RoutingService.assignAll', () => {
  it('returns all matching service areas sorted by priority ascending', async () => {
    const branchService = new BranchService();
    const routing = new RoutingService();
    const branchId = (await branchService.listBranches())[0]!.id;

    // Create another service area overlapping Downtown core but with priority 5
    await branchService.createServiceArea(branchId, {
      name: 'Secondary Downtown Overlay',
      polygonGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [28.97, 41.02],
            [29.0, 41.02],
            [29.0, 41.05],
            [28.97, 41.05],
            [28.97, 41.02],
          ],
        ],
      },
      priority: 5,
    });

    const areas = await branchService.listServiceAreas();
    const matches = routing.assignAll(41.036, 28.985, areas);

    expect(matches.length).toBeGreaterThanOrEqual(2);
    // Verified ascending order
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i]!.priority).toBeGreaterThanOrEqual(matches[i - 1]!.priority);
    }
  });

  it('returns empty array when coordinates outside all service areas', async () => {
    const branchService = new BranchService();
    const routing = new RoutingService();
    const areas = await branchService.listServiceAreas();
    const matches = routing.assignAll(40.0, 29.5, areas);
    expect(matches).toEqual([]);
  });
});

describe('BranchService.generateServiceArea', () => {
  it('generates a service area for a branch with default radius', async () => {
    const branchService = new BranchService();
    const branches = await branchService.listBranches();
    const branch = branches[0]!;

    const area = await branchService.generateServiceArea(branch.id, 10);
    expect(area.branchId).toBe(branch.id);
    expect(area.name).toBe(`${branch.name} — 10km`);
    expect(area.priority).toBe(0);
    expect(area.isActive).toBe(true);
    expect(area.polygonGeoJson.type).toBe('Polygon');
  });
});

describe('AdminBranchController generateCircleServiceArea', () => {
  it('generates a circle service area via admin endpoint', async () => {
    const { AdminBranchController } = await import(
      '../../src/modules/admin/admin-branch.controller.js'
    );
    const branchService = new BranchService();
    const catalogService = new CatalogService();
    const controller = new AdminBranchController(branchService, catalogService);
    const branches = await branchService.listBranches();
    const branch = branches[0]!;

    const result = (await controller.generateCircleServiceArea(branch.id, { radiusKm: 15 })) as {
      data?: { name: string; priority: number };
    };
    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe(`${branch.name} — 15km`);
    expect(result.data?.priority).toBe(0);
  });

  it('rejects invalid radius with validation error', async () => {
    const { AdminBranchController } = await import(
      '../../src/modules/admin/admin-branch.controller.js'
    );
    const branchService = new BranchService();
    const catalogService = new CatalogService();
    const controller = new AdminBranchController(branchService, catalogService);
    const branches = await branchService.listBranches();
    const branch = branches[0]!;

    const result = (await controller.generateCircleServiceArea(branch.id, { radiusKm: 999 })) as {
      error?: { code: string };
    };
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found for nonexistent branch', async () => {
    const { AdminBranchController } = await import(
      '../../src/modules/admin/admin-branch.controller.js'
    );
    const branchService = new BranchService();
    const catalogService = new CatalogService();
    const controller = new AdminBranchController(branchService, catalogService);

    const result = (await controller.generateCircleServiceArea('01900000-0000-7000-8000-999999999999', {
      radiusKm: 10,
    })) as {
      error?: { code: string };
    };
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});

describe('BranchController getServiceability', () => {
  it('returns all matching branches deduplicated with branchName and backward compatible fields', async () => {
    const { BranchController } = await import('../../src/modules/branch/branch.controller.js');
    const branchService = new BranchService();
    const routingService = new RoutingService();
    const controller = new BranchController(branchService, routingService);

    const downtown = (await branchService.listBranches())[0]!;

    // Create a 2nd branch overlapping the same point
    const secondBranch = await branchService.createBranch({
      code: 'IST-SUB',
      name: 'Suburban Branch',
      addressLine: 'Suburban Rd 1',
      latitude: 41.036,
      longitude: 28.985,
    });

    // Add service area for 2nd branch
    await branchService.createServiceArea(secondBranch.id, {
      name: 'Suburban Area',
      polygonGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [28.97, 41.02],
            [29.0, 41.02],
            [29.0, 41.05],
            [28.97, 41.05],
            [28.97, 41.02],
          ],
        ],
      },
      priority: 2,
    });

    // Also add another service area for downtown branch with higher priority (lower precedence)
    await branchService.createServiceArea(downtown.id, {
      name: 'Downtown Wide',
      polygonGeoJson: {
        type: 'Polygon',
        coordinates: [
          [
            [28.97, 41.02],
            [29.0, 41.02],
            [29.0, 41.05],
            [28.97, 41.05],
            [28.97, 41.02],
          ],
        ],
      },
      priority: 10,
    });

    const res = (await controller.getServiceability({
      latitude: 41.036,
      longitude: 28.985,
    })) as {
      data: {
        serviceable: boolean;
        branchId: string;
        serviceAreaId: string;
        branches: Array<{
          branchId: string;
          branchName: string;
          serviceAreaId: string;
          priority: number;
        }>;
      };
    };

    expect(res.data.serviceable).toBe(true);
    expect(res.data.branchId).toBe(downtown.id); // priority 1 < priority 2
    expect(res.data.branches.length).toBe(2); // 2 distinct branches (downtown deduplicated)
    expect(res.data.branches[0]!.branchId).toBe(downtown.id);
    expect(res.data.branches[0]!.branchName).toBe(downtown.name);
    expect(res.data.branches[0]!.priority).toBe(1); // kept lowest priority (1 over 10)
    expect(res.data.branches[1]!.branchId).toBe(secondBranch.id);
    expect(res.data.branches[1]!.branchName).toBe(secondBranch.name);
  });

  it('returns serviceable false with empty branches array when outside', async () => {
    const { BranchController } = await import('../../src/modules/branch/branch.controller.js');
    const branchService = new BranchService();
    const routingService = new RoutingService();
    const controller = new BranchController(branchService, routingService);

    const res = (await controller.getServiceability({
      latitude: 40.0,
      longitude: 29.5,
    })) as {
      data: { serviceable: boolean; branchId: string | null; branches: unknown[] };
    };

    expect(res.data.serviceable).toBe(false);
    expect(res.data.branchId).toBeNull();
    expect(res.data.branches).toEqual([]);
  });
});

