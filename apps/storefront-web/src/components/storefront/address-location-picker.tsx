'use client';

import { useEffect, useRef, useState } from 'react';

import { addressMapHtml, type AddressMapPoint } from '../../lib/storefront/address-map-html';

type MapState = 'loading' | 'ready' | 'unavailable';

/**
 * The map panel.
 *
 * The map itself is an iframe rendering `addressMapHtml`, which lives outside
 * the account surface and keeps its own light cartography — recolouring that
 * would mean restyling a shared map document, not this surface. Everything
 * around the frame does follow the account design system: a quiet label, a
 * hairline box instead of a large rounded card, and status in the info hue
 * rather than the accent.
 */
export function AddressLocationPicker(props: {
  initialPoint?: AddressMapPoint | null;
  center?: AddressMapPoint | null;
  focusPoint?: AddressMapPoint | null;
  readOnly?: boolean;
  onSelect?: (point: AddressMapPoint) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const onSelectRef = useRef(props.onSelect);
  const [mapState, setMapState] = useState<MapState>('loading');
  const readOnly = props.readOnly === true;
  const mapUrl = addressMapHtml(props.initialPoint ?? null, props.center, !readOnly);
  const mapOrigin = mapUrl ? new URL(mapUrl).origin : null;
  const effectiveMapState: MapState =
    !mapUrl || (typeof window !== 'undefined' && mapOrigin === window.location.origin)
      ? 'unavailable'
      : mapState;

  useEffect(() => {
    onSelectRef.current = props.onSelect;
  }, [props.onSelect]);

  // Device/host coordinates are pushed into the frame so the map can move to a
  // point chosen outside the map (for example a GPS fix) without reloading it.
  useEffect(() => {
    if (!props.focusPoint || !mapUrl || !mapOrigin) return;
    if (mapState !== 'ready') return;
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ type: 'focus-location', ...props.focusPoint }),
      mapOrigin,
    );
  }, [props.focusPoint, mapOrigin, mapUrl, mapState]);

  /*
   * The message listener must stay attached for the component's whole life,
   * NOT only while the map is loading.
   *
   * Gating it on `mapState === 'loading'` looks right and is not: the effect
   * re-runs when `map-ready` arrives, takes the early return, and its cleanup
   * detaches the listener — so from that moment the map could report a
   * selection and nothing would be listening for it. Picking a point silently
   * stopped working and the composer could never be satisfied.
   *
   * Load-state transitions and message delivery are therefore split into two
   * effects: one owns the timeout, this one owns the subscription.
   */
  useEffect(() => {
    if (!mapUrl || !mapOrigin || mapOrigin === window.location.origin) return;
    function receiveMapMessage(event: MessageEvent<unknown>) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.origin !== mapOrigin) return;
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (message?.type === 'map-ready') {
          setMapState('ready');
          return;
        }
        if (message?.type === 'map-error') {
          setMapState('unavailable');
          return;
        }
        if (
          message?.type === 'location-selected' &&
          !readOnly &&
          Number.isFinite(message.latitude) &&
          message.latitude >= -90 &&
          message.latitude <= 90 &&
          Number.isFinite(message.longitude) &&
          message.longitude >= -180 &&
          message.longitude <= 180
        ) {
          onSelectRef.current?.({ latitude: message.latitude, longitude: message.longitude });
        }
      } catch {
        setMapState('unavailable');
      }
    }
    window.addEventListener('message', receiveMapMessage);
    return () => window.removeEventListener('message', receiveMapMessage);
  }, [mapOrigin, mapUrl, readOnly]);

  // The map's own readiness timeout, independent of the subscription.
  useEffect(() => {
    if (mapState !== 'loading') return;
    if (!mapUrl || !mapOrigin || mapOrigin === window.location.origin) return;
    const timeout = window.setTimeout(() => setMapState('unavailable'), 30_000);
    return () => window.clearTimeout(timeout);
  }, [mapState, mapOrigin, mapUrl]);

  const caption = props.focusPoint ?? props.initialPoint;

  return (
    <section className="ff-stack-sm" aria-label="Adres haritası" data-ff-map>
      <div className="ff-cluster" style={{ gap: '0.5rem' }}>
        <span aria-hidden className="h-2 w-2 rounded-full bg-info" />
        <span className="ff-toolbar-eyebrow">
          {readOnly ? 'Konum önizleme' : 'Teslimat noktası'}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-outline-variant">
        <iframe
          ref={frameRef}
          title={readOnly ? 'Kayıtlı adres önizlemesi' : 'Teslimat adresi konum seçimi'}
          src={mapUrl ?? 'about:blank'}
          sandbox="allow-scripts allow-same-origin"
          className="block h-[300px] w-full border-0"
        />
        {effectiveMapState === 'loading' ? (
          <p className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded border border-outline border-outline bg-surface-container/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-info" />
            Harita yükleniyor
          </p>
        ) : null}
        {effectiveMapState === 'unavailable' ? (
          <p
            className="absolute inset-x-3 top-3 rounded border border-danger-border bg-danger-container px-3 py-2 text-[12.5px] leading-[18px] text-on-error-container backdrop-blur"
            role="status"
          >
            Harita yüklenemedi. İnternet bağlantısını kontrol edip yeniden deneyin.
          </p>
        ) : null}
      </div>

      <p className="ff-row-hint" aria-live="polite">
        {caption
          ? 'Teslimat noktanız haritada işaretlendi.'
          : readOnly
            ? 'Bir adres seçtiğinde haritada burada görünür.'
            : 'Haritaya dokunarak teslimat noktanı işaretle.'}
      </p>
    </section>
  );
}