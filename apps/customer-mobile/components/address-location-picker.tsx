import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { addressMapHtml, type AddressMapPoint } from '../lib/address-map-html';
import { colors, fonts, radius, space } from '../theme';

type MapState = 'loading' | 'ready' | 'unavailable';

type MapMessage = {
  type?: string;
  latitude?: number;
  longitude?: number;
};

export function AddressLocationPicker(props: {
  initialPoint?: AddressMapPoint | null;
  center?: AddressMapPoint | null;
  focusPoint?: AddressMapPoint | null;
  readOnly?: boolean;
  onSelect?: (point: AddressMapPoint) => void;
}) {
  const webRef = useRef<WebView>(null);
  const [mapState, setMapState] = useState<MapState>('loading');
  const readOnly = props.readOnly === true;
  const source = addressMapHtml(props.initialPoint, props.center, !readOnly);
  const caption = props.focusPoint ?? props.initialPoint;

  useEffect(() => {
    if (mapState !== 'loading') return;
    const timeout = setTimeout(() => setMapState('unavailable'), 30_000);
    return () => clearTimeout(timeout);
  }, [mapState]);

  // Device coordinates are injected into the frame so the map can move to a
  // point chosen outside the map (for example a GPS fix) without reloading it.
  useEffect(() => {
    if (!props.focusPoint || mapState !== 'ready') return;
    const { latitude, longitude } = props.focusPoint;
    webRef.current?.injectJavaScript(
      `window.ffFocusLocation && window.ffFocusLocation(${latitude}, ${longitude});true;`,
    );
  }, [props.focusPoint, mapState]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as MapMessage;
      if (message.type === 'map-ready') setMapState('ready');
      if (message.type === 'map-error') setMapState('unavailable');
      if (
        message.type === 'location-selected' &&
        !readOnly &&
        typeof message.latitude === 'number' &&
        Number.isFinite(message.latitude) &&
        message.latitude >= -90 &&
        message.latitude <= 90 &&
        typeof message.longitude === 'number' &&
        Number.isFinite(message.longitude) &&
        message.longitude >= -180 &&
        message.longitude <= 180
      ) {
        props.onSelect?.({ latitude: message.latitude, longitude: message.longitude });
      }
    } catch {
      setMapState('unavailable');
    }
  }

  return (
    <View style={styles.section} data-ff-map>
      <View style={styles.headerTitle}>
        <View style={styles.pip} />
        <Text style={styles.title}>{readOnly ? 'Konum önizleme' : 'Teslimat noktası'}</Text>
      </View>

      <View style={styles.frame}>
        <WebView
          ref={webRef}
          source={{ html: source, baseUrl: 'https://map.localhost/' }}
          style={styles.web}
          originWhitelist={['https://*']}
          userAgent="BURGERHOME-CustomerMobile/1.0"
          javaScriptEnabled
          domStorageEnabled={false}
          setSupportMultipleWindows={false}
          thirdPartyCookiesEnabled={false}
          sharedCookiesEnabled={false}
          onMessage={onMessage}
          onError={() => setMapState('unavailable')}
        />
        {mapState !== 'ready' ? (
          <View pointerEvents="none" style={styles.mapStatus}>
            <Text style={mapState === 'unavailable' ? styles.error : styles.status}>
              {mapState === 'loading'
                ? 'Harita yükleniyor…'
                : 'Harita yüklenemedi. İnternet bağlantısını kontrol edip yeniden deneyin.'}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.caption} accessibilityLiveRegion="polite">
        {caption
          ? 'Teslimat noktanız haritada işaretlendi.'
          : readOnly
            ? 'Bir adres seçtiğinde haritada burada görünür.'
            : 'Haritaya dokunarak teslimat noktanı işaretle.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mustard,
  },
  title: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.onSurface },
  frame: {
    height: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  web: { flex: 1, backgroundColor: colors.surfaceLowest },
  mapStatus: { position: 'absolute', top: 10, left: 10, right: 10, alignItems: 'center' },
  status: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.onSurface,
  },
  error: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
  },
  caption: { fontFamily: fonts.jakarta, fontSize: 12, lineHeight: 18, color: colors.ash },
});
