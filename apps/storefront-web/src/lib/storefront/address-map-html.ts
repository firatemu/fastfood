export type AddressMapPoint = { latitude: number; longitude: number };

const INITIAL_MAP_CENTER: AddressMapPoint = { latitude: 41.036, longitude: 28.985 };

/**
 * The map document must live on a dedicated origin. MapLibre creates a blob
 * worker, which browsers reject in an opaque `srcDoc` origin. In development,
 * Next serves the same public assets through map.localhost; deployed setups
 * must configure a dedicated map origin in the same way.
 */
export function addressMapHtml(
  initialPoint: AddressMapPoint | null = null,
  center?: AddressMapPoint | null,
): string | null {
  const configuredOrigin = process.env.NEXT_PUBLIC_STOREFRONT_MAP_FRAME_ORIGIN;
  const mapOrigin =
    configuredOrigin || (process.env.NODE_ENV === 'development' ? 'http://map.localhost:3100' : '');
  if (!mapOrigin) return null;

  let url: URL;
  try {
    url = new URL('/address-map-picker.html', mapOrigin);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const mapCenter = initialPoint ?? center ?? INITIAL_MAP_CENTER;
  url.searchParams.set('lat', String(mapCenter.latitude));
  url.searchParams.set('lng', String(mapCenter.longitude));
  if (initialPoint) url.searchParams.set('selected', '1');
  return url.toString();
}
