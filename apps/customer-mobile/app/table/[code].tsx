import { ApiError } from '@fastfood/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock, MustardButton, SecondaryButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { writeDiningContext } from '../../lib/dining-context';
import { scanDiningTable } from '../../lib/engagement';
import type { DiningTable } from '../../lib/schemas';
import { parseTableCode } from '../../lib/table-code';
import { colors, fonts, radius, space } from '../../theme';

export default function TableCodeRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string }>();
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = parseTableCode(raw);
  const [table, setTable] = useState<DiningTable | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'invalid'>(code ? 'loading' : 'invalid');
  const [error, setError] = useState<string | null>(code ? null : 'Kod geçersiz.');

  useEffect(() => {
    if (!code) return;
    let alive = true;
    void (async () => {
      try {
        const next = await scanDiningTable(code);
        if (!alive) return;
        await writeDiningContext(next);
        setTable(next);
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError && (err.status === 404 || err.envelope.error.code === 'NOT_FOUND')) {
          setStatus('invalid');
          setError('Masa kodu geçersiz veya kullanılamıyor.');
          return;
        }
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <View style={styles.screen}>
      <StackHeader title="Masa" />
      {status === 'loading' ? <LoadingBlock label="Masa doğrulanıyor…" /> : null}
      {status === 'invalid' ? (
        <View style={styles.padded}>
          <ErrorBlock title="Masa bulunamadı" message={error ?? 'Kod geçersiz.'} />
          <SecondaryButton label="Kodu yeniden gir" onPress={() => router.replace('/table')} />
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={styles.padded}>
          <ErrorBlock title="Masa doğrulanamadı" message={error ?? ''} onRetry={() => router.replace(`/table/${code ?? ''}`)} />
        </View>
      ) : null}
      {status === 'ready' && table ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.kicker}>{table.branchName}</Text>
            <Text style={styles.title}>{table.label}</Text>
            <Text style={styles.body}>Kod: {table.publicCode}</Text>
            {!table.isActive ? <Text style={styles.warn}>Bu masa şu an aktif değil.</Text> : null}
            <Text style={styles.body}>
              Bu bağlam giriş yapmaz. Sipariş teslimat veya gel-al olarak kalır; masa içi sipariş yok.
            </Text>
            <MustardButton label="Menüye dön" onPress={() => router.replace('/')} />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter, gap: 12 },
  scroll: { padding: space.gutter },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  kicker: { fontFamily: fonts.jakartaBold, fontSize: 11, color: colors.mustard, textTransform: 'uppercase' },
  title: { fontFamily: fonts.anton, fontSize: 32, color: colors.onSurface, textTransform: 'uppercase' },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  warn: { fontFamily: fonts.jakartaBold, fontSize: 13, color: colors.error },
});
