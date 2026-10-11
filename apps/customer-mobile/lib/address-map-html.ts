export type AddressMapPoint = { latitude: number; longitude: number };

const INITIAL_MAP_CENTER: AddressMapPoint = { latitude: 41.036, longitude: 28.985 };

/**
 * `interactive = false` renders the same read-only preview used by the account
 * screen: the stored point stays selected, but taps no longer move the marker.
 */
export function addressMapHtml(
  initialPoint: AddressMapPoint | null = null,
  requestedCenter?: AddressMapPoint | null,
  interactive = true,
): string {
  const center = initialPoint ?? requestedCenter ?? INITIAL_MAP_CENTER;
  const centerJson = JSON.stringify([center.longitude, center.latitude]);
  const initialPointJson = JSON.stringify(initialPoint);
  const interactiveJson = String(interactive);

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; background: #0d0e11; }
    .maplibregl-ctrl-group button { color: #222; }
  </style>
</head>
<body>
  <div id="map" aria-label="Teslimat konumu haritası"></div>
  <script type="module">
    import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs';

    const initialPoint = ${initialPointJson};
    const interactive = ${interactiveJson};
    const post = (message) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    let readySent = false;
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: ${centerJson},
      zoom: initialPoint ? 16 : 12,
      scrollZoom: false,
      attributionControl: false,
    });

    const setMarker = (point) => {
      if (marker) marker.setLngLat([point.longitude, point.latitude]);
      else marker = new maplibregl.Marker({ color: '#feb300' })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);
    };

    let marker = initialPoint ? new maplibregl.Marker({ color: '#feb300' })
      .setLngLat([initialPoint.longitude, initialPoint.latitude])
      .addTo(map) : null;

    map.once('load', () => {
      readySent = true;
      post({ type: 'map-ready' });
    });
    map.on('error', (event) => {
      if (!readySent && event.error) post({ type: 'map-error' });
    });
    if (interactive) {
      map.on('click', (event) => {
        const point = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
        setMarker(point);
        post({ type: 'location-selected', ...point });
      });
    }
    window.ffFocusLocation = (latitude, longitude) => {
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return;
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return;
      setMarker({ latitude, longitude });
      map.flyTo({ center: [longitude, latitude], zoom: 16 });
    };
    setTimeout(() => {
      if (!readySent) post({ type: 'map-error' });
    }, 25_000);
  </script>
</body>
</html>`;
}
