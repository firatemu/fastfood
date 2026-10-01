'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { fetchOrderConfirmation } from '../../lib/storefront/checkout';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

export function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Awaited<ReturnType<typeof fetchOrderConfirmation>> | null>(null);
  const [nonce, setNonce] = useState(0);

  useDeferredLoad(() => {
    if (!orderId) return;
    void (async () => {
      try {
        const data = await fetchOrderConfirmation(orderId);
        setOrder(data);
        setStatus('ready');
      } catch (err) {
        setError(errorMessage(err));
        setStatus('error');
      }
    })();
  }, [orderId, nonce]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error' || !order) {
    return (
      <ShopError
        title="Sipariş bulunamadı"
        message={error ?? 'Onay bilgisi yüklenemedi.'}
        onRetry={() => setNonce((n) => n + 1)}
      />
    );
  }

  const fulfillment = order.fulfillmentMode === 'PICKUP' ? 'Gel-al' : 'Adrese teslimat';
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="order-confirmation">
      <div className="max-w-2xl mx-auto px-margin-sm py-space-xl flex flex-col gap-space-lg">
        <div className="rounded-xl bg-surface-container p-space-lg flex flex-col gap-space-md">
          <div className="flex items-center gap-2 text-secondary-container">
            <MaterialIcon name="check_circle" filled />
            <span className="font-label-md uppercase">Sipariş alındı</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg uppercase">Afiyet olsun</h1>
          <p className="font-body-md text-on-surface-variant">
            Sipariş no <span className="text-on-surface font-semibold">{shortId}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <div className="p-space-sm rounded-lg bg-surface-container-low">
              <span className="font-label-sm uppercase text-on-surface-variant">Teslimat</span>
              <p className="font-headline-sm text-on-surface">{fulfillment}</p>
            </div>
            <div className="p-space-sm rounded-lg bg-surface-container-low">
              <span className="font-label-sm uppercase text-on-surface-variant">Şube</span>
              <p className="font-headline-sm text-on-surface">{order.branch?.name ?? '—'}</p>
            </div>
          </div>
          {order.branch?.addressLine ? (
            <p className="font-body-sm text-on-surface-variant break-words">{order.branch.addressLine}</p>
          ) : null}
          {order.scheduledFor ? (
            <p className="font-body-sm">Planlanan saat: {new Date(order.scheduledFor).toLocaleString('tr-TR')}</p>
          ) : order.branch?.etaMinutesMin !== undefined ? (
            <p className="font-body-sm text-primary-container">
              Tahmini {order.branch.etaMinutesMin}-{order.branch.etaMinutesMax} dk
            </p>
          ) : null}
          <div className="flex items-baseline justify-between border-t border-surface-bright/30 pt-space-sm">
            <span className="font-headline-md uppercase">Toplam</span>
            <span className="font-headline-lg text-secondary-container">
              {formatTryMinor(order.finalPayableMinor, order.currency)}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <Link
              href={`/orders/${order.id}`}
              className="flex-1 text-center py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
            >
              Siparişi takip et
            </Link>
            <Link
              href="/"
              className="flex-1 text-center py-3 rounded-lg bg-surface-container-high font-label-lg uppercase"
            >
              Menüye dön
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
