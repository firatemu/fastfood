import { ApiError } from '@fastfood/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ProductConfigure } from '../../components/product-configure';
import { StackHeader } from '../../components/stack-header';
import { ErrorBlock, LoadingBlock } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { addConfiguredProductToCart, addProductToCart } from '../../lib/cart';
import { fetchProductDetail } from '../../lib/catalog';
import { favoriteForProduct } from '../../lib/engagement-map';
import { addFavorite, fetchFavorites, removeFavorite } from '../../lib/favorites';
import type { Favorite, ProductDetail } from '../../lib/schemas';
import { useCustomerSession } from '../../lib/use-session';
import { colors } from '../../theme';

export default function ProductDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'notfound'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [upsellBusyId, setUpsellBusyId] = useState<string | null>(null);
  const session = useCustomerSession();

  useEffect(() => {
    if (!id) return;
    let alive = true;
    void (async () => {
      try {
        const detail = await fetchProductDetail(id);
        if (!alive) return;
        setProduct(detail);
        setStatus('ready');
        setError(null);
        setFeedback(null);
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError && (err.status === 404 || err.envelope.error.code === 'NOT_FOUND')) {
          setStatus('notfound');
          return;
        }
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    void fetchFavorites()
      .then((next) => {
        if (alive) setFavorites(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [session, id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StackHeader title="Burger Detay" />
      {status === 'loading' && !product ? (
        <View style={{ padding: 16 }}>
          <LoadingBlock label="Ürün yükleniyor…" />
        </View>
      ) : status === 'notfound' ? (
        <View style={{ padding: 16 }}>
          <ErrorBlock title="Ürün yok" message="Bu burger artık vitrinde değil." />
        </View>
      ) : status === 'error' && !product ? (
        <View style={{ padding: 16 }}>
          <ErrorBlock
            title="Ürün alınamadı"
            message={error ?? 'Katalog yanıt vermedi.'}
            onRetry={() => {
              setStatus('loading');
              setNonce((n) => n + 1);
            }}
          />
        </View>
      ) : product ? (
        <ProductConfigure
          key={product.id}
          product={product}
          eyebrow="BURGER HOME ATÖLYESİ"
          ctaLabel="Sepete ekle"
          submitting={submitting}
          feedback={feedback}
          favorited={Boolean(
            session && id && favoriteForProduct(favorites, Array.isArray(id) ? id[0] : id),
          )}
          favoriteBusy={favoriteBusy}
          onToggleFavorite={() => {
            const productId = Array.isArray(id) ? id[0] : id;
            if (!productId || favoriteBusy) return;
            if (!session) {
              router.push({ pathname: '/auth', params: { next: `/products/${productId}` } });
              return;
            }
            const existing = favoriteForProduct(favorites, productId);
            setFavoriteBusy(true);
            void (async () => {
              try {
                if (existing) {
                  await removeFavorite(existing.id);
                  setFavorites((current) => current.filter((item) => item.id !== existing.id));
                } else {
                  const created = await addFavorite(productId);
                  setFavorites((current) => [...current, created]);
                }
              } catch (err) {
                setFeedback(formatApiError(err));
              } finally {
                setFavoriteBusy(false);
              }
            })();
          }}
          onAddRecommendation={(productId) => {
            if (submitting) return;
            const rec = product.recommendations?.find((item) => item.id === productId);
            if (!rec) return;
            setUpsellBusyId(productId);
            setFeedback(null);
            void (async () => {
              try {
                await addProductToCart({
                  productId: rec.id,
                  unitPriceMinorSnapshot: rec.basePriceMinor,
                  currencySnapshot: rec.currency,
                });
                setFeedback('Sepete eklendi');
                router.push('/cart');
              } catch (err) {
                setFeedback(formatApiError(err));
              } finally {
                setUpsellBusyId(null);
              }
            })();
          }}
          recommendationBusyId={upsellBusyId}
          onInspectProduct={(productId) => {
            if (productId === id) return;
            router.push(`/products/${productId}`);
          }}
          onAdd={(input) => {
            if (submitting) return;
            setSubmitting(true);
            setFeedback(null);
            void (async () => {
              try {
                await addConfiguredProductToCart({
                  productId: product.id,
                  quantity: input.quantity,
                  unitPriceMinorSnapshot: input.previewUnit,
                  currencySnapshot: product.currency,
                  productVariantId: input.variantId ?? undefined,
                  modifierGroups: product.modifierGroups,
                  selectedByGroup: input.selectedByGroup,
                  removalIngredientIds: input.removals,
                });
                setFeedback('Sepete eklendi');
                router.push('/cart');
              } catch (err) {
                setFeedback(formatApiError(err));
              } finally {
                setSubmitting(false);
              }
            })();
          }}
        />
      ) : null}
    </View>
  );
}
