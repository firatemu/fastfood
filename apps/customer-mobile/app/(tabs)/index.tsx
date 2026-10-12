import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '../../components/app-header';
import { CategoryChips } from '../../components/category-chips';
import { ComboCard } from '../../components/combo-card';
import { HomeHeroSlider } from '../../components/home-hero-slider';
import { HomeReviews } from '../../components/home-reviews';
import { ProductCard } from '../../components/product-card';
import { ScrollToTopFab, useScrollToTop } from '../../components/scroll-to-top';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { addComboItemsToCart, addProductToCart } from '../../lib/cart';
import { reconcileCategoryRail } from '../../lib/category-rail';
import { fetchStorefrontHome } from '../../lib/home';
import { formatDeliveryWindow } from '../../lib/money';
import type { StorefrontHome } from '../../lib/schemas';
import { colors, fonts, radius, space } from '../../theme';

/**
 * Child index of `<CategoryChips>` inside the home ScrollView. The two
 * conditional blocks above it are wrapped in Views that always render, because
 * `React.Children.toArray` drops nulls and would otherwise renumber this.
 */
const CATEGORY_HEADER_INDEX = 3;

export default function HomeRoute() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const top = useScrollToTop();
  const [home, setHome] = useState<StorefrontHome | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  // The filtered `/storefront/home` response only carries the selected
  // category, so the rail is kept from the unfiltered responses instead.
  const [rail, setRail] = useState<StorefrontHome['categories'] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const data = await fetchStorefrontHome({
          categoryId: categoryId ?? undefined,
        });
        if (!alive) return;
        setHome(data);
        setRail((current) => reconcileCategoryRail(current, data.categories, categoryId !== null));
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
  }, [categoryId, nonce]);

  const addProduct = useCallback(
    async (productId: string) => {
      const product =
        home?.products.find((item) => item.id === productId) ??
        home?.heroSlides?.find((item) => item.id === productId) ??
        (home?.hero?.id === productId ? home.hero : undefined);
      if (!product) return;
      setBusyId(productId);
      try {
        await addProductToCart({
          productId: product.id,
          unitPriceMinorSnapshot: product.basePriceMinor,
          currencySnapshot: product.currency,
        });
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setBusyId(null);
      }
    },
    [home],
  );

  const addCombo = useCallback(async () => {
    if (!home?.combo) return;
    setBusyId(home.combo.id);
    try {
      await addComboItemsToCart(home.combo.items, home.products);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  }, [home]);

  const locationLabel = home?.branch
    ? home.branch.addressLine || home.branch.name
    : 'Teslimat adresi seçilmedi';
  const eta =
    home?.branch
      ? formatDeliveryWindow(
          home.branch.estimatedDeliveryMinutesMin,
          home.branch.estimatedDeliveryMinutesMax,
        )
      : null;

  return (
    <View style={styles.screen}>
      <AppHeader locationLabel={locationLabel} kitchenLiveCount={home?.kitchenLiveCount} />
      {status === 'loading' && !home ? (
        <View style={[styles.padded, { paddingTop: insets.top + 88 }]}>
          <LoadingBlock label="Menü yükleniyor…" />
        </View>
      ) : status === 'error' && !home ? (
        <View style={[styles.padded, { paddingTop: insets.top + 88 }]}>
          <ErrorBlock
            title="Menü alınamadı"
            message={error ?? 'Katalog yanıt vermedi.'}
            onRetry={() => {
              setStatus('loading');
              setNonce((n) => n + 1);
            }}
          />
        </View>
      ) : !home ? (
        <View style={[styles.padded, { paddingTop: insets.top + 88 }]}>
          <EmptyBlock title="Menü boş" message="Şu an listelenecek ürün yok." />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          onScroll={top.onScroll}
          style={{ paddingTop: insets.top + 88 }}
          contentContainerStyle={styles.scroll}
          stickyHeaderIndices={[CATEGORY_HEADER_INDEX]}
        >
          {/* The top inset lives on the ScrollView itself, not on its content
              container: AppHeader is an absolute overlay, so a sticky header
              pinned to the content's top edge would sit behind it. Padding the
              scroll container moves that sticky edge down, under the header. */}
          {/* Both conditional blocks below are wrapped in a View that always
              renders. ScrollView runs its children through
              `React.Children.toArray`, which drops `null` — so a bare
              `{cond ? … : null}` sibling would renumber every index after it and
              silently retarget `CATEGORY_HEADER_INDEX` at a different row. */}
          <View>
            {error ? (
              <View style={styles.gutter}>
                <ErrorBlock
                  title="İşlem tamamlanamadı"
                  message={error}
                  onRetry={() => {
                    setError(null);
                    setNonce((n) => n + 1);
                  }}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.gutter}>
            <View style={styles.banner}>
              <View style={styles.bannerIcon}>
                <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.mustard} />
              </View>
              <View style={styles.bannerCopy}>
                <View style={styles.bannerLiveRow}>
                  <Text style={styles.bannerLive}>Açık Alev Izgara</Text>
                  <View style={styles.pip} />
                </View>
                <Text style={styles.bannerMeta} numberOfLines={1}>
                  {home.branch ? home.branch.name : 'Şube seçilmedi'}
                  {eta ? ` · ${eta}` : ''}
                  {home.branch?.isAcceptingOrders === false ? ' · Sipariş kapalı' : ''}
                </Text>
              </View>
              {home.kitchenLiveCount > 0 ? (
                <View style={styles.minBadge}>
                  <Text style={styles.minLabel}>Izgara</Text>
                  <Text style={styles.minValue}>{home.kitchenLiveCount} sipariş</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View>
            {(home.heroSlides?.length ?? 0) > 0 || home.hero ? (
              <View style={styles.gutter}>
                <HomeHeroSlider
                  key={
                    home.heroSlides?.length
                      ? home.heroSlides.map((slide) => slide.id).join(',')
                      : (home.hero?.id ?? 'empty-vitrine')
                  }
                  products={home.heroSlides?.length ? home.heroSlides : home.hero ? [home.hero] : []}
                  busyId={busyId}
                  onAdd={(productId) => void addProduct(productId)}
                  transitionDurationSeconds={home.heroSliderSettings?.transitionDurationSeconds ?? 5}
                  loop={home.heroSliderSettings?.loop ?? true}
                />
              </View>
            ) : null}
          </View>

          <CategoryChips
            categories={rail ?? home.categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />

          <View style={styles.gutter}>
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionTitle}>Orijinal Smash Menü</Text>
                <Text style={styles.sectionSub}>Çıtır dantel kenarlar, tereyağlı brioche ekmeği</Text>
              </View>
              <Text style={styles.popular}>Popüler</Text>
            </View>
          </View>

          <View style={styles.gutter}>
            {home.products.length === 0 ? (
              <EmptyBlock title="Bu kategoride ürün yok" message="Başka bir kategori deneyin." />
            ) : (
              <View style={styles.grid}>
                {home.products.map((product) => (
                  <View key={product.id} style={styles.cell}>
                    <ProductCard product={product} />
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.gutter}>
            {home.combo ? (
              <ComboCard
                combo={home.combo}
                busy={busyId === home.combo.id}
                onAdd={() => void addCombo()}
              />
            ) : (
              <View style={styles.comboEmpty}>
                <Text style={styles.sectionSub}>Aktif kombo fırsatı yok.</Text>
              </View>
            )}
          </View>

          <View style={[styles.gutter, styles.craft]}>
            <CraftCell icon="grill" title="%100 Dana" subtitle="Taze kıyım döş eti" />
            <CraftCell icon="bread-slice" title="Günlük Ekmek" subtitle="Fransız brioche" />
            <CraftCell icon="timer-outline" title="Sıcak & Hızlı" subtitle="Termo-kutu servis" />
          </View>

          <HomeReviews
            reviews={home.reviews}
            averageRatingBps={home.socialProof.averageRatingBps}
            reviewCount={home.socialProof.reviewCount}
          />
        </ScrollView>
      )}
      <ScrollToTopFab
        visible={top.visible}
        scrollRef={scrollRef}
        bottom={insets.bottom + 88}
      />
    </View>
  );
}

function CraftCell(props: {
  icon: 'grill' | 'bread-slice' | 'timer-outline';
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.craftCell}>
      <MaterialCommunityIcons name={props.icon} size={22} color={colors.mustard} />
      <Text style={styles.craftTitle}>{props.title}</Text>
      <Text style={styles.craftSub}>{props.subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: space.gutter },
  scroll: { paddingBottom: space.xl, gap: space.md },
  gutter: { paddingHorizontal: space.gutter },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.lg,
    padding: space.sm,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCopy: { flex: 1, minWidth: 0 },
  bannerLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerLive: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.mustard,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.flameDeep,
  },
  bannerMeta: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.onSurface,
    marginTop: 2,
  },
  minBadge: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    alignItems: 'flex-end',
  },
  minLabel: {
    fontFamily: fonts.jakartaBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  minValue: {
    fontFamily: fonts.jakartaBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  sectionTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  sectionSub: {
    fontFamily: fonts.jakarta,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  popular: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.mustard,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1, maxWidth: '48.5%' },
  comboEmpty: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.lg,
    padding: space.md,
  },
  craft: { flexDirection: 'row', gap: space.sm },
  craftCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.sm,
    alignItems: 'center',
    gap: 4,
  },
  craftTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 11,
    color: colors.onSurface,
    textAlign: 'center',
  },
  craftSub: {
    fontFamily: fonts.jakarta,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
