import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock } from '../../components/ui';
import { fetchCustomerPreferences, patchCustomerPreferences } from '../../lib/account';
import { formatApiError } from '../../lib/api';
import { preferencePatchFromToggles, preferenceToToggles, type PreferenceToggles } from '../../lib/preference-map';
import type { CustomerPreference } from '../../lib/schemas';
import { colors, fonts, space } from '../../theme';

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
  const [pref, setPref] = useState<CustomerPreference | null>(null);
  const [toggles, setToggles] = useState<PreferenceToggles | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
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
    try {
      const saved = await patchCustomerPreferences(patch);
      setPref(saved);
      setToggles(preferenceToToggles(saved));
      setError(null);
    } catch (err) {
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
    <ScrollView contentContainerStyle={{ padding: space.margin, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <Text style={styles.lead}>
        Bu tercihler hesabına yazılır. Bülten kaydı sessizce açılmaz; buradaki anahtar gerçek `/me/preferences`
        alanıdır.
      </Text>
      <ToggleRow
        label="Sipariş güncellemeleri"
        hint="Hazırlık ve kurye bildirimleri"
        value={toggles.orderUpdatesOptIn}
        disabled={savingKey !== null}
        onValueChange={(value) => void onToggle('orderUpdatesOptIn', value)}
      />
      <ToggleRow
        label="Pazarlama iletileri"
        hint="Kampanya SMS / e-posta"
        value={toggles.marketingOptIn}
        disabled={savingKey !== null}
        onValueChange={(value) => void onToggle('marketingOptIn', value)}
      />
      <ToggleRow
        label="Bülten"
        hint="BURGER HOME e-posta bülteni"
        value={toggles.newsletterOptIn}
        disabled={savingKey !== null}
        onValueChange={(value) => void onToggle('newsletterOptIn', value)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
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
        trackColor={{ false: colors.surfaceHighest, true: colors.mustardPressed }}
        thumbColor={props.value ? colors.mustard : colors.ash}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  lead: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.ash, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  copy: { flex: 1 },
  label: { fontFamily: fonts.jakartaSemibold, fontSize: 15, color: colors.onSurface },
  hint: { fontFamily: fonts.jakarta, fontSize: 12, color: colors.ash, marginTop: 4 },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
});
