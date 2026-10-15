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

  assignAll(
    latitude: number,
    longitude: number,
    serviceAreas: readonly ServiceAreaDto[],
  ): RoutingAssignment[] {
    const matches: RoutingAssignment[] = [];
    for (const sa of serviceAreas) {
      if (!sa.isActive) continue;
      if (!pointInPolygon(latitude, longitude, sa.polygonGeoJson)) continue;
      matches.push({
        branchId: sa.branchId,
        serviceAreaId: sa.id,
        priority: sa.priority,
      });
    }
    // Sort by priority ascending (lower wins)
    matches.sort((a, b) => a.priority - b.priority);
    return matches;
  }
}

/**
 * Ray-casting point-in-polygon for GeoJSON Polygon /
 * MultiPolygon. Coordinates are [longitude, latitude].
 */
export function pointInPolygon(
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

const EARTH_RADIUS_KM = 6371;

/**
 * Generates a GeoJSON Polygon approximating a circle around (centerLat, centerLng).
 * Coordinates in the resulting ring are [longitude, latitude] GeoJSON order.
 * The ring is closed (first point equals last point).
 */
export function generateCirclePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  numPoints: number = 64,
): { type: 'Polygon'; coordinates: [number, number][][] } {
  const d = radiusKm / EARTH_RADIUS_KM;
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;
  const ring: [number, number][] = [];

  for (let i = 0; i < numPoints; i++) {
    const bearing = (2 * Math.PI * i) / numPoints;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinD = Math.sin(d);
    const cosD = Math.cos(d);
    const sinBearing = Math.sin(bearing);
    const cosBearing = Math.cos(bearing);

    const ptLatRad = Math.asin(sinLat * cosD + cosLat * sinD * cosBearing);
    const ptLngRad =
      lngRad +
      Math.atan2(sinBearing * sinD * cosLat, cosD - sinLat * Math.sin(ptLatRad));

    const ptLat = (ptLatRad * 180) / Math.PI;
    let ptLng = (ptLngRad * 180) / Math.PI;
    ptLng = ((ptLng + 540) % 360) - 180;

    ring.push([ptLng, ptLat]);
  }

  const firstPoint = ring[0];
  if (firstPoint) {
    ring.push([firstPoint[0], firstPoint[1]]);
  }

  return {
    type: 'Polygon' as const,
    coordinates: [ring],
  };
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

