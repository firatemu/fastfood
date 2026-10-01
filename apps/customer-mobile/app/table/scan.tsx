import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, MustardButton, SecondaryButton } from '../../components/ui';
import { parseScannedTablePayload } from '../../lib/content-map';
import { colors, fonts, space } from '../../theme';

export default function TableScanRoute() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  function onScanned(input: { data: string }) {
    if (locked) return;
    const code = parseScannedTablePayload(input.data);
    if (!code) {
      setError('Bu karekod geçerli bir masa kodu değil.');
      return;
    }
    setLocked(true);
    router.replace(`/table/${code}`);
  }

  return (
    <View style={styles.screen}>
      <StackHeader title="Masa tara" />
      {!permission ? (
        <View style={styles.padded}>
          <ErrorBlock title="Kamera" message="İzin durumu okunamadı." />
          <SecondaryButton label="Kodu yaz" onPress={() => router.replace('/table')} />
        </View>
      ) : !permission.granted ? (
        <View style={styles.padded}>
          <Text style={styles.body}>
            Kamera izni yalnızca tarayıcı açıkken istenir. Masa kodunu elle de yazabilirsin. Tarama giriş
            yapmaz.
          </Text>
          {permission.canAskAgain ? (
            <MustardButton label="Kamera izni ver" onPress={() => void requestPermission()} />
          ) : (
            <Text style={styles.meta}>İzin sistem ayarlarından kapatılmış. Elle kod yaz.</Text>
          )}
          <SecondaryButton label="Kodu yaz" onPress={() => router.replace('/table')} />
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <SecondaryButton label="Kodu yaz" onPress={() => router.replace('/table')} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter, gap: 12 },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  meta: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error, textAlign: 'center' },
  cameraWrap: { flex: 1, padding: space.gutter, gap: 12 },
  camera: { flex: 1, borderRadius: 16, overflow: 'hidden' },
});
