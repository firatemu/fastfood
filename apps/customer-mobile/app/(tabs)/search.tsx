import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '../../components/product-card';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { fetchStorefrontHome } from '../../lib/home';
import type { StorefrontHome } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function SearchRoute() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [home, setHome] = useState<StorefrontHome | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim().slice(0, 80)), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const data = await fetchStorefrontHome({ q: debounced || undefined });
        if (!alive) return;
        setHome(data);
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [debounced, nonce]);

  const products = home?.products ?? [];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Menüde ara</Text>
        <View style={styles.field}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.outline} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Burger, sos veya yan"
            placeholderTextColor={colors.ash}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxLength={80}
            style={styles.input}
            accessibilityLabel="Menü araması"
          />
        </View>
        {debounced ? (
          <Text style={styles.hint}>
            “{debounced}” — {products.length} sonuç
          </Text>
        ) : (
          <Text style={styles.hint}>Sonuçlar canlı katalogdandır.</Text>
        )}
      </View>

      {status === 'loading' && !home ? (
        <View style={styles.padded}>
          <LoadingBlock label="Katalog aranıyor…" />
        </View>
      ) : status === 'error' && !home ? (
        <View style={styles.padded}>
          <ErrorBlock
            title="Arama"
            message={error ?? 'Katalog yanıt vermedi.'}
            onRetry={() => {
              setStatus('loading');
              setNonce((n) => n + 1);
            }}
          />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.padded}>
          <EmptyBlock
            title={debounced ? 'Sonuç yok' : 'Menü boş'}
            message={
              debounced
                ? `“${debounced}” için eşleşen ürün bulunamadı.`
                : 'Şu an listelenecek ürün yok.'
            }
          />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.grid}
        >
          {products.map((product) => (
            <View key={product.id} style={styles.cell}>
              <ProductCard product={product} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.md,
    gap: space.sm,
    backgroundColor: colors.canvas,
  },
  title: {
    fontFamily: fonts.anton,
    fontSize: 32,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  field: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.jakarta,
    fontSize: 15,
    paddingVertical: 10,
  },
  hint: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.ash,
  },
  padded: { padding: space.gutter },
  grid: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: { width: '47%', flexGrow: 1, maxWidth: '48.5%' },
});
