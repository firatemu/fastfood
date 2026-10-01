import { Button, Card, Input, defaultTheme } from '@fastfood/ui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApiError, getApiClient } from '../lib/api';
import { staffLoginResponseSchema, staffMfaResponseSchema } from '../lib/schemas';
import { setCourierSession } from '../lib/session';

/**
 * Staff / courier login — POST /api/v1/auth/staff/login (+ MFA verify).
 */
export default function LoginScreen() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const [identifier, setIdentifier] = useState('courier@fastfood.local');
  const [password, setPassword] = useState('DevStaffPass1!');
  const [totp, setTotp] = useState('000000');
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await getApiClient().request({
        method: 'POST',
        path: '/auth/staff/login',
        body: { identifier: identifier.trim(), password },
        schema: staffLoginResponseSchema,
      });
      setRefreshToken(res.data.refreshToken);
      if (res.data.mfaRequired) {
        setMfaRequired(true);
        setMessage('MFA gerekli — 6 haneli kod girin (dev bypass).');
      } else {
        // No access token without MFA step; complete MFA with placeholder.
        const mfa = await getApiClient().request({
          method: 'POST',
          path: '/auth/staff/mfa/verify',
          body: { refreshToken: res.data.refreshToken, totp: '000000' },
          schema: staffMfaResponseSchema,
        });
        setCourierSession({
          userId: mfa.data.userId,
          accessToken: mfa.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
        router.replace('/deliveries');
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa() {
    if (!refreshToken) {
      setError('Önce giriş yapın.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mfa = await getApiClient().request({
        method: 'POST',
        path: '/auth/staff/mfa/verify',
        body: { refreshToken, totp: totp.trim() },
        schema: staffMfaResponseSchema,
      });
      setCourierSession({
        userId: mfa.data.userId,
        accessToken: mfa.data.accessToken,
        refreshToken,
      });
      router.replace('/deliveries');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>FASTFOOD Courier</Text>
      <Text style={styles.title}>Kurye girişi</Text>
      <Text style={styles.subtitle}>Staff identity · POST /api/v1/auth/staff/*</Text>

      <Card title="Kimlik bilgileri" theme={theme}>
        <View style={styles.form}>
          <Input
            theme={theme}
            label="E-posta / kullanıcı"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
          />
          <Input
            theme={theme}
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {!mfaRequired ? (
            <Button theme={theme} variant="primary" loading={busy} onPress={() => void login()}>
              Giriş
            </Button>
          ) : (
            <>
              <Input
                theme={theme}
                label="MFA kodu"
                value={totp}
                onChangeText={setTotp}
                keyboardType="numeric"
              />
              <Button
                theme={theme}
                variant="primary"
                loading={busy}
                onPress={() => void verifyMfa()}
              >
                MFA doğrula
              </Button>
            </>
          )}
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
    brand: {
      fontSize: theme.fontSize.xl.size,
      fontWeight: '800',
      color: theme.tokens.actionPrimaryBackground,
    },
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
