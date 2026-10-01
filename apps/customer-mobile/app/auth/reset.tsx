import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../components/form-field';
import { StackHeader } from '../../components/stack-header';
import { MustardButton } from '../../components/ui';
import { confirmPasswordReset } from '../../lib/auth';
import { authErrorMessage } from '../../lib/auth-error';
import { parseResetToken } from '../../lib/deep-link';
import { colors, fonts, space } from '../../theme';

export default function AuthResetRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = useMemo(
    () => parseResetToken(typeof params.token === 'string' ? params.token : '') ?? '',
    [params.token],
  );
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    if (busy) return;
    if (password.trim().length < 10) {
      setError('Şifre en az 10 karakter olmalı.');
      return;
    }
    if (token.length < 8) {
      setError('Sıfırlama bağlantısı geçersiz.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StackHeader title="Şifre sıfırla" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.margin, paddingBottom: insets.bottom + 24, gap: 12 }}
      >
        {done ? (
          <>
            <Text style={styles.body}>Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.</Text>
            <MustardButton label="Girişe dön" onPress={() => router.replace('/auth')} />
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Yeni şifren en az 10 karakter olmalı. Bağlantıdaki token sunucuda doğrulanır.
            </Text>
            <FormField
              label="Yeni şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <MustardButton label="Şifreyi güncelle" loading={busy} onPress={() => void onSubmit()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
});
