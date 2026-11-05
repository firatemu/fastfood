import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '../../components/product-card';
import { ScrollToTopFab, useScrollToTop } from '../../components/scroll-to-top';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { haptic } from '../../lib/haptics';
import { fetchStorefrontHome } from '../../lib/home';
import type { StorefrontHome } from '../../lib/schemas';
import { colors, fonts, hitSlop, minTouch, radius, space } from '../../theme';

const POPULAR_TAGS = [
  { label: 'Classic Burger', query: 'Classic' },
  { label: 'Cheese Burger', query: 'Cheese' },
  { label: 'Spicy Hotdog', query: 'Hotdog' },
  { label: 'Crispy Chicken', query: 'Chicken' },
  { label: 'Patates', query: 'Patates' },
];

export default function SearchRoute() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const top = useScrollToTop();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [home, setHome] = useState<StorefrontHome | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

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
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Lezzet Ara</Text>
          {debounced ? (
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeText}>{products.length} sonuç</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.field, isFocused && styles.fieldFocused]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isFocused ? colors.mustard : colors.onSurfaceVariant}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Burger, sos veya lezzet ara..."
            placeholderTextColor={colors.ash}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxLength={80}
            style={styles.input}
            accessibilityLabel="Menü araması"
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aramayı temizle"
              onPress={() => {
                haptic.light();
                setQuery('');
              }}
              hitSlop={hitSlop}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>

        {/* Popular query chips */}
        <View style={styles.popularWrap}>
          <Text style={styles.popularLabel}>Popüler:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularList}
          >
            {POPULAR_TAGS.map((tag) => (
              <Pressable
                key={tag.query}
                accessibilityRole="button"
                onPress={() => {
                  haptic.light();
                  setQuery(tag.query);
                }}
                style={({ pressed }) => [
                  styles.tagPill,
                  query === tag.query && styles.tagPillActive,
                  pressed && styles.tagPillPressed,
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    query === tag.query && styles.tagTextActive,
                  ]}
                >
                  {tag.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {status === 'loading' && !home ? (
        <View style={styles.padded}>
          <LoadingBlock label="Katalog aranıyor…" />
        </View>
      ) : status === 'error' && !home ? (
        <View style={styles.padded}>
          <ErrorBlock
            title="Arama Hatası"
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
            title={debounced ? 'Sonuç Bulunamadı' : 'Menü Boş'}
            message={
              debounced
                ? `“${debounced}” ile eşleşen bir burger veya lezzet bulamadık. Başka bir arama terimi deneyin.`
                : 'Şu an listelenecek ürün yok.'
            }
            icon="magnify-remove-outline"
            actionLabel={debounced ? 'Aramayı Temizle' : undefined}
            onAction={debounced ? () => setQuery('') : undefined}
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          onScroll={top.onScroll}
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
      <ScrollToTopFab visible={top.visible} scrollRef={scrollRef} bottom={insets.bottom + 88} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.md,
    gap: space.sm,
    backgroundColor: 'rgba(15, 16, 20, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.anton,
    fontSize: 28,
    color: colors.mustard,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultBadge: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  resultBadgeText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurface,
  },
  field: {
    minHeight: minTouch + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineBright,
  },
  fieldFocused: {
    borderColor: colors.mustard,
    backgroundColor: colors.surfaceHigh,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.jakarta,
    fontSize: 14,
    paddingVertical: 10,
  },
  popularWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  popularLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  popularList: {
    gap: 6,
    paddingVertical: 2,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tagPillActive: {
    backgroundColor: colors.mustard,
    borderColor: colors.mustardGlow,
  },
  tagPillPressed: {
    transform: [{ scale: 0.95 }],
  },
  tagText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurface,
  },
  tagTextActive: {
    color: colors.onMustard,
  },
  padded: { padding: space.gutter, marginTop: space.md },
  grid: {
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    paddingBottom: space.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: { width: '47%', flexGrow: 1, maxWidth: '48.5%' },
});