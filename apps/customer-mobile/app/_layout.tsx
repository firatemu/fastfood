import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useBurgerHomeFonts } from '../components/use-fonts';
import { getApiClient } from '../lib/api';
import { configureDiningStore, restoreDiningContext } from '../lib/dining-context';
import { durableKv, secureKv } from '../lib/native-kv';
import { authSessionResponseSchema } from '../lib/schemas';
import {
  configureSessionStores,
  getAuthBootstrapState,
  restoreSession,
  setSessionRefresh,
} from '../lib/session';
import { colors } from '../theme';

export default function RootLayout() {
  const fontsReady = useBurgerHomeFonts();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.canvas);
  }, []);

  useEffect(() => {
    configureSessionStores({ secret: secureKv, guest: durableKv });
    configureDiningStore(durableKv);
    void restoreDiningContext();
    setSessionRefresh(async (refreshToken) => {
      const res = await getApiClient().request({
        method: 'POST',
        path: '/auth/customer/refresh',
        body: { refreshToken },
        schema: authSessionResponseSchema,
      });
      return {
        customerId: res.data.customerId,
        accessToken: res.data.refreshToken,
        refreshToken: res.data.refreshToken,
        refreshExpiresAt: res.data.refreshExpiresAt,
      };
    });
    void restoreSession().finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && getAuthBootstrapState() === 'offline') {
        void restoreSession();
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsReady || !sessionReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.mustard} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="payment/[checkoutId]" />
        <Stack.Screen name="payment/return" options={{ animation: 'none' }} />
        <Stack.Screen name="orders/[orderId]/index" />
        <Stack.Screen name="orders/[orderId]/confirmation" />
        <Stack.Screen name="auth" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/reset" />
        <Stack.Screen name="account/addresses" />
        <Stack.Screen name="account/settings" />
        <Stack.Screen name="account/security" />
        <Stack.Screen name="account/favorites" />
        <Stack.Screen name="account/club" />
        <Stack.Screen name="account/spin" />
        <Stack.Screen name="account/notifications" />
        <Stack.Screen name="account/support" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="table/index" />
        <Stack.Screen name="table/scan" />
        <Stack.Screen name="table/[code]" />
        <Stack.Screen name="address" />
        <Stack.Screen name="branches" />
        <Stack.Screen name="deals" />
        <Stack.Screen name="legal/index" />
        <Stack.Screen name="legal/allergens" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
