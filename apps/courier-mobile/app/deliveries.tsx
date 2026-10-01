import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Spinner,
  StatusBadge,
  defaultTheme,
  type StatusTone,
} from '@fastfood/ui-native';
import { Link, Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { formatApiError, getApiClient } from '../lib/api';
import { deliveriesResponseSchema, type deliverySchema } from '../lib/schemas';
import { clearCourierSession, getCourierSession, subscribeSession } from '../lib/session';

type Delivery = z.infer<typeof deliverySchema>;

function toneForStatus(status: string): StatusTone {
  const s = status.toUpperCase();
  if (s === 'DELIVERED') return 'completed';
  if (s === 'CANCELLED') return 'cancelled';
  if (s === 'ON_THE_WAY' || s === 'PICKED_UP') return 'in_progress';
  if (s === 'ASSIGNED') return 'ready';
  return 'pending';
}

/**
 * Active deliveries — GET /api/v1/courier/deliveries.
 */
export default function DeliveriesScreen() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const [authed, setAuthed] = useState(() => Boolean(getCourierSession()));
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => subscribeSession(() => setAuthed(Boolean(getCourierSession()))), []);

  useEffect(() => {
    if (!getCourierSession()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await getApiClient().request({
          method: 'GET',
          path: '/courier/deliveries',
          schema: deliveriesResponseSchema,
        });
        if (cancelled) return;
        setItems(res.data);
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
  }, [reloadKey, authed]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  if (!authed) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Teslimatlar</Text>
      <Text style={styles.subtitle}>GET /api/v1/courier/deliveries</Text>

      <View style={styles.nav}>
        <Link href="/claim" asChild>
          <Pressable style={styles.navLink}>
            <Text style={styles.navText}>QR claim</Text>
          </Pressable>
        </Link>
        <Button
          theme={theme}
          size="sm"
          variant="secondary"
          onPress={() => {
            clearCourierSession();
            router.replace('/login');
          }}
        >
          Çıkış
        </Button>
      </View>

      {loading ? <Spinner theme={theme} /> : null}
      {error ? (
        <View style={styles.block}>
          <ErrorState title="Liste yüklenemedi" description={error} theme={theme} />
          <Button theme={theme} variant="secondary" onPress={retry}>
            Yeniden dene
          </Button>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Aktif teslimat yok"
          description="QR ile claim edin veya atama bekleyin."
          theme={theme}
        />
      ) : null}

      {items.map((d) => (
        <Link key={d.id} href={`/deliveries/${d.id}`} asChild>
          <Pressable>
            <Card
              title={d.addressLine ?? `Sipariş ${d.orderId.slice(0, 8)}…`}
              subtitle={d.recipientName ?? d.id}
              theme={theme}
              footer={
                <StatusBadge tone={toneForStatus(d.status)} theme={theme}>
                  {d.status}
                </StatusBadge>
              }
            />
          </Pressable>
        </Link>
      ))}
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
    title: {
      fontSize: theme.fontSize.lg.size,
      fontWeight: '700',
      color: theme.tokens.textPrimary,
    },
    subtitle: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textSecondary },
    nav: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2], alignItems: 'center' },
    navLink: {
      paddingVertical: theme.space[2],
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.md,
      backgroundColor: theme.tokens.surfaceCard,
      borderWidth: 1,
      borderColor: theme.color.neutral[200],
    },
    navText: { color: theme.tokens.textPrimary, fontWeight: '600' },
    block: { gap: theme.space[3] },
  });
}
