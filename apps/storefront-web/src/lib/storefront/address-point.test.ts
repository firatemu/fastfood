import { describe, expect, it } from 'vitest';

import { PROVINCE_POINT_TOLERANCE_KM, distanceKm, isPointOutsideProvince } from './address-point';

const istanbul = { latitude: 41.036, longitude: 28.985 };
const ankara = { latitude: 39.933, longitude: 32.859 };

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(istanbul, istanbul)).toBe(0);
  });

  it('measures a known short hop', () => {
    const nearby = { latitude: 41.0455, longitude: 29.03 };
    expect(distanceKm(istanbul, nearby)).toBeGreaterThan(3);
    expect(distanceKm(istanbul, nearby)).toBeLessThan(8);
  });

  it('measures a known inter-city hop', () => {
    const km = distanceKm(istanbul, ankara);
    expect(km).toBeGreaterThan(340);
    expect(km).toBeLessThan(400);
  });
});

describe('isPointOutsideProvince', () => {
  it('accepts a pin inside the province', () => {
    expect(isPointOutsideProvince({ latitude: 41.0455, longitude: 29.03 }, istanbul)).toBe(false);
  });

  it('rejects a pin that clearly belongs to another province', () => {
    expect(isPointOutsideProvince(istanbul, ankara)).toBe(true);
    expect(distanceKm(istanbul, ankara)).toBeGreaterThan(PROVINCE_POINT_TOLERANCE_KM);
  });

  it('keeps large provinces usable well past the tolerance', () => {
    const edge = { latitude: 41.036 + 2, longitude: 28.985 };
    expect(distanceKm(edge, istanbul)).toBeLessThan(PROVINCE_POINT_TOLERANCE_KM);
  });
});
