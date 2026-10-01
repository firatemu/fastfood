'use client';

import { useEffect, useRef, useState } from 'react';

import { addressMapHtml, type AddressMapPoint } from '../../lib/storefront/address-map-html';

type MapState = 'loading' | 'ready' | 'unavailable';

export function AddressLocationPicker(props: {
  initialPoint?: AddressMapPoint | null;
  center?: AddressMapPoint | null;
  onSelect: (point: AddressMapPoint) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const onSelectRef = useRef(props.onSelect);
  const [mapState, setMapState] = useState<MapState>('loading');
  const mapUrl = addressMapHtml(props.initialPoint ?? null, props.center);
  const mapOrigin = mapUrl ? new URL(mapUrl).origin : null;
  const effectiveMapState: MapState =
    !mapUrl || (typeof window !== 'undefined' && mapOrigin === window.location.origin)
      ? 'unavailable'
      : mapState;

  useEffect(() => {
    onSelectRef.current = props.onSelect;
  }, [props.onSelect]);

  useEffect(() => {
    if (mapState !== 'loading') return;
    if (!mapUrl || !mapOrigin || mapOrigin === window.location.origin) return;
    const timeout = window.setTimeout(() => setMapState('unavailable'), 30_000);
    function receiveMapMessage(event: MessageEvent<unknown>) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.origin !== mapOrigin) return;
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (message?.type === 'map-ready') setMapState('ready');
        if (message?.type === 'map-error') setMapState('unavailable');
        if (
          message?.type === 'location-selected' &&
          Number.isFinite(message.latitude) &&
          message.latitude >= -90 &&
          message.latitude <= 90 &&
          Number.isFinite(message.longitude) &&
          message.longitude >= -180 &&
          message.longitude <= 180
        ) {
          onSelectRef.current({ latitude: message.latitude, longitude: message.longitude });
        }
      } catch {
        setMapState('unavailable');
      }
    }
    window.addEventListener('message', receiveMapMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', receiveMapMessage);
    };
  }, [mapState, mapOrigin, mapUrl]);

  return (
    <section className="flex flex-col gap-2" aria-label="Adres harita konumu">
      <div>
        <h3 className="font-label-lg text-on-surface">Haritadan konum seç</h3>
        <p className="font-body-sm text-on-surface-variant">
          Teslimatın bırakılacağı bina girişini haritaya dokunarak işaretle.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low">
        <iframe
          ref={frameRef}
          title="Teslimat adresi konum seçimi"
          src={mapUrl ?? 'about:blank'}
          sandbox="allow-scripts allow-same-origin"
          className="block h-[320px] w-full border-0"
        />
        {effectiveMapState === 'loading' ? (
          <p className="pointer-events-none absolute left-3 top-3 rounded-md bg-surface-container px-3 py-2 font-label-sm text-on-surface shadow">
            Harita yükleniyor…
          </p>
        ) : null}
        {effectiveMapState === 'unavailable' ? (
          <p
            className="absolute inset-x-3 top-3 rounded-md bg-surface-container px-3 py-2 font-body-sm text-error shadow"
            role="status"
          >
            Harita yüklenemedi. İnternet bağlantısını kontrol edip yeniden deneyin.
          </p>
        ) : null}
      </div>
      <p className="font-body-xs text-on-surface-variant" aria-live="polite">
        {effectiveMapState === 'ready'
          ? '© OpenStreetMap katkıda bulunanlar · © OpenMapTiles · OpenFreeMap'
          : 'Konum seçmek için haritaya dokunun.'}
      </p>
      <a
        href="https://www.openstreetmap.org/fixthemap"
        target="_blank"
        rel="noreferrer"
        className="self-start font-label-sm text-secondary underline"
      >
        Harita hatasını bildir
      </a>
    </section>
  );
}
