import { Button, Card, Input, defaultTheme } from '@fastfood/ui-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Link, Redirect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApiError, getApiClient } from '../lib/api';
import { claimResponseSchema } from '../lib/schemas';
import { getCourierSession } from '../lib/session';

/**
 * QR claim — POST /api/v1/courier/claims/qr.
 *
 * The web courier surface scans the branch QR and also accepts a typed code, so
 * the mobile screen does both. The camera is opt-in: permission is requested
 * only when the courier taps "Kamera ile okut", and the typed field stays usable
 * when a permission is denied.
 */
export default function ClaimScreen() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const claim = useCallback(
    async (raw?: string) => {
      const value = (raw ?? token).trim();
      if (!value) {
        setError('QR kodu girin veya kodu okutun.');
        return;
      }
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const res = await getApiClient().request({
          method: 'POST',
          path: '/courier/claims/qr',
          body: { token: value },
          schema: claimResponseSchema,
        });
        setMessage('Teslimat güvenle alındı.');
        router.replace(`/deliveries/${res.data.id}`);
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setBusy(false);
        setScanning(false);
      }
    },
    [token],
  );

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      // Fired continuously while a code is in frame; the busy flag makes the
      // first accepted read the only one that reaches the API.
      if (busy) return;
      setToken(result.data);
      void claim(result.data);
    },
    [busy, claim],
  );

  const startScanner = useCallback(async () => {
    if (permission?.granted) {
      setScanning(true);
      return;
    }
    const result = await requestPermission();
    if (result.granted) {
      setScanning(true);
    } else {
      setError('Kamera izni verilmedi. Kodu elle girebilirsin.');
    }
  }, [permission?.granted, requestPermission]);

  // Declared after every hook so the hook order stays identical whether or not
  // a session exists; an early return above these hooks would break the rules
  // of hooks on the signed-in render path.
  if (!getCourierSession()) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Link href="/deliveries" asChild>
        <Pressable accessibilityRole="button">
          <Text style={styles.back}>← Teslimatlar</Text>
        </Pressable>
      </Link>
      <Text style={styles.title}>QR ile teslimat al</Text>
      <Text style={styles.subtitle}>
        Şubedeki yetkili QR kodunu okut veya kodu elle gir.
      </Text>

      {scanning && permission?.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={busy ? undefined : onBarcodeScanned}
          />
          <Text style={styles.cameraHint}>Kodu çerçeve içine al.</Text>
        </View>
      ) : (
        <Button theme={theme} variant="secondary" onPress={() => void startScanner()}>
          Kamera ile okut
        </Button>
      )}

      <Card title="Kodu gir" subtitle="Kod kısa süreli, tek kullanımlıktır." theme={theme}>
        <View style={styles.form}>
          <Input
            theme={theme}
            label="QR kodu"
            value={token}
            onChangeText={setToken}
            placeholder="Şube QR kodunu buraya gir"
          />
          <Button theme={theme} variant="primary" loading={busy} onPress={() => void claim()}>
            Teslimatı güvenle al
          </Button>
          {message ? <Text style={styles.ok}>{message}</Text> : null}
          {error ? (
            <Text style={styles.err} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </View>
      </Card>
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof defaultTheme>) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.tokens.surfaceCanvas,
      padding: theme.space[6],
      gap: theme.space[4],
    },
    back: { color: theme.tokens.actionPrimaryBackground, fontWeight: '600' },
    title: {
      fontSize: theme.fontSize.lg.size,
      fontWeight: '700',
      color: theme.tokens.textPrimary,
    },
    subtitle: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textSecondary },
    cameraWrap: { gap: theme.space[2] },
    camera: {
      width: '100%',
      height: 260,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.tokens.surfaceSubtle,
    },
    cameraHint: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    form: { gap: theme.space[3] },
    ok: { color: theme.color.semantic.success[700], fontSize: theme.fontSize.sm.size },
    err: { color: theme.color.semantic.danger[700], fontSize: theme.fontSize.sm.size },
  });
}