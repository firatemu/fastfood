import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../components/form-field';
import { MustardButton } from '../components/ui';
import { loginWithPassword, registerByPhoneAndPassword } from '../lib/auth';
import { authErrorMessage } from '../lib/auth-error';
import { safeReturnDestination } from '../lib/auth-nav';
import { colors, fonts, minTouch, radius, space } from '../theme';

type Tab = 'login' | 'register';

export default function AuthRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeReturnDestination(typeof params.next === 'string' ? params.next : null);

  const [tab, setTab] = useState<Tab>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(() => {
    router.replace(next as Href);
  }, [next, router]);

  async function onLogin() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await loginWithPassword(phone.trim(), password);
      finish();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRegister() {
    if (busy) return;
    if (!kvkk) {
      setError('Devam etmek için KVKK onayını işaretleyin.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ad ve soyad zorunludur.');
      return;
    }
    if (registerPassword.length < 10) {
      setError('Şifre en az 10 karakter olmalı.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      await registerByPhoneAndPassword({
        phoneRaw: registerPhone,
        password: registerPassword,
        displayName: displayName || undefined,
        kvkkAccepted: kvkk,
        newsletterOptIn: newsletter,
      });
      finish();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kapat"
          onPress={() => router.back()}
          style={styles.close}
        >
          <MaterialCommunityIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.glow} />
          <Text style={styles.brand}>BURGER HOME</Text>
          <Text style={styles.kicker}>Hesabına gir, siparişine devam et</Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('login')}
            style={[styles.tab, tab === 'login' && styles.tabOn]}
          >
            <Text style={[styles.tabLabel, tab === 'login' && styles.tabLabelOn]}>Giriş</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('register')}
            style={[styles.tab, tab === 'register' && styles.tabOn]}
          >
            <Text style={[styles.tabLabel, tab === 'register' && styles.tabLabelOn]}>Kayıt</Text>
          </Pressable>
        </View>

        {tab === 'login' ? (
          <>
            <FormField
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={20}
            />
            <FormField
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
            />
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              SMS doğrulaması bu süreçte kapalıdır (ADR-010). Telefon + şifre ile hemen üye ol.
            </Text>
            <FormField
              label="Ad"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
            />
            <FormField
              label="Soyad"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
            />
            <FormField
              label="Telefon"
              value={registerPhone}
              onChangeText={setRegisterPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={20}
            />
            <FormField
              label="Şifre"
              value={registerPassword}
              onChangeText={setRegisterPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <View style={styles.switches}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  KVKK aydınlatma metnini okudum ve kabul ediyorum.
                </Text>
                <Switch
                  value={kvkk}
                  onValueChange={setKvkk}
                  trackColor={{ false: colors.surfaceHighest, true: colors.mustardPressed }}
                  thumbColor={kvkk ? colors.mustard : colors.ash}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Kampanya e-postası / bülten (isteğe bağlı)</Text>
                <Switch
                  value={newsletter}
                  onValueChange={setNewsletter}
                  trackColor={{ false: colors.surfaceHighest, true: colors.mustardPressed }}
                  thumbColor={newsletter ? colors.mustard : colors.ash}
                />
              </View>
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <LinearGradient
          colors={[colors.mustard, colors.mustardPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaWrap}
        >
          <MustardButton
            label={tab === 'login' ? 'Giriş yap' : 'Üye ol'}
            loading={busy}
            onPress={() => void (tab === 'login' ? onLogin() : onRegister())}
          />
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingHorizontal: space.margin, gap: 12 },
  close: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  hero: { alignItems: 'center', paddingVertical: space.lg },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.mustardBloom,
    top: -20,
  },
  brand: { fontFamily: fonts.anton, fontSize: 36, color: colors.mustard, letterSpacing: 1 },
  kicker: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, marginTop: 6 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabOn: { backgroundColor: colors.surfaceHigh },
  tabLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 13,
    color: colors.ash,
    textTransform: 'uppercase',
  },
  tabLabelOn: { color: colors.mustard },
  hint: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash },
  switches: { gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: {
    flex: 1,
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  forgot: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.mustard,
    textTransform: 'uppercase',
  },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  ctaWrap: { borderRadius: radius.md, overflow: 'hidden' },
});
