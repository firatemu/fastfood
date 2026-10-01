import type { ReactElement } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { trackingMapFallbackCopy, type TrackingMapState } from '../lib/tracking-map';
import { colors, fonts, radius } from '../theme';

export function TrackingMapEmbed(props: {
  url: string | null;
  state: TrackingMapState;
  courierAssigned: boolean;
  locationFreshness?: 'current' | 'stale' | 'unavailable' | null;
}): ReactElement {
  const [failed, setFailed] = useState(false);
  const fallback = (
    <View style={styles.frame} accessibilityLabel="Harita kullanılamıyor">
      <Text style={styles.fallback}>
        {trackingMapFallbackCopy({
          state: failed ? 'provider-unavailable' : props.state,
          courierAssigned: props.courierAssigned,
          locationFreshness: props.locationFreshness,
        })}
      </Text>
    </View>
  );
  if (!props.url || failed) return fallback;
  return (
    <View style={styles.frame} accessibilityLabel="Sipariş haritası">
      <WebView
        source={{ uri: props.url }}
        style={styles.web}
        originWhitelist={['https://*']}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    minHeight: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  web: { width: '100%', height: 220, backgroundColor: colors.surfaceLow },
  fallback: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ash,
    textAlign: 'center',
  },
});
