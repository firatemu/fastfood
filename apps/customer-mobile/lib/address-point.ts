export type GeoPoint = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

/**
 * A saved address must keep its pin inside the province the customer picked.
 * Province centers are administrative centroids, not borders, so the guard uses
 * a deliberately generous radius: it only rejects pins that clearly belong to a
 * different province. The server stays the authority.
 */
export const PROVINCE_POINT_TOLERANCE_KM = 250;

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isPointOutsideProvince(point: GeoPoint, provinceCenter: GeoPoint): boolean {
  return distanceKm(point, provinceCenter) > PROVINCE_POINT_TOLERANCE_KM;
}
