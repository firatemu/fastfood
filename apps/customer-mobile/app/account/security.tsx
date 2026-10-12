import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../components/form-field';
import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../components/ui';
import { deleteCustomerAccount } from '../../lib/account';
import { formatApiError } from '../../lib/api';
import {
  changeCustomerPassword,
  createCustomerPassword,
  fetchLinkedIdentities,
  logoutCustomer,
  requestEmailVerification,
} from '../../lib/auth';
import { authErrorMessage } from '../../lib/auth-error';
import { getStorefrontUrl } from '../../lib/env';
import { cacheIdentities } from '../../lib/private-cache';
import type { LinkedIdentities } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

type Level = 'strong' | 'fair' | 'weak';

/**
 * Derived from the real `LinkedIdentities` payload — the same three checks the
 * Web security screen shows, so the two clients cannot disagree about the
 * customer's state.
 */
function posture(input: {
  hasPassword: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}): { level: Level; headline: string; summary: string; score: number; total: number } {
  const checks = [
    input.hasPassword,
    input.emailVerified,
    input.phoneVerified,
  ];
  const score = checks.filter(Boolean).length;
  const total = 3;
  const remaining = total - score;
  const level: Level = score === total ? 'strong' : remaining === 1 ? 'fair' : 'weak';
  return {
    level,
    score,
    total,
    headline:
      level === 'strong'
        ? 'Hesabın güçlü korunuyor'
        : level === 'fair'
          ? 'Bir adım kaldı'
          : 'Hesabın korunmaya muhtaç',
    summary:
      remaining === 0
        ? 'Parola ve iki doğrulama kanıtın yerinde.'
        : `${remaining} adım tamamlanmadı.`,
  };
}

/**
 * Security.
 *
 * Mirrors the Web ordering: posture first, password as the single primary
 * action, then verification, then linked accounts, then an honest statement
 * about sessions (this client has no device inventory, so it says so rather
 * than drawing one).
 */
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
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    if (nextPassword !== confirmPassword) {
      setConfirmError('Yeni şifre alanları eşleşmiyor.');
      return;
    }
    setBusy(true);
    setError(null);
    setConfirmError(null);
    setDone(null);
    try {
      if (identities.hasPassword) {
        await changeCustomerPassword(currentPassword, nextPassword);
      } else {
        await createCustomerPassword(nextPassword);
      }
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setDone('Şifre güncellendi.');
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendEmailVerification() {
    if (sendingVerification) return;
    setSendingVerification(true);
    setVerificationError(null);
    setDone(null);
    try {
      await requestEmailVerification();
      setDone('Doğrulama bağlantısı gönderildi.');
      load();
    } catch (err) {
      // Its own slot, and formatApiError rather than authErrorMessage: the
      // auth mapper falls through to the raw envelope message, which leaks
      // English internals to a Turkish customer.
      setVerificationError(formatApiError(err));
    } finally {
      setSendingVerification(false);
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

  async function onDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomerAccount();
      await logoutCustomer();
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)/account');
      Alert.alert('Hesabın silindi', 'Kişisel verilerin sistemimizden kaldırıldı.');
    } catch (err) {
      setDeleteError(formatApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  function confirmDeletion() {
    Alert.alert(
      'Hesap kalıcı olarak silinsin mi?',
      'Bu işlem geri alınamaz. Kişisel verilerin hemen silinir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Hesabımı sil', style: 'destructive', onPress: () => void onDeleteAccount() },
      ],
    );
  }

  if (status === 'loading') return <LoadingBlock label="Güvenlik bilgisi yükleniyor…" />;
  if (status === 'error' || !identities) {
    return <ErrorBlock title="Güvenlik yüklenemedi" message={error ?? ''} onRetry={load} />;
  }

  const state = posture({
    hasPassword: identities.hasPassword,
    emailVerified: identities.emailVerified,
    phoneVerified: identities.phoneVerified,
  });
  const ratio = state.total === 0 ? 0 : Math.round((state.score / state.total) * 100);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.margin, paddingBottom: insets.bottom + 32, gap: 12 }}
      >
        <View style={styles.posture}>
          <View style={styles.postureCopy}>
            <Text style={styles.kicker}>Güvenlik durumu</Text>
            <Text style={styles.postureHeadline}>{state.headline}</Text>
            <Text style={styles.meta}>{state.summary}</Text>
          </View>
          <View style={styles.postureRight}>
            <Text style={styles.postureScore}>
              {state.score}/{state.total}
            </Text>
            <View
              style={styles.postureBar}
              accessibilityLabel={`Güvenlik adımlarının ${state.score} / ${state.total} kadarı tamamlandı`}
            >
              <View
                style={[
                  styles.postureFill,
                  {
                    width: `${ratio}%`,
                    backgroundColor:
                      state.level === 'strong'
                        ? colors.mustard
                        : state.level === 'fair'
                          ? colors.outline
                          : colors.error,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            {identities.hasPassword ? 'Şifreni değiştir' : 'Şifre belirle'}
          </Text>
          <Text style={styles.hint}>
            {identities.hasPassword
              ? 'Mevcut şifreni girerek yenisini belirle. En az 10 karakter.'
              : 'Bu hesap şu anda parolasız. Parola belirleyerek girişini güçlendir.'}
          </Text>
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
            onChangeText={(value) => {
              setNextPassword(value);
              if (confirmError && value === confirmPassword) setConfirmError(null);
            }}
            onBlur={() => {
              setConfirmError(
                confirmPassword && confirmPassword !== nextPassword
                  ? 'Yeni şifre alanları eşleşmiyor.'
                  : null,
              );
            }}
            secureTextEntry
            textContentType="newPassword"
          />
          <FormField
            label="Yeni şifre (tekrar)"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (confirmError && value === nextPassword) setConfirmError(null);
            }}
            error={confirmError ?? undefined}
            secureTextEntry
            textContentType="newPassword"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {done ? <Text style={styles.ok}>{done}</Text> : null}
          <MustardButton
            label={identities.hasPassword ? 'Şifreyi güncelle' : 'Şifreyi belirle'}
            loading={busy}
            onPress={() => void onPassword()}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Doğrulama</Text>
          <CheckRow
            label="Parola"
            satisfied={identities.hasPassword}
            hint={
              identities.hasPassword
                ? 'Parolan tanımlı.'
                : 'Oturum açmak için bir parola belirle.'
            }
          />
          <CheckRow
            label="E-posta doğrulaması"
            satisfied={identities.emailVerified}
            hint={
              identities.emailVerified
                ? 'E-posta adresin doğrulandı.'
                : 'Doğrulama bağlantısı gönder.'
            }
            action={
              identities.emailVerified ? undefined : (
                <SecondaryButton
                  label={sendingVerification ? 'Gönderiliyor…' : 'Doğrulama gönder'}
                  onPress={() => void sendEmailVerification()}
                />
              )
            }
            error={verificationError}
          />
          <CheckRow
            label="Telefon doğrulaması"
            satisfied={identities.phoneVerified}
            hint={
              identities.phoneVerified
                ? 'Telefonun doğrulandı.'
                : 'Telefonuna OTP gönder.'
            }
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Bağlı hesaplar</Text>
          {identities.identities.length === 0 ? (
            <Text style={styles.hint}>Bağlı bir sosyal hesap yok.</Text>
          ) : (
            identities.identities.map((identity) => (
              <View key={`${identity.provider}-${identity.emailNormalized ?? 'none'}`} style={styles.identityRow}>
                <Text style={styles.body}>{identity.provider.replace(/_/g, ' ')}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {identity.emailNormalized ?? 'E-posta bağlı değil'}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Oturum</Text>
          <Text style={styles.hint}>
            Bu hesapta açık oturumların listesi sunulmuyor. Tüm cihazlardan çıkış henüz
            desteklenmiyor.
          </Text>
          <SecondaryButton
            label={loggingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
            onPress={() => void onLogout()}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Hesabı sil</Text>
          <Text style={styles.hint}>
            Ad, telefon, e-posta, şifre, adresler, favoriler ve bildirimler kalıcı olarak silinir.
            Siparişler yasal kayıt olarak kimliksiz saklanır. Açık siparişin varken hesap silinemez.
          </Text>
          {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: deleting }}
            disabled={deleting}
            onPress={confirmDeletion}
            style={styles.danger}
          >
            <Text style={styles.dangerLabel}>
              {deleting ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`${getStorefrontUrl()}/gizlilik`)}
            style={styles.link}
          >
            <Text style={styles.meta}>Gizlilik politikası</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CheckRow(props: {
  label: string;
  satisfied: boolean;
  hint: string;
  action?: ReactElement;
  error?: string | null;
}) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkLabelRow}>
        <View style={[styles.checkDot, props.satisfied ? styles.checkDotOn : styles.checkDotOff]} />
        <Text style={styles.body}>{props.label}</Text>
      </View>
      <Text style={styles.hint}>{props.hint}</Text>
      {props.action ? <View style={styles.checkAction}>{props.action}</View> : null}
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  card: {
    gap: 10,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  section: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  kicker: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ash,
  },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.onSurface },
  hint: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash, lineHeight: 18 },
  meta: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  ok: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ok },
  danger: {
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: space.md,
  },
  dangerLabel: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.error },
  link: { minHeight: minTouch, justifyContent: 'center', alignSelf: 'flex-start' },

  posture: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  postureCopy: { flex: 1, minWidth: 0, gap: 4 },
  postureHeadline: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.onSurface },
  postureRight: { alignItems: 'flex-end', gap: 6 },
  postureScore: {
    fontFamily: fonts.jakartaBold,
    fontSize: 14,
    color: colors.ash,
    fontVariant: ['tabular-nums'],
  },
  postureBar: {
    width: 96,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLowest,
    overflow: 'hidden',
  },
  postureFill: { height: 6, borderRadius: 3 },

  checkAction: { marginTop: space.sm, alignSelf: 'flex-start' },
  checkRow: { gap: 4, minHeight: minTouch, justifyContent: 'center' },
  checkLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkDot: { width: 8, height: 8, borderRadius: 4 },
  checkDotOn: { backgroundColor: colors.ok },
  checkDotOff: { borderWidth: 1, borderColor: colors.outline },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: minTouch,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
});