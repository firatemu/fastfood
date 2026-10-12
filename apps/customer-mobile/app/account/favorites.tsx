import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RequireCustomer } from '../../components/require-customer';
import { StackHeader } from '../../components/stack-header';
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  MustardButton,
  SecondaryButton,
} from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { favoriteAvailability } from '../../lib/engagement-map';
import { fetchFavorites, removeFavorite } from '../../lib/favorites';
import { formatTryMinor } from '../../lib/money';
import { cacheFavorites } from '../../lib/private-cache';
import type { Favorite } from '../../lib/schemas';
import { colors, fonts, minTouch, radius, space } from '../../theme';

export default function AccountFavoritesRoute() {
  return (
    <View style={styles.screen}>
      <StackHeader title="Favoriler" />
      <RequireCustomer next="/account/favorites">
        <FavoritesBody />
      </RequireCustomer>
    </View>
  );
}

function FavoritesBody() {
  const router = useRouter();
  const [items, setItems] = useState<Favorite[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    void fetchFavorites()
      .then((next) => {
        setItems(next);
        cacheFavorites(next);
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

  async function onRemove(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await removeFavorite(id);
      const next = items.filter((item) => item.id !== id);
      setItems(next);
      cacheFavorites(next);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (status === 'loading') return <LoadingBlock label="Favoriler yükleniyor…" />;
  if (status === 'error') {
    return <ErrorBlock title="Favoriler yüklenemedi" message={error ?? ''} onRetry={load} />;
  }
  if (items.length === 0) {
    return (
      <View style={styles.padded}>
        <EmptyBlock
          title="Henüz favori yok"
          message="Menüde bir ürünü beğendiğinde kalp ikonuyla buraya ekleyebilirsin."
        />
        <MustardButton label="Menüye git" onPress={() => router.push('/')} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.map((item) => {
        const availability = favoriteAvailability(item.product);
        const product = item.product;
        const blocked = availability !== 'available';
        return (
          <View key={item.id} style={styles.card}>
            {product?.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]} />
            )}
            <View style={styles.copy}>
              <Text style={styles.name}>{product?.name ?? 'Ürün artık yok'}</Text>
              {product && availability === 'available' ? (
                <Text style={styles.price}>
                  {formatTryMinor(product.basePriceMinor, product.currency)}
                </Text>
              ) : (
                <Text style={styles.unavailable}>
                  {availability === 'missing' ? 'Katalogda yok' : 'Şu an siparişe kapalı'}
                </Text>
              )}
              <View style={styles.row}>
                {!blocked && product ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push(`/products/${product.slug || item.productId}`)
                    }
                    style={styles.link}
                  >
                    <Text style={styles.linkLabel}>Ürüne git</Text>
                  </Pressable>
                ) : null}
                <SecondaryButton
                  label={busyId === item.id ? 'Kaldırılıyor…' : 'Favoriden çıkar'}
                  onPress={() => void onRemove(item.id)}
                />
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter, gap: space.md },
  scroll: { padding: space.gutter, gap: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  thumbFallback: { backgroundColor: colors.surfaceHighest },
  copy: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.jakartaBold, fontSize: 15, color: colors.onSurface },
  price: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.mustard },
  unavailable: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.error },
  row: { gap: 8, marginTop: 4 },
  link: { minHeight: minTouch / 2, justifyContent: 'center' },
  linkLabel: { fontFamily: fonts.jakartaBold, fontSize: 12, color: colors.mustard, textTransform: 'uppercase' },
  error: { fontFamily: fonts.jakarta, fontSize: 13, color: colors.error },
});
