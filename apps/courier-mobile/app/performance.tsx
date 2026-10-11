import { Button, Card, ErrorState, Spinner, defaultTheme } from '@fastfood/ui-native';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApiError, getApiClient } from '../lib/api';
import { performanceResponseSchema } from '../lib/schemas';
import { getCourierSession } from '../lib/session';

/**
 * Courier performance — GET /api/v1/courier/me/performance.
 *
 * The API exposes delivery counts only (completed / active / assigned); there
 * is no rating or earnings field, so nothing is derived client-side.
 */
export default function PerformanceScreen() {
  const theme = defaultTheme('operations');
  const styles = createStyles(theme);
  const [stats, setStats] = useState<{ deliveredCount: number; activeCount: number; assignedCount: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(() => Boolean(getCourierSession()));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // No session means the screen is about to redirect; there is nothing to
    // fetch and nothing to render, so the effect returns without touching
    // state (a synchronous setState here would cascade a second render).
    if (!getCourierSession()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await getApiClient().request({
          method: 'GET',
          path: '/courier/me/performance',
          schema: performanceResponseSchema,
        });
        if (cancelled) return;
        setStats({
          deliveredCount: res.data.deliveredCount,
          activeCount: res.data.activeCount,
          assignedCount: res.data.assignedCount,
        });
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
  }, [reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (!getCourierSession()) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Performansın</Text>
      <Text style={styles.subtitle}>Kurye hesabına bağlı teslimat toplamları.</Text>

      {loading ? <Spinner theme={theme} /> : null}

      {error ? (
        <View style={styles.block}>
          <ErrorState title="Performans yüklenemedi" description={error} theme={theme} />
          <Button theme={theme} variant="secondary" onPress={retry}>
            Yeniden dene
          </Button>
        </View>
      ) : null}

      {stats ? (
        <View style={styles.metrics}>
          <Card title="Tamamlanan teslimat" theme={theme}>
            <Text style={styles.metric}>{pad(stats.deliveredCount)}</Text>
            <Text style={styles.caption}>Başarıyla sonuçlandı</Text>
          </Card>
          <Card title="Aktif sefer" theme={theme}>
            <Text style={styles.metric}>{pad(stats.activeCount)}</Text>
            <Text style={styles.caption}>Şu anda devam ediyor</Text>
          </Card>
          <Card title="Atanan" theme={theme}>
            <Text style={styles.metric}>{pad(stats.assignedCount)}</Text>
            <Text style={styles.caption}>Üzerindeki aktif atama</Text>
          </Card>
        </View>
      ) : null}

      {stats ? (
        <Text style={styles.note}>
          Bu değerler backend’de senin kurye kaydına bağlı teslimat ilişkilerinden hesaplanır.
        </Text>
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
    title: {
      fontSize: theme.fontSize.lg.size,
      fontWeight: '700',
      color: theme.tokens.textPrimary,
    },
    subtitle: { fontSize: theme.fontSize.sm.size, color: theme.tokens.textSecondary },
    metrics: { gap: theme.space[3] },
    metric: {
      fontSize: theme.fontSize.xl.size,
      fontWeight: '700',
      color: theme.tokens.textPrimary,
    },
    caption: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    note: { fontSize: theme.fontSize.xs.size, color: theme.tokens.textSecondary },
    block: { gap: theme.space[3] },
  });
}