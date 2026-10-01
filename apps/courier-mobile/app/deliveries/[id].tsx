import {
  Button,
  Card,
  ErrorState,
  Input,
  Spinner,
  StatusBadge,
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

type Delivery = z.infer<typeof deliverySchema>;

/**
 * Delivery detail — pickup / on-the-way / deliver, Maps deep link, location post.
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
  const [lat, setLat] = useState('41.0369');
  const [lng, setLng] = useState('28.9847');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await getApiClient().request({
          method: 'GET',
          path: `/courier/deliveries/${id}`,
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

  async function runAction(path: string, label: string) {
    if (!id) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await getApiClient().request({
        method: 'POST',
        path,
        schema: deliveryResponseSchema,
      });
      setDelivery(res.data);
      setNotice(`${label} tamamlandı.`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function openMaps() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      let url = delivery?.navigationUrl;
      if (!url) {
        const res = await getApiClient().request({
          method: 'GET',
          path: `/courier/deliveries/${id}/navigation`,
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

  async function postLocation() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await getApiClient().request({
        method: 'POST',
        path: `/courier/deliveries/${id}/location`,
        body: {
          latitude: Number(lat),
          longitude: Number(lng),
          accuracyM: 12,
        },
        schema: locationResponseSchema,
      });
      setNotice('Konum gönderildi.');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Link href="/deliveries" asChild>
        <Pressable>
          <Text style={styles.back}>← Teslimatlar</Text>
        </Pressable>
      </Link>
      <Text style={styles.title}>Teslimat detayı</Text>

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
        <Card
          title={delivery.addressLine ?? delivery.id}
          subtitle={delivery.recipientName ?? delivery.recipientPhone ?? undefined}
          theme={theme}
          footer={
            <StatusBadge tone="in_progress" theme={theme}>
              {delivery.status}
            </StatusBadge>
          }
        >
          <Text style={styles.body}>Sipariş: {delivery.orderId}</Text>
          <Text style={styles.body}>Not: {delivery.deliveryNote ?? '—'}</Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          theme={theme}
          variant="primary"
          loading={busy}
          onPress={() => void runAction(`/courier/deliveries/${id}/pickup`, 'Pickup')}
        >
          Pickup
        </Button>
        <Button
          theme={theme}
          variant="secondary"
          loading={busy}
          onPress={() => void runAction(`/courier/deliveries/${id}/on-the-way`, 'Yolda')}
        >
          Yolda
        </Button>
        <Button
          theme={theme}
          variant="save"
          loading={busy}
          onPress={() => void runAction(`/courier/deliveries/${id}/deliver`, 'Teslim')}
        >
          Teslim et
        </Button>
        <Button theme={theme} variant="secondary" loading={busy} onPress={() => void openMaps()}>
          Haritada aç
        </Button>
      </View>

      <Card title="Konum gönder" subtitle="POST …/location" theme={theme}>
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
          <Button
            theme={theme}
            variant="primary"
            loading={busy}
            onPress={() => void postLocation()}
          >
            Konumu gönder
          </Button>
        </View>
      </Card>
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
    title: {
      fontSize: theme.fontSize.lg.size,
      fontWeight: '700',
      color: theme.tokens.textPrimary,
    },
    body: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textPrimary },
    actions: { gap: theme.space[2] },
    form: { gap: theme.space[3] },
    block: { gap: theme.space[3] },
    ok: { color: theme.color.semantic.success[700], fontSize: theme.fontSize.sm.size },
  });
}
