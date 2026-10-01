import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { addressMapHtml, type AddressMapPoint } from '../lib/address-map-html';
import { colors, fonts, radius } from '../theme';

type MapState = 'loading' | 'ready' | 'unavailable';

type MapMessage = {
  type?: string;
  latitude?: number;
  longitude?: number;
};

export function AddressLocationPicker(props: {
  initialPoint?: AddressMapPoint | null;
  center?: AddressMapPoint | null;
  onSelect: (point: AddressMapPoint) => void;
}) {
  const [mapState, setMapState] = useState<MapState>('loading');
  const source = addressMapHtml(props.initialPoint, props.center);

  useEffect(() => {
    if (mapState !== 'loading') return;
    const timeout = setTimeout(() => setMapState('unavailable'), 30_000);
    return () => clearTimeout(timeout);
  }, [mapState]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as MapMessage;
      if (message.type === 'map-ready') setMapState('ready');
      if (message.type === 'map-error') setMapState('unavailable');
      if (
        message.type === 'location-selected' &&
        typeof message.latitude === 'number' &&
        Number.isFinite(message.latitude) &&
        message.latitude >= -90 &&
        message.latitude <= 90 &&
        typeof message.longitude === 'number' &&
        Number.isFinite(message.longitude) &&
        message.longitude >= -180 &&
        message.longitude <= 180
      ) {
        props.onSelect({ latitude: message.latitude, longitude: message.longitude });
      }
    } catch {
      setMapState('unavailable');
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.copy}>
        <Text style={styles.title}>Haritadan konum seç</Text>
        <Text style={styles.description}>
          Teslimatın bırakılacağı bina girişini haritaya dokunarak işaretle.
        </Text>
      </View>
      <View style={styles.frame}>
        <WebView
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
      <Text style={styles.attribution}>
        © OpenStreetMap katkıda bulunanlar · © OpenMapTiles · OpenFreeMap
      </Text>
      <Text style={styles.report}>Harita hatası: openstreetmap.org/fixthemap</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  copy: { gap: 4 },
  title: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface },
  description: { fontFamily: fonts.jakarta, fontSize: 12, lineHeight: 18, color: colors.ash },
  frame: {
    height: 300,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  web: { flex: 1, backgroundColor: colors.surfaceLow },
  mapStatus: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  status: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.onSurface,
  },
  error: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
  },
  attribution: { fontFamily: fonts.jakarta, fontSize: 10, color: colors.ash },
  report: { fontFamily: fonts.jakarta, fontSize: 10, color: colors.ash },
});
