import { Button, Card, Input, defaultTheme } from '@fastfood/ui-native';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApiError, getApiClient } from '../lib/api';
import { claimResponseSchema } from '../lib/schemas';
import { getCourierSession } from '../lib/session';

/**
 * QR claim input — POST /api/v1/courier/claims/qr.
 */
export default function ClaimScreen() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!getCourierSession()) {
    return <Redirect href="/login" />;
  }

  async function claim() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await getApiClient().request({
        method: 'POST',
        path: '/courier/claims/qr',
        body: { token: token.trim() },
        schema: claimResponseSchema,
      });
      setMessage(`Claim başarılı: ${res.data.id}`);
      router.push(`/deliveries/${res.data.id}`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Link href="/deliveries" asChild>
        <Pressable>
          <Text style={styles.back}>← Teslimatlar</Text>
        </Pressable>
      </Link>
      <Text style={styles.title}>QR ile claim</Text>
      <Text style={styles.subtitle}>POST /api/v1/courier/claims/qr</Text>

      <Card title="Token" theme={theme}>
        <View style={styles.form}>
          <Input
            theme={theme}
            label="QR token"
            value={token}
            onChangeText={setToken}
            placeholder="En az 16 karakter"
          />
          <Button theme={theme} variant="primary" loading={busy} onPress={() => void claim()}>
            Claim et
          </Button>
          {message ? <Text style={styles.ok}>{message}</Text> : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}
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
    form: { gap: theme.space[3] },
    ok: { color: theme.color.semantic.success[700], fontSize: theme.fontSize.sm.size },
    err: { color: theme.color.semantic.danger[700], fontSize: theme.fontSize.sm.size },
  });
}
