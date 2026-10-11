import {
  Button,
  Card,
  ErrorState,
  Input,
  Spinner,
  StatusBadge,
  Stepper,
  defaultTheme,
} from '@fastfood/ui-native';
import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { formatApiError, getApiClient } from '../../lib/api';
import {
  deliveryResponseSchema,
  locationResponseSchema,
  navigationResponseSchema,
  type deliverySchema,
} from '../../lib/schemas';
import { getCourierSession } from '../../lib/session';
import {
  LIFECYCLE_STEP_LABELS,
  lifecycleStepIndex,
  nextActionFor,
  statusLabel,
  toneForStatus,
} from '../../lib/status';

type Delivery = z.infer<typeof deliverySchema>;

/**
 * Delivery detail.
 *
 * Only the single transition that is legal from the current status is offered
 * (`lib/status.ts`), matching the web courier surface. Rendering every action at
 * once would let a courier post `deliver` straight from `ASSIGNED` and skip the
 * pickup step; the server rejects it, but the UI must not invite it.
 */
export default function DeliveryDetailScreen() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await getApiClient().request({
          method: 'GET',
          path: `/courier/deliveries/${encodeURIComponent(id)}`,
          schema: deliveryResponseSchema,
        });
        if (cancelled) return;
        setDelivery(res.data);
        if (res.data.latitude != null) setLat(String(res.data.latitude));
        if (res.data.longitude != null) setLng(String(res.data.longitude));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  if (!getCourierSession()) {
    return <Redirect href="/login" />;
  }

  const action = delivery ? nextActionFor(delivery.status) : undefined;
  const lastAssignment = delivery?.assignments
    .filter((a) => a.courierId === delivery.courierId)
    .at(-1);

  async function transition(path: string, successLabel: string) {
    if (!id) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await getApiClient().request({
        method: 'POST',
        path: `/courier/deliveries/${encodeURIComponent(id)}/${path}`,
        body: {},
        schema: deliveryResponseSchema,
      });
      setDelivery(res.data);
      setNotice(successLabel);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function openMaps() {
    if (!id || !delivery) return;
    setBusy(true);
    setError(null);
    try {
      let url = delivery.navigationUrl;
      if (!url) {
        const res = await getApiClient().request({
          method: 'GET',
          path: `/courier/deliveries/${encodeURIComponent(id)}/navigation`,
          schema: navigationResponseSchema,
        });
        url = res.data.url;
      }
      await Linking.openURL(url);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function callRecipient() {
    if (!delivery?.recipientPhone) return;
    const phone = delivery.recipientPhone.trim();
    await Linking.openURL(`tel:${phone}`);
  }

  async function postLocation() {
    if (!id) return;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Enlem ve boylam sayısal olmalı.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await getApiClient().request({
        method: 'POST',
        path: `/courier/deliveries/${encodeURIComponent(id)}/location`,
        body: { latitude, longitude, accuracyM: 12 },
        schema: locationResponseSchema,
      });
      setNotice('Konum gönderildi.');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = delivery ? lifecycleStepIndex(delivery.status) : -1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Link href="/deliveries" asChild>
        <Pressable accessibilityRole="button">
          <Text style={styles.back}>← Teslimatlar</Text>
        </Pressable>
      </Link>

      {loading ? <Spinner theme={theme} /> : null}

      {error ? (
        <View style={styles.block}>
          <ErrorState title="Hata" description={error} theme={theme} />
          <Button theme={theme} variant="secondary" onPress={retry}>
            Yeniden dene
          </Button>
        </View>
      ) : null}
      {notice ? <Text style={styles.ok}>{notice}</Text> : null}

      {delivery ? (
        <>
          <Card
            title={delivery.recipientName ?? 'Alıcı bilgisi yok'}
            subtitle={delivery.addressLine ?? 'Adres bilgisi mevcut değil'}
            theme={theme}
            footer={
              <StatusBadge tone={toneForStatus(delivery.status)} theme={theme}>
                {statusLabel(delivery.status)}
              </StatusBadge>
            }
          >
            <Text style={styles.body}>Sipariş referansı: {delivery.orderId}</Text>
            {delivery.deliveryNote ? (
              <Text style={styles.note}>Teslimat notu: {delivery.deliveryNote}</Text>
            ) : null}
            {lastAssignment ? (
              <Text style={styles.body}>
                Sana atanma zamanı: {new Date(lastAssignment.createdAt).toLocaleString('tr-TR')}
              </Text>
            ) : null}
          </Card>

          <Card title="Teslimat akışı" subtitle="Durum adımları" theme={theme}>
            <Stepper
              steps={[...LIFECYCLE_STEP_LABELS]}
              current={stepIndex}
              theme={theme}
            />
            {action ? (
              <View style={styles.actionBlock}>
                <Button
                  theme={theme}
                  variant="primary"
                  loading={busy}
                  onPress={() => void transition(action.path, action.successLabel)}
                >
                  {action.label}
                </Button>
              </View>
            ) : null}
            {delivery.status === 'DELIVERED' ? (
              <Text style={styles.ok}>Bu teslimat başarıyla tamamlandı.</Text>
            ) : null}
            {delivery.status === 'CANCELLED' ? (
              <Text style={styles.bad}>Bu teslimat iptal edilmiş.</Text>
            ) : null}
            {delivery.status === 'UNASSIGNED' ? (
              <Text style={styles.body}>Bu teslimat henüz sana atanmadı.</Text>
            ) : null}
            <Text style={styles.hint}>
              Durum geçişleri sunucu tarafında doğrulanır ve işlem geçmişine kaydedilir.
            </Text>
          </Card>

          <Card title="İletişim" theme={theme}>
            <View style={styles.actions}>
              {delivery.recipientPhone ? (
                <Button
                  theme={theme}
                  variant="secondary"
                  onPress={() => void callRecipient()}
                  accessibilityLabel={`Alıcıyı ara: ${delivery.recipientPhone}`}
                >
                  Alıcıyı ara
                </Button>
              ) : null}
              <Button theme={theme} variant="secondary" loading={busy} onPress={() => void openMaps()}>
                Haritada aç
              </Button>
            </View>
          </Card>

          <Card title="Konum gönder" subtitle="Teslimat sırasında konumun raporlanır" theme={theme}>
            <View style={styles.form}>
              <Input
                theme={theme}
                label="Enlem"
                value={lat}
                onChangeText={setLat}
                keyboardType="numeric"
              />
              <Input
                theme={theme}
                label="Boylam"
                value={lng}
                onChangeText={setLng}
                keyboardType="numeric"
              />
              <Button theme={theme} variant="save" loading={busy} onPress={() => void postLocation()}>
                Konumu gönder
              </Button>
            </View>
          </Card>
        </>
      ) : null}

      {!loading && !delivery && !error ? (
        <Text style={styles.body}>Teslimat bulunamadı.</Text>
      ) : null}
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
    back: { color: theme.tokens.actionPrimaryBackground, fontWeight: '600' },
    body: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textPrimary },
    note: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textSecondary },
    hint: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    actions: { gap: theme.space[2] },
    actionBlock: { marginTop: theme.space[4] },
    form: { gap: theme.space[3] },
    block: { gap: theme.space[3] },
    ok: { color: theme.color.semantic.success[700], fontSize: theme.fontSize.sm.size },
    bad: { color: theme.color.semantic.danger[700], fontSize: theme.fontSize.sm.size },
  });
}