import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: true, headerShadowVisible: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Giriş' }} />
        <Stack.Screen name="deliveries" options={{ title: 'Teslimatlar' }} />
        <Stack.Screen name="deliveries/[id]" options={{ title: 'Teslimat' }} />
        <Stack.Screen name="claim" options={{ title: 'QR Claim' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
