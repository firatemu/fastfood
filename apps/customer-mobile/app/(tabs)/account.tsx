import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../components/form-field';
import { ScrollToTopFab, useScrollToTop } from '../../components/scroll-to-top';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../components/ui';
import { fetchCustomerProfile, fetchLoyaltyPoints, patchCustomerProfile } from '../../lib/account';
import { formatApiError } from '../../lib/api';
import { logoutCustomer } from '../../lib/auth';
import { authErrorMessage } from '../../lib/auth-error';
import { formatTryMinor } from '../../lib/money';
import { fetchMyOrders } from '../../lib/orders';
import { profileFormToPatch, profileToForm, type ProfileForm } from '../../lib/profile-map';
import type { CustomerOrder, CustomerProfile } from '../../lib/schemas';
import { restoreSession } from '../../lib/session';
import { useAuthBootstrap, useCustomerSession } from '../../lib/use-session';
import { colors, fonts, minTouch, radius, space } from '../../theme';

type AccountIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Customer account hub.
 *
 * Mirrors the Web `/account` information architecture — identity, then a
 * status strip that says what still needs attention, then the one thing people
 * edit most often, then membership, then the destinations. Implemented natively
 * in `StyleSheet` against `theme.ts`; no Web DOM or CSS is shared (ADR-008).
 */
export default function AccountRoute() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const top = useScrollToTop();
  const router = useRouter();
  const session = useCustomerSession();
  const bootstrap = useAuthBootstrap();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [points, setPoints] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
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
      setOrders([]);
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
        try {
          const rows = await fetchMyOrders();
          setOrders(rows.slice(0, 3));
        } catch {
          setOrders([]);
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
  const phoneVerified = profile.phoneVerified === true;
  const recent = orders.slice(0, 3);

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        ref={scrollRef}
        onScroll={top.onScroll}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 36 },
        ]}
      >
      <View style={styles.pageHeading}>
        <Text style={styles.headline}>Hesabın</Text>
        <Text style={styles.body}>
          Profilini, siparişlerini ve üyelik avantajlarını yönet.
        </Text>
      </View>

      {/* Primary region: the thing people edit most often. */}
      {editing ? (
        <View style={styles.profilePanel}>
          <Text style={styles.section}>Kişisel bilgiler</Text>
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
        <View style={styles.profilePanel}>
          <View style={styles.identityRow}>
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
          </View>
          <View style={styles.readOnlyRow}>
            <Text style={styles.meta}>Telefon</Text>
            <View style={styles.readOnlyLine}>
              <Text style={styles.body} numberOfLines={1}>
                {profile.phone ?? 'Telefon eklenmemiş'}
              </Text>
              <View style={styles.dotRow}>
                <View
                  style={[
                    styles.dot,
                    phoneVerified ? styles.dotOn : styles.dotOff,
                  ]}
                />
                <Text style={phoneVerified ? styles.metaOn : styles.metaWarn}>
                  {profile.phone ? (phoneVerified ? 'Doğrulandı' : 'Doğrulanmadı') : 'Eklenmedi'}
                </Text>
              </View>
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <MustardButton label="Bilgileri düzenle" onPress={() => setEditing(true)} />
        </View>
      )}

      <View style={styles.ordersPanel}>
        <View style={styles.panelHead}>
          <Text style={styles.section}>Son siparişler</Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Text style={styles.link}>Tümünü gör</Text>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <View style={styles.emptyOrders}>
            <MaterialCommunityIcons name="receipt-text-outline" size={22} color={colors.mustard} />
            <Text style={styles.body}>Henüz sipariş yok.</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.link}>Menüye git</Text>
            </Pressable>
          </View>
        ) : (
          recent.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              style={styles.orderRow}
              onPress={() => router.push(`/orders/${order.id}`)}
            >
              <View style={styles.copy}>
                <Text style={styles.label} numberOfLines={1}>
                  #{order.displayNumber ?? order.id.slice(0, 8)}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {order.statusLabel ?? order.status}
                </Text>
              </View>
              <Text style={styles.amount}>
                {order.finalPayableMinor
                  ? formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')
                  : '—'}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      {/* Membership band — mirrors the Web wide band. */}
      <Pressable
        accessibilityRole="button"
        style={styles.clubBand}
        onPress={() => router.push('/account/club')}
      >
        <View style={styles.clubMark}>
          <MaterialCommunityIcons name="fire" size={20} color={colors.onMustard} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.meta}>BURGER HOME CLUB</Text>
          <Text style={styles.clubTitle}>Ayrıcalıklarını gör</Text>
        </View>
        <View style={styles.clubPoints}>
          <Text style={styles.clubPointsValue}>{points ?? '—'}</Text>
          <Text style={styles.meta}>puan</Text>
        </View>
      </Pressable>

      <View style={styles.menuGroup}>
        <View style={styles.panelHead}>
          <Text style={styles.section}>Hesap</Text>
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
            icon="map-marker-outline"
            title="Adresler"
            subtitle="Teslimat adreslerin ve bina kodu"
            onPress={() => router.push('/account/addresses')}
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
        </View>
      </View>

      <View style={styles.menuGroup}>
        <View style={styles.panelHead}>
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

      <Pressable
        accessibilityRole="button"
        disabled={loggingOut}
        onPress={() => void onLogout()}
        style={styles.logout}
      >
        <MaterialCommunityIcons name="logout-variant" size={19} color={colors.error} />
        <Text style={styles.logoutLabel}>{loggingOut ? 'Çıkış yapılıyor…' : 'Çıkış yap'}</Text>
      </Pressable>
      </ScrollView>
      <ScrollToTopFab visible={top.visible} scrollRef={scrollRef} bottom={insets.bottom + 88} />
    </View>
  );
}

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

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.canvas },
  root: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' },
  scroll: { paddingHorizontal: space.gutter, gap: space.lg },
  pageHeading: { gap: 5 },
  brand: { fontFamily: fonts.anton, fontSize: 27, color: colors.mustard, letterSpacing: 0.4 },
  headline: { fontFamily: fonts.jakartaBold, fontSize: 20, lineHeight: 28, color: colors.onSurface },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },

  profilePanel: {
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fonts.anton, fontSize: 22, color: colors.onMustard },
  memberCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  meta: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  metaOn: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  metaWarn: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.warn },
  readOnlyRow: {
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    padding: space.md,
  },
  readOnlyLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: colors.info },
  dotOff: { borderWidth: 1, borderColor: colors.outline },

  ordersPanel: {
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  panelHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  emptyOrders: { gap: 8, paddingVertical: space.md },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: minTouch,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontFamily: fonts.jakartaSemibold, fontSize: 14, color: colors.onSurface },
  amount: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface },
  link: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.mustard },

  clubBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  clubMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubTitle: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  clubPoints: { alignItems: 'flex-end' },
  clubPointsValue: { fontFamily: fonts.jakartaBold, fontSize: 17, color: colors.mustard },

  guestPanel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
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

  menuGroup: { gap: 10 },
  section: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface },
  groupHint: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash },
  destinationList: {
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  destination: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
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
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  logout: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLow,
  },
  logoutLabel: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.error },
});