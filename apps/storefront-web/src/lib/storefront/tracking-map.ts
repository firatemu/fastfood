export type StorefrontMapProviderId = 'osm' | 'none';
export type TrackingMapState = 'ready' | 'provider-unavailable' | 'no-location';

export function formatStorefrontDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function resolveStorefrontMapProvider(
  env: Record<string, string | undefined> = typeof process === 'undefined' ? {} : process.env,
): StorefrontMapProviderId {
  const raw = (env.NEXT_PUBLIC_STOREFRONT_MAP_PROVIDER ?? 'osm').toLowerCase();
  if (raw === 'none' || raw === 'off' || raw === 'unavailable') return 'none';
  return 'osm';
}

export function trackingMapView(input: {
  courier?: { latitude: number; longitude: number } | null;
  destination?: { latitude: number; longitude: number } | null;
  env?: Record<string, string | undefined>;
}): { provider: StorefrontMapProviderId; state: TrackingMapState; url: string | null } {
  const provider = resolveStorefrontMapProvider(input.env);
  if (provider === 'none') {
    return { provider, state: 'provider-unavailable', url: null };
  }
  const url = osmEmbedUrl(input);
  if (!url) return { provider, state: 'no-location', url: null };
  return { provider, state: 'ready', url };
}

export function osmEmbedUrl(input: {
  courier?: { latitude: number; longitude: number } | null;
  destination?: { latitude: number; longitude: number } | null;
}): string | null {
  const points = [input.courier, input.destination].filter(
    (point): point is { latitude: number; longitude: number } => Boolean(point),
  );
  if (points.length === 0) return null;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const pad = 0.01;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const marker = input.courier ?? input.destination;
  const markerQs = marker ? `&marker=${marker.latitude}%2C${marker.longitude}` : '';
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik${markerQs}`;
}
