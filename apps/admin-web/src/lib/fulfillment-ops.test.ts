import { describe, expect, it } from 'vitest';

import {
  isA1Path,
  isA2Path,
  isA3Path,
  isOpsShellPath,
  isRouteIdentifiedBranchPath,
  routeBranchId,
} from './admin-routes';
import {
  a3ResourceScope,
  canDispatchAssign,
  filterAvailabilityRows,
  isE164Phone,
  isHhMm,
  isValidLatitude,
  isValidLongitude,
  parseCoordinate,
  parsePolygonGeoJson,
  weekdayLabel,
} from './fulfillment-ops';

describe('isA3Path / ops shell', () => {
  it('covers branch and courier routes without swallowing A4+', () => {
    expect(isA3Path('/branches')).toBe(true);
    expect(isA3Path('/branches/abc')).toBe(true);
    expect(isA3Path('/branches/service-areas')).toBe(true);
    expect(isA3Path('/branches/availability')).toBe(true);
    expect(isA3Path('/couriers')).toBe(true);
    expect(isA3Path('/customers')).toBe(false);
    expect(isA1Path('/couriers')).toBe(false);
    expect(isA2Path('/branches')).toBe(false);
    expect(isOpsShellPath('/branches')).toBe(true);
    expect(isOpsShellPath('/couriers')).toBe(true);
    expect(isOpsShellPath('/customers')).toBe(true);
  });

  it('keeps static branch siblings out of route-identified detail', () => {
    expect(isRouteIdentifiedBranchPath('/branches/01900000-0000-7000-8000-faaaaaaaaaaa')).toBe(true);
    expect(isRouteIdentifiedBranchPath('/branches/service-areas')).toBe(false);
    expect(isRouteIdentifiedBranchPath('/branches/availability')).toBe(false);
    expect(routeBranchId('/branches/service-areas')).toBeNull();
    expect(routeBranchId('/branches/xyz')).toBe('xyz');
  });
});

describe('a3ResourceScope', () => {
  it('classifies list, detail, scoped, and mixed courier pages', () => {
    expect(a3ResourceScope('/branches')).toBe('GLOBAL_MASTER_DATA');
    expect(a3ResourceScope('/branches/abc')).toBe('ROUTE_IDENTIFIED_BRANCH');
    expect(a3ResourceScope('/branches/service-areas')).toBe('BRANCH_SCOPED');
    expect(a3ResourceScope('/branches/availability')).toBe('BRANCH_SCOPED');
    expect(a3ResourceScope('/couriers')).toBe('MIXED');
    expect(a3ResourceScope('/orders')).toBeNull();
  });
});

describe('fulfillment mapping guards', () => {
  it('labels weekdays and validates hours / phone / coordinates', () => {
    expect(weekdayLabel(0)).toBe('Pazar');
    expect(weekdayLabel(1)).toBe('Pazartesi');
    expect(isHhMm('09:00')).toBe(true);
    expect(isHhMm('9:00')).toBe(false);
    expect(isE164Phone('+905551112233')).toBe(true);
    expect(isE164Phone('05551112233')).toBe(false);
    expect(parseCoordinate('41,03')).toBe(41.03);
    expect(isValidLatitude(41.03)).toBe(true);
    expect(isValidLongitude(200)).toBe(false);
  });

  it('parses GeoJSON polygons only', () => {
    expect(parsePolygonGeoJson('not json')).toBeNull();
    expect(parsePolygonGeoJson('{"type":"Point","coordinates":[0,0]}')).toBeNull();
    expect(
      parsePolygonGeoJson('{"type":"Polygon","coordinates":[[[28.96,41],[28.98,41],[28.96,41]]]}')
        ?.type,
    ).toBe('Polygon');
  });

  it('requires real UUIDs for dispatch assign', () => {
    expect(
      canDispatchAssign({
        orderId: '01900000-0000-7000-8000-aaaaaaaaaaaa',
        courierId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
        branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
      }),
    ).toBe(true);
    expect(
      canDispatchAssign({
        orderId: 'not-a-uuid',
        courierId: '01900000-0000-7000-8000-bbbbbbbbbbbb',
        branchId: '01900000-0000-7000-8000-faaaaaaaaaaa',
      }),
    ).toBe(false);
  });
});

describe('filterAvailabilityRows', () => {
  const rows = [
    { productId: '1', name: 'Smash', slug: 'smash', isActive: true, isAvailable: true },
    { productId: '2', name: 'Cola', slug: 'cola', isActive: true, isAvailable: false },
    { productId: '3', name: 'Old', slug: 'old', isActive: false, isAvailable: true },
  ];

  it('filters independently of global isActive', () => {
    expect(filterAvailabilityRows(rows, { q: '', filter: 'unavailable' }).map((r) => r.productId)).toEqual([
      '2',
    ]);
    expect(
      filterAvailabilityRows(rows, { q: 'smash', filter: '' }).map((r) => r.productId),
    ).toEqual(['1']);
    expect(
      filterAvailabilityRows(rows, { q: '', filter: 'globally-inactive' }).map((r) => r.productId),
    ).toEqual(['3']);
  });
});
