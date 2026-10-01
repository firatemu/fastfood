import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { LoadingBlock } from '../../components/ui';
import { isCheckoutSessionId, parsePaymentReturnUrl } from '../../lib/deep-link';
import { rememberCheckoutSessionId } from '../../lib/payment-session';
import { colors } from '../../theme';

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Provider return. Query flags such as `status=PAID` are ignored.
 * Only a UUID checkout id is forwarded to the status screen.
 */
export default function PaymentReturnRoute() {
  const params = useLocalSearchParams<{ checkoutId?: string; checkoutSessionId?: string }>();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    function commit(id: string | null | undefined) {
      if (!isCheckoutSessionId(id)) return false;
      rememberCheckoutSessionId(id);
      setHref(`/payment/${id}`);
      return true;
    }

    if (commit(firstString(params.checkoutId) ?? firstString(params.checkoutSessionId))) {
      return;
    }

    let cancelled = false;
    void Linking.getInitialURL().then((url) => {
      if (cancelled || !url) return;
      commit(parsePaymentReturnUrl(url).checkoutId);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      commit(parsePaymentReturnUrl(url).checkoutId);
    });
    const fallback = setTimeout(() => {
      if (!cancelled) setHref((current) => current ?? '/checkout');
    }, 400);
    return () => {
      cancelled = true;
      sub.remove();
      clearTimeout(fallback);
    };
  }, [params.checkoutId, params.checkoutSessionId]);

  if (!href) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <LoadingBlock label="Ödeme dönüşü işleniyor…" />
      </View>
    );
  }
  return <Redirect href={href} />;
}
