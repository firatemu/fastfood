import { ErrorCodes } from '@fastfood/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';

import type { ServiceAreaDto } from '../branch.service.js';

/**
 * Phase 4 routing engine (document 13 §5).
 *
 * Point-in-polygon matching: given a customer (lat, lng) coordinate
 * and the list of active service areas, return the branch whose
 * service area contains the point. Ties are broken by `priority`
 * (lower wins); higher priority overrides lower priority in case
 * of overlap.
 *
 * Phase 4 uses an in-memory implementation. Production deployment
 * uses PostGIS `ST_Contains(polygon, point)` via the spatial index
 * added by the Phase 0 extension migration. The interface is stable
 * so the migration is a one-line repository swap.
 */

export interface RoutingAssignment {
  branchId: string;
  serviceAreaId: string;
  priority: number;
}

@Injectable()
export class RoutingService {
  /**
   * Assigns a customer coordinate to a branch.
   * Returns null when no service area contains the point.
   */
  assign(
    latitude: number,
    longitude: number,
    serviceAreas: readonly ServiceAreaDto[],
  ): RoutingAssignment | null {
    let winner: RoutingAssignment | null = null;
    for (const sa of serviceAreas) {
      if (!sa.isActive) continue;
      if (!pointInPolygon(latitude, longitude, sa.polygonGeoJson)) continue;
      const candidate: RoutingAssignment = {
        branchId: sa.branchId,
        serviceAreaId: sa.id,
        priority: sa.priority,
      };
      if (!winner || candidate.priority < winner.priority) {
        winner = candidate;
      }
    }
    return winner;
  }

  /** Convenience wrapper that throws when no branch can be assigned. */
  assignOrThrow(
    latitude: number,
    longitude: number,
    serviceAreas: readonly ServiceAreaDto[],
  ): RoutingAssignment {
    const assignment = this.assign(latitude, longitude, serviceAreas);
    if (!assignment) {
      throw new NotFoundException({
        code: ErrorCodes.ADDRESS_NOT_SERVICEABLE,
        message: 'No branch serves this location.',
      });
    }
    return assignment;
  }
}

/**
 * Ray-casting point-in-polygon for GeoJSON Polygon /
 * MultiPolygon. Coordinates are [longitude, latitude].
 */
function pointInPolygon(
  latitude: number,
  longitude: number,
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown },
): boolean {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][];
    return ringContainsPoint(latitude, longitude, rings);
  }
  // MultiPolygon
  const polys = geometry.coordinates as number[][][][];
  for (const rings of polys) {
    if (ringContainsPoint(latitude, longitude, rings)) return true;
  }
  return false;
}

function ringContainsPoint(latitude: number, longitude: number, rings: number[][][]): boolean {
  const ring = rings[0];
  if (!ring) return false;
  // Ray-casting algorithm: cast a horizontal ray from the point
  // and count edge crossings.
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];
    if (ay === undefined || by === undefined || ax === undefined || bx === undefined) continue;
    const intersects =
      ay > latitude !== by > latitude && longitude < ((bx - ax) * (latitude - ay)) / (by - ay) + ax;
    if (intersects) inside = !inside;
  }
  return inside;
}
