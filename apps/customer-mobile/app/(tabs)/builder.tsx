import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { ProductConfigure } from '../../components/product-configure';
import { ErrorBlock, LoadingBlock } from '../../components/ui';
import { formatApiError } from '../../lib/api';
import { addConfiguredProductToCart } from '../../lib/cart';
import { fetchBuilderProduct } from '../../lib/catalog';
import type { ProductDetail } from '../../lib/schemas';
import { colors } from '../../theme';

export default function BuilderRoute() {
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(() => {
    void (async () => {
      try {
        const detail = await fetchBuilderProduct();
        setProduct(detail);
        setStatus('ready');
        setError(null);
      } catch (err) {
        setError(formatApiError(err));
        setStatus('error');
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load, nonce]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {status === 'loading' && !product ? (
        <View style={{ padding: 16, paddingTop: 56 }}>
          <LoadingBlock label="Özel burger yükleniyor…" />
        </View>
      ) : status === 'error' && !product ? (
        <View style={{ padding: 16, paddingTop: 56 }}>
          <ErrorBlock
            title="Oluşturucu yok"
            message={error ?? 'Özel burger ürünü tanımlı değil.'}
            onRetry={() => {
              setStatus('loading');
              setNonce((n) => n + 1);
            }}
          />
        </View>
      ) : product ? (
        <ProductConfigure
          key={`${product.id}-${nonce}`}
          product={product}
          eyebrow="ÖZEL YARAT"
          ctaLabel="Özel burgerı sepete ekle"
          submitting={submitting}
          feedback={feedback}
          bottomLift={80}
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
