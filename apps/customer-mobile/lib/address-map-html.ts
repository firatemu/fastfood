export type AddressMapPoint = { latitude: number; longitude: number };

const INITIAL_MAP_CENTER: AddressMapPoint = { latitude: 41.036, longitude: 28.985 };

export function addressMapHtml(
  initialPoint: AddressMapPoint | null = null,
  requestedCenter?: AddressMapPoint | null,
): string {
  const center = initialPoint ?? requestedCenter ?? INITIAL_MAP_CENTER;
  const centerJson = JSON.stringify([center.longitude, center.latitude]);
  const initialPointJson = JSON.stringify(initialPoint);

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; background: #1b1b1f; }
    .maplibregl-ctrl-attrib { font: 10px Arial, sans-serif; }
    .maplibregl-ctrl-group button { color: #222; }
  </style>
</head>
<body>
  <div id="map" aria-label="Teslimat konumu haritası"></div>
  <script type="module">
    import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs';

    const initialPoint = ${initialPointJson};
    const post = (message) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
    let readySent = false;
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: ${centerJson},
      zoom: initialPoint ? 16 : 12,
      scrollZoom: false,
      attributionControl: { compact: false },
    });

    let marker = initialPoint
      ? new maplibregl.Marker({ color: '#d97706' })
          .setLngLat([initialPoint.longitude, initialPoint.latitude])
          .addTo(map)
      : null;

    map.once('load', () => {
      readySent = true;
      post({ type: 'map-ready' });
    });
    map.on('error', (event) => {
      if (!readySent && event.error) post({ type: 'map-error' });
    });
    map.on('click', (event) => {
      const point = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
      if (marker) marker.setLngLat([point.longitude, point.latitude]);
      else marker = new maplibregl.Marker({ color: '#d97706' })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);
      post({ type: 'location-selected', ...point });
    });
    setTimeout(() => {
      if (!readySent) post({ type: 'map-error' });
    }, 25_000);
  </script>
</body>
</html>`;
}
