import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock } from '../../components/ui';
import { fetchCustomerPreferences, patchCustomerPreferences } from '../../lib/account';
import { formatApiError } from '../../lib/api';
import {
  preferencePatchFromToggles,
  preferenceToToggles,
  type PreferenceToggles,
} from '../../lib/preference-map';
import type { CustomerPreference } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

/**
 * Preferences.
 *
 * Mirrors the Web preference ledger: grouped sections, one action per row, and
 * a record section for the things the customer cannot change here. Same
 * information architecture as Web, native controls.
 */
export default function AccountSettingsRoute() {
  return (
    <View style={styles.root}>
      <StackHeader title="Tercihler" />
      <RequireCustomer next="/account/settings">
        <SettingsBody />
      </RequireCustomer>
    </View>
  );
}

function SettingsBody() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pref, setPref] = useState<CustomerPreference | null>(null);
  const [toggles, setToggles] = useState<PreferenceToggles | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    void fetchCustomerPreferences()
      .then((next) => {
        setPref(next);
        setToggles(preferenceToToggles(next));
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(formatApiError(err));
        setStatus('error');
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onToggle(key: keyof PreferenceToggles, value: boolean) {
    if (!pref || !toggles || savingKey) return;
    const next = { ...toggles, [key]: value };
    const patch = preferencePatchFromToggles(next, pref);
    if (!patch) return;
    setSavingKey(key);
    setToggles(next);
    setSaved(false);
    try {
      const stored = await patchCustomerPreferences(patch);
      setPref(stored);
      setToggles(preferenceToToggles(stored));
      setSaved(true);
      setError(null);
    } catch (err) {
      // Snap back to the server's state rather than leaving the toggle showing
      // something the backend refused.
      setToggles(preferenceToToggles(pref));
      setError(formatApiError(err));
    } finally {
      setSavingKey(null);
    }
  }

  if (status === 'loading' || !toggles) {
    return <LoadingBlock label="Tercihler yükleniyor…" />;
  }
  if (status === 'error') {
    return <ErrorBlock title="Tercihler yüklenemedi" message={error ?? ''} onRetry={load} />;
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.margin, paddingBottom: insets.bottom + 24, gap: 12 }}
    >
      <Text style={styles.lead}>
        Bu tercihler hesabına yazılır ve cihazların arasında taşınır.
      </Text>

      <Section title="Bildirim" hint="Siparişin durumunu nasıl öğrenirsin?">
        <ToggleRow
          label="Sipariş bildirimleri"
          hint="Hazırlanma, yola çıkma ve teslim durumundaki değişiklikler."
          value={toggles.orderUpdatesOptIn}
          disabled={savingKey !== null}
          onValueChange={(value) => void onToggle('orderUpdatesOptIn', value)}
        />
      </Section>

      <Section title="İletişim" hint="Sipariş dışında sana ulaşmamızı isteyip istemediğin.">
        <ToggleRow
          label="Pazarlama iletişimi"
          hint="Kampanya ve yeni ürün duyuruları."
          value={toggles.marketingOptIn}
          disabled={savingKey !== null}
          onValueChange={(value) => void onToggle('marketingOptIn', value)}
        />
        <ToggleRow
          label="Ember Kulübü e-postası"
          hint="Üyelik puanı ve ayrıcalık duyuruları."
          value={toggles.newsletterOptIn}
          disabled={savingKey !== null}
          onValueChange={(value) => void onToggle('newsletterOptIn', value)}
        />
      </Section>

      <Section title="Kayıt" hint="Hesabının değiştiremeyeceğin kayıtları.">
        <View style={styles.factRow}>
          <Text style={styles.factLabel}>KVKK onayı</Text>
          <Text style={styles.hint}>{formatDate(pref?.kvkkAcceptedAt)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          onPress={() => router.push('/account/security')}
        >
          <View style={styles.linkCopy}>
            <Text style={styles.label}>E-posta doğrulama ve şifre</Text>
            <Text style={styles.hint}>Doğrulama durumun ve parolan Güvenlik sayfasında.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.outline} />
        </Pressable>
      </Section>

      {saved ? <Text style={styles.ok}>Tercihler kaydedildi.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function Section(props: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{props.title}</Text>
        <Text style={styles.hint}>{props.hint}</Text>
      </View>
      <View style={styles.sectionBody}>{props.children}</View>
    </View>
  );
}

function ToggleRow(props: {
  label: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{props.label}</Text>
        <Text style={styles.hint}>{props.hint}</Text>
      </View>
      <Switch
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
        trackColor={{ false: colors.surfaceHighest, true: colors.ok }}
        thumbColor={props.value ? colors.onSurface : colors.ash}
      />
    </View>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Kayıtlı değil';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  lead: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash, lineHeight: 20 },
  section: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  sectionHead: {
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  sectionTitle: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.onSurface },
  sectionBody: { backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  factLabel: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.onSurface },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: colors.surfaceHigh },
  copy: { flex: 1, minWidth: 0 },
  linkCopy: { flex: 1, minWidth: 0 },
  label: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.onSurface },
  hint: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash, marginTop: 4, lineHeight: 17 },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
  ok: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ok },
});