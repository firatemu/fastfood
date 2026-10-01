import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../components/form-field';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../components/ui';
import { fetchCustomerProfile, fetchLoyaltyPoints, patchCustomerProfile } from '../../lib/account';
import { formatApiError } from '../../lib/api';
import { logoutCustomer } from '../../lib/auth';
import { authErrorMessage } from '../../lib/auth-error';
import { profileFormToPatch, profileToForm, type ProfileForm } from '../../lib/profile-map';
import type { CustomerProfile } from '../../lib/schemas';
import { restoreSession } from '../../lib/session';
import { useAuthBootstrap, useCustomerSession } from '../../lib/use-session';
import { colors, fonts, minTouch, radius, space } from '../../theme';

type AccountIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

function AccountDestination(props: {
  icon: AccountIcon;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [styles.destination, pressed && styles.destinationPressed]}
    >
      <View style={styles.destinationIcon}>
        <MaterialCommunityIcons name={props.icon} size={20} color={colors.mustard} />
      </View>
      <View style={styles.destinationCopy}>
        <Text style={styles.destinationTitle}>{props.title}</Text>
        {props.subtitle ? <Text style={styles.destinationSubtitle}>{props.subtitle}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={21} color={colors.outline} />
    </Pressable>
  );
}

function AccountShortcut(props: { icon: AccountIcon; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.destinationPressed]}
    >
      <MaterialCommunityIcons name={props.icon} size={22} color={colors.mustard} />
      <Text style={styles.shortcutLabel}>{props.label}</Text>
      <MaterialCommunityIcons name="arrow-top-right" size={16} color={colors.ash} />
    </Pressable>
  );
}

export default function AccountRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useCustomerSession();
  const bootstrap = useAuthBootstrap();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [points, setPoints] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>({ displayName: '', email: '', locale: 'tr-TR' });
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(() => {
    if (!session) {
      setProfile(null);
      setPoints(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    void (async () => {
      try {
        const next = await fetchCustomerProfile();
        setProfile(next);
        setForm(profileToForm(next));
        setStatus('ready');
        setError(null);
        try {
          setPoints(await fetchLoyaltyPoints());
        } catch {
          setPoints(null);
        }
      } catch (err) {
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onSaveProfile() {
    if (!profile || saving) return;
    const mapped = profileFormToPatch(form, profile);
    if (!mapped.ok) {
      setError(mapped.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await patchCustomerProfile(mapped.patch);
      setProfile(next);
      setForm(profileToForm(next));
      setEditing(false);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutCustomer();
      setProfile(null);
      setPoints(null);
      setEditing(false);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(tabs)/account');
    } finally {
      setLoggingOut(false);
    }
  }

  if (bootstrap === 'pending') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingBlock label="Oturum kontrol ediliyor…" />
      </View>
    );
  }

  if (bootstrap === 'offline' && !session) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, padding: space.margin }]}>
        <ErrorBlock
          title="Oturum doğrulanamadı"
          message="Ağ yokken hesap bilgisi gösterilmez."
          onRetry={() => void restoreSession()}
        />
      </View>
    );
  }

  if (!session) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.pageHeading}>
          <Text style={styles.brand}>BURGER HOME</Text>
          <Text style={styles.headline}>Hesabın burada</Text>
          <Text style={styles.body}>
            Giriş yap; adreslerini, tercihlerini ve siparişlerini tek yerden yönet.
          </Text>
        </View>
        <View style={styles.guestPanel}>
          <View style={styles.guestMark}>
            <MaterialCommunityIcons name="account-outline" size={28} color={colors.onMustard} />
          </View>
          <View style={styles.guestCopy}>
            <Text style={styles.guestTitle}>Üyeliğine devam et</Text>
            <Text style={styles.body}>Sipariş geçmişin ve avantajların seni bekliyor.</Text>
          </View>
          <MustardButton
            label="Giriş yap / kayıt ol"
            onPress={() => router.push({ pathname: '/auth', params: { next: '/(tabs)/account' } })}
          />
        </View>
        <View style={styles.menuGroup}>
          <Text style={styles.section}>Misafir olarak keşfet</Text>
          <View style={styles.destinationList}>
            <AccountDestination
              icon="shopping-outline"
              title="Siparişler"
              subtitle="Geçmiş ve takip"
              onPress={() => router.push('/(tabs)/orders')}
            />
            <AccountDestination
              icon="storefront-outline"
              title="Şubeler & hikâye"
              onPress={() => router.push('/branches')}
            />
            <AccountDestination
              icon="tag-outline"
              title="Fırsatlar"
              onPress={() => router.push('/deals')}
            />
            <AccountDestination
              icon="qrcode"
              title="Masa kodu"
              subtitle="Giriş yapmadan kullan"
              onPress={() => router.push('/table')}
            />
            <AccountDestination
              icon="file-document-outline"
              title="Yasal bilgiler"
              onPress={() => router.push('/legal')}
            />
            <AccountDestination
              icon="information-outline"
              title="Alerjen rehberi"
              onPress={() => router.push('/legal/allergens')}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingBlock label="Profil yükleniyor…" />
      </View>
    );
  }

  if (status === 'error' || !profile) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, padding: space.margin }]}>
        <ErrorBlock title="Profil yüklenemedi" message={error ?? 'Tekrar dene.'} onRetry={load} />
      </View>
    );
  }

  const name = profile.displayName?.trim() || 'BURGER HOME üyesi';

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 36 },
      ]}
    >
      <View style={styles.pageHeading}>
        <Text style={styles.headline}>Hesabın</Text>
        <Text style={styles.body}>Profilini, siparişlerini ve üyelik avantajlarını yönet.</Text>
      </View>

      <View style={styles.memberPanel}>
        <View style={styles.memberTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toLocaleUpperCase('tr-TR')}</Text>
          </View>
          <View style={styles.memberCopy}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {profile.email ?? profile.phone ?? 'İletişim bilgisi ekle'}
            </Text>
          </View>
          <View style={styles.pointsBlock}>
            <Text style={styles.pointsValue}>{points ?? '—'}</Text>
            <Text style={styles.pointsLabel}>puan</Text>
          </View>
        </View>
        <View style={styles.memberFooter}>
          <View style={styles.clubMark}>
            <MaterialCommunityIcons name="fire" size={16} color={colors.onMustard} />
          </View>
          <View style={styles.clubCopy}>
            <Text style={styles.clubLabel}>BURGER HOME CLUB</Text>
            <Text style={styles.clubValue}>Ayrıcalıkların seni bekliyor</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/account/club')}
            hitSlop={8}
            style={styles.clubLink}
          >
            <MaterialCommunityIcons name="arrow-top-right" size={19} color={colors.mustard} />
          </Pressable>
        </View>
      </View>

      <View style={styles.shortcuts}>
        <AccountShortcut
          icon="map-marker-outline"
          label="Adreslerim"
          onPress={() => router.push('/account/addresses')}
        />
        <AccountShortcut
          icon="receipt-text-outline"
          label="Siparişler"
          onPress={() => router.push('/(tabs)/orders')}
        />
      </View>

      {editing ? (
        <View style={styles.profilePanel}>
          <View style={styles.groupHeading}>
            <Text style={styles.section}>Kişisel bilgiler</Text>
            <Text style={styles.groupHint}>Hesap bilgilerini düzenle</Text>
          </View>
          <FormField
            label="Görünen ad"
            value={form.displayName}
            onChangeText={(displayName) => setForm((current) => ({ ...current, displayName }))}
          />
          <FormField
            label="E-posta"
            value={form.email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(email) => setForm((current) => ({ ...current, email }))}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <MustardButton
            label="Değişiklikleri kaydet"
            loading={saving}
            onPress={() => void onSaveProfile()}
          />
          <SecondaryButton label="Vazgeç" onPress={() => setEditing(false)} />
        </View>
      ) : (
        <View style={styles.menuGroup}>
          <View style={styles.groupHeading}>
            <Text style={styles.section}>Hesap tercihleri</Text>
            <Text style={styles.groupHint}>Kişisel bilgilerin ve güvenliğin</Text>
          </View>
          <View style={styles.destinationList}>
            <AccountDestination
              icon="account-cog-outline"
              title="Kişisel bilgiler"
              subtitle={[profile.phone, profile.email].filter(Boolean).join(' · ') || 'Eksik bilgi'}
              onPress={() => setEditing(true)}
            />
            <AccountDestination
              icon="cog-outline"
              title="Bildirim ve iletişim tercihleri"
              onPress={() => router.push('/account/settings')}
            />
            <AccountDestination
              icon="shield-lock-outline"
              title="Güvenlik ve şifre"
              onPress={() => router.push('/account/security')}
            />
            <View style={styles.paymentNote}>
              <MaterialCommunityIcons
                name="credit-card-lock-outline"
                size={20}
                color={colors.ash}
              />
              <Text style={styles.paymentText}>Kart bilgileri bu uygulamada saklanmaz.</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.menuGroup}>
        <View style={styles.groupHeading}>
          <Text style={styles.section}>Ayrıcalıklar ve destek</Text>
          <Text style={styles.groupHint}>Üyelik, keşif ve yardım</Text>
        </View>
        <View style={styles.destinationList}>
          <AccountDestination
            icon="star-circle-outline"
            title="BURGER HOME CLUB"
            subtitle="Puanlarını ve üyelik avantajlarını gör"
            onPress={() => router.push('/account/club')}
          />
          <AccountDestination
            icon="creation"
            title="Ateş Çarkı"
            onPress={() => router.push('/account/spin')}
          />
          <AccountDestination
            icon="heart-outline"
            title="Favoriler"
            onPress={() => router.push('/account/favorites')}
          />
          <AccountDestination
            icon="bell-outline"
            title="Bildirimler"
            onPress={() => router.push('/account/notifications')}
          />
          <AccountDestination
            icon="lifebuoy"
            title="Destek"
            onPress={() => router.push('/account/support')}
          />
          <AccountDestination
            icon="qrcode"
            title="Masa kodu"
            subtitle="Gel-al ve teslimat seçimini etkilemez"
            onPress={() => router.push('/table')}
          />
        </View>
      </View>

      <View style={styles.menuGroup}>
        <View style={styles.groupHeading}>
          <Text style={styles.section}>Burger Home</Text>
          <Text style={styles.groupHint}>Şubeler ve bilgilendirme</Text>
        </View>
        <View style={styles.destinationList}>
          <AccountDestination
            icon="storefront-outline"
            title="Şubeler & hikâye"
            onPress={() => router.push('/branches')}
          />
          <AccountDestination
            icon="tag-outline"
            title="Fırsatlar"
            onPress={() => router.push('/deals')}
          />
          <AccountDestination
            icon="file-document-outline"
            title="Yasal bilgiler"
            onPress={() => router.push('/legal')}
          />
          <AccountDestination
            icon="information-outline"
            title="Alerjen rehberi"
            onPress={() => router.push('/legal/allergens')}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={loggingOut}
        onPress={() => void onLogout()}
        style={({ pressed }) => [styles.logout, pressed && styles.destinationPressed]}
      >
        <MaterialCommunityIcons name="logout-variant" size={19} color={colors.error} />
        <Text style={styles.logoutLabel}>{loggingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' },
  scroll: { paddingHorizontal: space.gutter, gap: space.lg },
  pageHeading: { gap: 5 },
  brand: { fontFamily: fonts.anton, fontSize: 27, color: colors.mustard, letterSpacing: 0.4 },
  headline: { fontFamily: fonts.anton, fontSize: 32, lineHeight: 38, color: colors.onSurface },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  guestPanel: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.md,
  },
  guestMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCopy: { gap: 4 },
  guestTitle: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  memberPanel: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    padding: space.md,
    gap: space.md,
  },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fonts.anton, fontSize: 23, color: colors.onMustard },
  memberCopy: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  meta: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  pointsBlock: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  pointsValue: {
    fontFamily: fonts.jakartaBold,
    fontSize: 16,
    color: colors.mustard,
    fontVariant: ['tabular-nums'],
  },
  pointsLabel: { fontFamily: fonts.jakarta, fontSize: 10, color: colors.ash },
  memberFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: 12,
  },
  clubMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubCopy: { flex: 1, gap: 2 },
  clubLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  clubValue: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  clubLink: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', gap: 10 },
  shortcut: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shortcutLabel: {
    flex: 1,
    fontFamily: fonts.jakartaSemibold,
    fontSize: 12,
    color: colors.onSurface,
  },
  menuGroup: { gap: 10 },
  groupHeading: { gap: 3 },
  section: {
    fontFamily: fonts.jakartaBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  groupHint: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  destinationList: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  destination: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  destinationPressed: { backgroundColor: colors.surfaceHigh },
  destinationIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
  },
  destinationCopy: { flex: 1, minWidth: 0, gap: 3 },
  destinationTitle: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.onSurface },
  destinationSubtitle: {
    fontFamily: fonts.jakarta,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ash,
  },
  profilePanel: {
    gap: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  paymentNote: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  paymentText: { flex: 1, fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  error: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.error,
    paddingHorizontal: space.md,
  },
  logout: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceLow,
  },
  logoutLabel: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.error },
});
