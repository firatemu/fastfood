import { defaultTheme } from '@fastfood/ui-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { hydrateSession } from '../lib/session';

/**
 * Root layout.
 *
 * The session is read from the platform keystore before the navigator mounts.
 * Without this gate the first render would see `getCourierSession() === null`
 * and could bounce a signed-in courier to `/login`, or briefly flash an
 * authenticated screen before the real session is known.
 */
export default function RootLayout() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateSession().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {ready ? (
        <Stack screenOptions={{ headerShown: true, headerShadowVisible: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Giriş' }} />
          <Stack.Screen name="deliveries" options={{ title: 'Teslimatlar' }} />
          <Stack.Screen name="deliveries/[id]" options={{ title: 'Teslimat' }} />
          <Stack.Screen name="claim" options={{ title: 'QR Claim' }} />
          <Stack.Screen name="performance" options={{ title: 'Performans' }} />
          <Stack.Screen name="history" options={{ title: 'Geçmiş' }} />
        </Stack>
      ) : (
        <View style={styles.boot} accessibilityRole="progressbar" accessibilityLabel="Kurye alanı hazırlanıyor">
          <ActivityIndicator color={theme.tokens.actionPrimaryBackground} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

function createStyles(theme: ReturnType<typeof defaultTheme>) {
  return StyleSheet.create({
    boot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tokens.surfaceCanvas,
    },
  });
}