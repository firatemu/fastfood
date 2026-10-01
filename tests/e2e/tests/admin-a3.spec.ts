import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const ROUTES = '/home/azem/projects/fastfood/apps/admin-web/src/lib/admin-routes.ts';
const OPS = '/home/azem/projects/fastfood/apps/admin-web/src/lib/fulfillment-ops.ts';
const SHELL = '/home/azem/projects/fastfood/apps/admin-web/src/components/ops/ops-shell.tsx';
const BRANCHES = '/home/azem/projects/fastfood/apps/admin-web/src/app/branches/page.tsx';
const DETAIL = '/home/azem/projects/fastfood/apps/admin-web/src/app/branches/[branchId]/page.tsx';
const AREAS = '/home/azem/projects/fastfood/apps/admin-web/src/app/branches/service-areas/page.tsx';
const AVAIL = '/home/azem/projects/fastfood/apps/admin-web/src/app/branches/availability/page.tsx';
const COURIERS = '/home/azem/projects/fastfood/apps/admin-web/src/app/couriers/page.tsx';
const CONTROLLER =
  '/home/azem/projects/fastfood/apps/api/src/modules/admin/admin-branch.controller.ts';

test.describe('Admin A3 branch/fulfillment contracts', () => {
  test('A3 routes use OpsShell and not A0 scaffold', () => {
    expect(readFileSync(ROUTES, 'utf8')).toContain('isA3Path');
    expect(readFileSync(ROUTES, 'utf8')).toContain("pathname === '/couriers'");
    expect(readFileSync(SHELL, 'utf8')).toContain('Küresel şube listesi');
    expect(readFileSync(BRANCHES, 'utf8')).not.toContain('AdminPage');
    expect(readFileSync(BRANCHES, 'utf8')).not.toContain('ff-admin-banner');
    expect(readFileSync(COURIERS, 'utf8')).not.toContain('AdminPage');
  });

  test('static branch siblings are not swallowed by detail', () => {
    expect(existsSync(AREAS)).toBe(true);
    expect(existsSync(AVAIL)).toBe(true);
    expect(existsSync(DETAIL)).toBe(true);
    expect(readFileSync(ROUTES, 'utf8')).toContain("'service-areas'");
    expect(readFileSync(ROUTES, 'utf8')).toContain("'availability'");
    expect(readFileSync(OPS, 'utf8')).toContain('ROUTE_IDENTIFIED_BRANCH');
  });

  test('availability is distinct from global isActive and uses real GET/PATCH', () => {
    const avail = readFileSync(AVAIL, 'utf8');
    expect(avail).toContain('product-availability');
    expect(avail).toContain('Küresel');
    expect(avail).toContain('Şube müsaitliği');
    expect(avail).not.toContain('bulk');
    expect(readFileSync(CONTROLLER, 'utf8')).toContain("Get('branches/:branchId/product-availability')");
    expect(readFileSync(CONTROLLER, 'utf8')).toContain(
      "Patch('branches/:branchId/product-availability/:productId')",
    );
  });

  test('service areas are GeoJSON only and couriers do not invent a dispatch list', () => {
    const areas = readFileSync(AREAS, 'utf8');
    expect(areas).toContain('polygonGeoJson');
    expect(areas).not.toContain('leaflet');
    expect(areas).not.toContain('mapbox');
    const couriers = readFileSync(COURIERS, 'utf8');
    expect(couriers).toContain('admin/deliveries');
    expect(couriers).toContain('Aktif teslimat listesi API yok');
    expect(couriers).not.toContain('WebSocket');
  });
});
