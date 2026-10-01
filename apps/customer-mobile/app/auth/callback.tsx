import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBlock, LoadingBlock } from '../../components/ui';
import { establishSessionFromUntrustedCallback } from '../../lib/auth';
import { authErrorMessage } from '../../lib/auth-error';
import { safeReturnDestination } from '../../lib/auth-nav';
import { parseAuthCallbackUrl } from '../../lib/deep-link';
import { colors, fonts, space } from '../../theme';

export default function AuthCallbackRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    refreshToken?: string;
    customerId?: string;
    next?: string;
  }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseAuthCallbackUrl(
      `fastfoodcustomer://auth/callback?refreshToken=${encodeURIComponent(params.refreshToken ?? '')}&customerId=${encodeURIComponent(params.customerId ?? '')}&next=${encodeURIComponent(params.next ?? '')}`,
    );
    const next = safeReturnDestination(parsed.next);
    void (async () => {
      try {
        const result = await establishSessionFromUntrustedCallback({
          customerId: parsed.customerId,
          refreshToken: parsed.refreshToken,
        });
        if (result !== 'authenticated') {
          setError('OAuth oturumu doğrulanamadı. E-posta veya telefon ile giriş yapın.');
          return;
        }
        router.replace(next as Href);
      } catch (err) {
        setError(authErrorMessage(err));
      }
    })();
  }, [params.customerId, params.next, params.refreshToken, router]);

  if (error) {
    return (
      <View style={styles.wrap}>
        <ErrorBlock
          title="Google / Apple girişi tamamlanamadı"
          message={error}
          onRetry={() => router.replace('/auth')}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <LoadingBlock label="Oturum doğrulanıyor…" />
      <Text style={styles.note}>Sağlayıcı parametreleri cihaz üzerinde kimlik sayılmaz.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
  },
  note: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    color: colors.ash,
    textAlign: 'center',
  },
});
