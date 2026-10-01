import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StackHeader } from '../../components/stack-header';
import { EmptyBlock, ErrorBlock, LoadingBlock, SecondaryButton } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchCatalogAllergens, fetchPublishedContent } from '../../lib/content';
import { allergenDisclaimer } from '../../lib/content-map';
import type { CatalogAllergen, StorefrontContent } from '../../lib/schemas';
import { colors, fonts, radius, space } from '../../theme';

export default function AllergenGuideRoute() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogAllergen[]>([]);
  const [disclaimer, setDisclaimer] = useState<StorefrontContent | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    void (async () => {
      try {
        const [rows, docs] = await Promise.all([fetchCatalogAllergens(), fetchPublishedContent().catch(() => [])]);
        setItems(rows);
        setDisclaimer(allergenDisclaimer(docs));
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      <StackHeader title="Alerjenler" />
      {status === 'loading' ? <LoadingBlock label="Alerjen sözlüğü yükleniyor…" /> : null}
      {status === 'error' ? (
        <View style={styles.padded}>
          <ErrorBlock title="Sözlük yüklenemedi" message={error ?? ''} onRetry={load} />
        </View>
      ) : null}
      {status === 'ready' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.lede}>
            Bu liste tıbbi tavsiye değildir. Ürün kartındaki alerjen adları aynı sözlükten gelir.
          </Text>
          {disclaimer ? (
            <View style={styles.card}>
              <Text style={styles.title}>{disclaimer.title}</Text>
              <Text style={styles.body}>{disclaimer.body}</Text>
            </View>
          ) : null}
          {items.length === 0 ? (
            <EmptyBlock title="Alerjen kaydı yok" message="Katalog sözlüğü boş." />
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.card} accessibilityLabel={item.name}>
                <Text style={styles.name}>{item.name}</Text>
                {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
              </View>
            ))
          )}
          <SecondaryButton label="Yasal metinler" onPress={() => router.push('/legal')} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  lede: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  title: { fontFamily: fonts.jakartaBold, fontSize: 16, color: colors.onSurface, textTransform: 'uppercase' },
  name: { fontFamily: fonts.jakartaBold, fontSize: 14, color: colors.onSurface, textTransform: 'uppercase' },
  body: { fontFamily: fonts.jakarta, fontSize: 14, color: colors.ash, lineHeight: 20 },
});
