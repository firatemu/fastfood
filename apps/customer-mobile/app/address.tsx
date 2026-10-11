import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../components/form-field';
import { StackHeader } from '../components/stack-header';
import { ErrorBlock, MustardButton, PageTitle, StatusTag } from '../components/ui';
import { formatApiError } from '../lib/api';
import { checkDeliveryServiceability } from '../lib/checkout';
import {
  DEFAULT_DELIVERY_LOCATION,
  getDeliveryLocation,
  type DeliveryLocation,
} from '../lib/delivery-location';
import { useCustomerSession } from '../lib/use-session';
import { colors, fonts, radius, space } from '../theme';

/**
 * Teslimat bölgesi (serviceability).
 *
 * Mirrors the Web `/address` page one-for-one: same title, same sentence about
 * addresses being set at checkout, same label/latitude/longitude inputs, same
 * verdict wording. Mobile previously had `checkDeliveryServiceability()` in its
 * lib but no screen for it, so the check was reachable only from checkout.
 *
 * Not wrapped in RequireCustomer: Web does not require a session here either,
 * and gating it would block exactly the visitor who most needs to find out
 * whether delivery even reaches them.
 */
export default function AddressServiceabilityRoute(): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useCustomerSession();

  const initial = getDeliveryLocation();
  const [label, setLabel] = useState(initial.label || DEFAULT_DELIVERY_LOCATION.label);
  const [lat, setLat] = useState(String(initial.latitude ?? DEFAULT_DELIVERY_LOCATION.latitude));
  const [lng, setLng] = useState(String(initial.longitude ?? DEFAULT_DELIVERY_LOCATION.longitude));
  const [result, setResult] = useState<DeliveryLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Enlem ve boylam sayı olmalı.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResult(await checkDeliveryServiceability(latitude, longitude, label));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }, [label, lat, lng]);

  // Web checks the stored location on arrival; do the same so the screen opens
  // with a verdict instead of an empty box. Runs once per mount.
  useEffect(() => {
    const stored = getDeliveryLocation();
    void checkDeliveryServiceability(stored.latitude, stored.longitude, stored.label)
      .then(setResult)
      .catch(() => setError(null));
  }, []);

  return (
    <View style={styles.root}>
      <StackHeader title="Teslimat bölgesi" />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <PageTitle>Teslimat bölgesi</PageTitle>
        <Text style={styles.lede}>
          Adres kaydı checkout ve hesap adreslerinde yapılır. Bu ekran yalnızca mevcut
          konumun servis alanına düşüp düşmediğini kontrol eder.
        </Text>

        <View style={styles.card}>
          <FormField label="Etiket" value={label} onChangeText={setLabel} />
          <View style={styles.pair}>
            <View style={styles.half}>
              <FormField
                label="Enlem"
                value={lat}
                onChangeText={setLat}
                keyboardType="numbers-and-punctuation"
                placeholder="41.0360"
              />
            </View>
            <View style={styles.half}>
              <FormField
                label="Boylam"
                value={lng}
                onChangeText={setLng}
                keyboardType="numbers-and-punctuation"
                placeholder="28.9850"
              />
            </View>
          </View>

          <MustardButton
            label={busy ? 'Kontrol ediliyor…' : 'Bölgeyi kontrol et'}
            loading={busy}
            onPress={() => void check()}
          />

          {error ? (
            <View style={styles.verdict}>
              <ErrorBlock title="Kontrol edilemedi" message={error} onRetry={() => void check()} />
            </View>
          ) : null}

          {result && !error ? (
            <View style={styles.verdict} accessibilityRole="summary">
              <View style={styles.verdictRow}>
                <MaterialCommunityIcons
                  name={result.serviceable ? 'check-circle' : 'alert-circle'}
                  size={20}
                  color={result.serviceable ? colors.ok : colors.danger}
                />
                <Text style={[styles.verdictText, { color: result.serviceable ? colors.ok : colors.danger }]}>
                  {result.serviceable
                    ? 'Bu konum teslimat alanındadır.'
                    : 'Bu konum şu an servis dışıdır.'}
                </Text>
              </View>
              {result.branchId ? (
                <StatusTag label={result.branchId} tone="info" />
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.links}>
          <MustardButton label="Checkout" onPress={() => router.push('/checkout')} />
          {session ? (
            <MustardButton label="Kayıtlı adresler" onPress={() => router.push('/account/addresses')} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  body: { padding: space.margin, gap: space.md },
  lede: { fontFamily: fonts.jakarta, fontSize: 14, lineHeight: 21, color: colors.onSurfaceVariant },
  card: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pair: { flexDirection: 'row', gap: space.sm },
  half: { flex: 1 },
  verdict: { marginTop: space.xs, gap: space.sm },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  verdictText: { fontFamily: fonts.jakarta, fontSize: 14, lineHeight: 20, flex: 1 },
  links: { gap: space.sm },
});