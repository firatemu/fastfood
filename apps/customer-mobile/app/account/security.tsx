import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../components/form-field';
import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton } from '../../components/ui';
import {
  changeCustomerPassword,
  createCustomerPassword,
  fetchLinkedIdentities,
  logoutCustomer,
} from '../../lib/auth';
import { authErrorMessage } from '../../lib/auth-error';
import { cacheIdentities } from '../../lib/private-cache';
import type { LinkedIdentities } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function AccountSecurityRoute() {
  return (
    <View style={styles.root}>
      <StackHeader title="Güvenlik" />
      <RequireCustomer next="/account/security">
        <SecurityBody />
      </RequireCustomer>
    </View>
  );
}

function SecurityBody() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [identities, setIdentities] = useState<LinkedIdentities | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    void fetchLinkedIdentities()
      .then((next) => {
        cacheIdentities(next);
        setIdentities(next);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(authErrorMessage(err));
        setStatus('error');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onPassword() {
    if (busy || !identities) return;
    if (nextPassword.trim().length < 10) {
      setError('Şifre en az 10 karakter olmalı.');
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      if (identities.hasPassword) {
        await changeCustomerPassword(currentPassword, nextPassword);
      } else {
        await createCustomerPassword(nextPassword);
      }
      setCurrentPassword('');
      setNextPassword('');
      setDone('Şifre güncellendi.');
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutCustomer();
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)/account');
    } finally {
      setLoggingOut(false);
    }
  }

  if (status === 'loading') return <LoadingBlock label="Güvenlik bilgisi yükleniyor…" />;
  if (status === 'error' || !identities) {
    return <ErrorBlock title="Güvenlik yüklenemedi" message={error ?? ''} onRetry={load} />;
  }

  const providers = identities.identities
    .map((item) => item.provider.replace(/_/g, ' '))
    .join(', ');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.margin, paddingBottom: insets.bottom + 32, gap: 12 }}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Doğrulama</Text>
          <Text style={styles.value}>Telefon: {identities.phoneVerified ? 'doğrulandı' : 'doğrulanmadı'}</Text>
          <Text style={styles.value}>E-posta: {identities.emailVerified ? 'doğrulandı' : 'doğrulanmadı'}</Text>
          <Text style={styles.value}>Şifre: {identities.hasPassword ? 'tanımlı' : 'yok'}</Text>
          {providers ? <Text style={styles.hint}>Bağlı yöntemler: {providers}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{identities.hasPassword ? 'Şifre değiştir' : 'Şifre oluştur'}</Text>
          {identities.hasPassword ? (
            <FormField
              label="Mevcut şifre"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              textContentType="password"
            />
          ) : null}
          <FormField
            label="Yeni şifre"
            value={nextPassword}
            onChangeText={setNextPassword}
            secureTextEntry
            textContentType="newPassword"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {done ? <Text style={styles.ok}>{done}</Text> : null}
          <MustardButton
            label={identities.hasPassword ? 'Şifreyi değiştir' : 'Şifre oluştur'}
            loading={busy}
            onPress={() => void onPassword()}
          />
        </View>

        <MustardButton label={loggingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'} onPress={() => void onLogout()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  card: { gap: 10, padding: space.md, backgroundColor: colors.surface, borderRadius: radius.lg },
  label: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.onSurface },
  hint: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  ok: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.mustard },
  logout: { minHeight: minTouch },
});
