import { Button, Card, EmptyState, ErrorState, Spinner, StatusBadge, defaultTheme } from '@fastfood/ui-native';
import { Link, Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { formatApiError, getApiClient } from '../lib/api';
import { deliveriesResponseSchema } from '../lib/schemas';
import type { deliverySchema } from '../lib/schemas';
import { getCourierSession } from '../lib/session';
import { statusLabel, toneForStatus } from '../lib/status';

type Delivery = z.infer<typeof deliverySchema>;

const SHORT_ORDER_REF_LENGTH = 8;

/** Only deliveries that have reached a terminal outcome belong in history. */
const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED']);

/**
 * Completed history — GET /api/v1/courier/deliveries, filtered client-side to
 * the terminal statuses, exactly as the web courier surface does.
 *
 * Re-fetched on focus so returning from a delivery reflects its new status.
 */
export default function HistoryScreen() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const [rows, setRows] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getCourierSession()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getApiClient().request({
        method: 'GET',
        path: '/courier/deliveries',
        schema: deliveriesResponseSchema,
      });
      setRows(res.data.filter((d) => TERMINAL_STATUSES.has(d.status)));
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!getCourierSession()) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tamamlananlar</Text>
      <Text style={styles.subtitle}>Yalnızca sana atanmış teslimat kayıtları.</Text>

      {loading ? <Spinner theme={theme} /> : null}

      {error ? (
        <View style={styles.block}>
          <ErrorState title="Geçmiş yüklenemedi" description={error} theme={theme} />
          <Button theme={theme} variant="secondary" onPress={() => void load()}>
            Yeniden dene
          </Button>
        </View>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="Henüz tamamlanmış sefer yok"
          description="Tamamladığın teslimatlar bu listede görünür."
          theme={theme}
        />
      ) : null}

      {rows.map((d) => (
        <Link key={d.id} href={`/deliveries/${d.id}`} asChild>
          <Pressable accessibilityRole="button">
            <Card
              title={d.recipientName ?? 'Alıcı bilgisi yok'}
              subtitle={d.addressLine ?? 'Adres bilgisi mevcut değil'}
              theme={theme}
              footer={
                <StatusBadge tone={toneForStatus(d.status)} theme={theme}>
                  {statusLabel(d.status)}
                </StatusBadge>
              }
            >
              <Text style={styles.body}>
                #{d.orderId.slice(-SHORT_ORDER_REF_LENGTH).toUpperCase()} ·{' '}
                {new Date(d.deliveredAt ?? d.updatedAt).toLocaleDateString('tr-TR')}
              </Text>
            </Card>
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
    body: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textPrimary },
    block: { gap: theme.space[3] },
  });
}