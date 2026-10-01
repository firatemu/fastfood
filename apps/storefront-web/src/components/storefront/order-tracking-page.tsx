'use client';

import { ApiError } from '@fastfood/api-client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { notifyCartChanged } from '../../lib/cart-events';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { fetchFavorites, type Favorite } from '../../lib/storefront/favorites';
import {
  fetchOrderTracking,
  reorderOrder,
  type OrderTracking,
  type ReorderResult,
} from '../../lib/storefront/orders';
import { formatStorefrontDateTime, trackingMapView } from '../../lib/storefront/tracking-map';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { FavoritesSection } from './favorites-section';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

function stageIcon(key: string): string {
  if (key === 'received') return 'check_circle';
  if (key === 'grilling') return 'local_fire_department';
  if (key === 'courier' || key === 'ready') return 'two_wheeler';
  return 'home';
}

export function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params.orderId;
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unauthorized'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reorder, setReorder] = useState<ReorderResult | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const view = await fetchOrderTracking(orderId);
      setOrder(view);
      setStatus('ready');
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.envelope.error.code === 'AUTH_UNAUTHENTICATED')) {
        setStatus('unauthorized');
        return;
      }
      if (err instanceof ApiError && (err.status === 404 || err.envelope.error.code === 'NOT_FOUND')) {
        setStatus('unauthorized');
        return;
      }
      setError(errorMessage(err));
      setStatus('error');
    }
  }, [orderId]);

  useDeferredLoad(() => {
    void load();
    if (isCustomerAuthenticated()) {
      void fetchFavorites().then(setFavorites).catch(() => undefined);
    }
  }, [load]);

  useEffect(() => {
    if (!order?.trackingActive || !order.pollIntervalMs) return;
    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      void load();
    };
    const id = window.setInterval(tick, order.pollIntervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [order?.trackingActive, order?.pollIntervalMs, load]);

  async function onReorder() {
    if (!orderId || reorderBusy) return;
    setReorderBusy(true);
    try {
      const result = await reorderOrder(orderId);
      setReorder(result);
      if (result.status === 'success') {
        notifyCartChanged();
        router.push('/cart');
      } else if (result.restoredCount > 0) {
        notifyCartChanged();
      }
    } catch (err) {
      setReorder({
        status: 'unavailable',
        cartId: null,
        restoredCount: 0,
        reviewCount: 0,
        unavailableCount: 0,
        items: [
          {
            productId: '',
            productName: '',
            quantity: 0,
            outcome: 'product_unavailable',
            historicalUnitPriceMinor: '0',
            currentUnitPriceMinor: null,
            message: errorMessage(err),
          },
        ],
      });
    } finally {
      setReorderBusy(false);
    }
  }

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'unauthorized') {
    return (
      <main className="w-full pt-20 min-h-screen bg-background px-margin-sm py-space-lg" data-ff-surface="tracking">
        <p className="font-body-md text-on-surface-variant">Sipariş bulunamadı veya erişim yok.</p>
        <Link href="/orders" className="font-label-lg uppercase text-secondary-container mt-4 inline-block">
          Siparişlerime dön
        </Link>
      </main>
    );
  }
  if (status === 'error' || !order) {
    return (
      <main className="w-full pt-20 min-h-screen bg-background" data-ff-surface="tracking">
        <ShopError title="Takip" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
      </main>
    );
  }

  const negative = order.trackerKind === 'cancelled' || order.trackerKind === 'rejected' || order.trackerKind === 'failed';
  const pickup = order.fulfillmentMode === 'PICKUP';
  const map = pickup
    ? { state: 'no-location' as const, url: null }
    : trackingMapView({
        courier: order.location,
        destination: order.destination,
      });
  const locationState = !order.courier
    ? 'courier-pending'
    : !order.location
      ? 'no-location'
      : order.location.freshness;

  return (
    <main className="w-full pt-20 bg-background min-h-screen" data-ff-surface="tracking" data-ff-tracker-kind={order.trackerKind}>
      <div className="max-w-7xl mx-auto w-full px-margin-sm lg:px-margin py-space-lg flex flex-col gap-space-xl">
        <section className="w-full bg-surface-container rounded-xl p-space-md lg:p-space-lg relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-space-lg relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex flex-wrap items-center gap-space-sm min-w-0">
                <div className="px-space-sm py-1 rounded-lg bg-surface-container-high flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${order.trackingActive ? 'bg-primary-container animate-ping' : 'bg-outline'}`} />
                  <span className="font-label-sm uppercase text-primary">
                    {negative ? order.statusLabel : order.trackingActive ? 'Canlı Takip' : order.statusLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-headline-sm">{order.displayNumber}</span>
                  {order.branch ? (
                    <span className="font-body-sm text-on-surface-variant truncate">| {order.branch.name}</span>
                  ) : null}
                </div>
              </div>
              {order.eta.remainingMinutes != null ? (
                <div className="flex items-center gap-2 bg-surface-container-lowest px-space-md py-1.5 rounded-lg" data-ff-eta>
                  <MaterialIcon name="timer" className="text-primary-container text-base" />
                  <div className="flex flex-col">
                    <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">
                      {pickup ? 'Tahmini hazır' : 'Tahmini varış'}
                    </span>
                    <span className="font-label-md text-primary-container leading-none">
                      {order.eta.remainingMinutes === 0
                        ? 'Tamamlandı'
                        : `${order.eta.remainingMinutes} dk`}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {negative ? (
              <div className="rounded-xl bg-error-container/30 p-space-md" data-ff-negative-status>
                <p className="font-headline-sm text-error uppercase">{order.statusLabel}</p>
                <p className="font-body-sm text-on-surface-variant mt-1">
                  {order.timeline.find((event) => event.customerReason)?.customerReason ??
                    'Sipariş tamamlanamadı. Destek için hesap sayfasındaki iletişim kanallarını kullanın.'}
                </p>
                <p className="font-body-sm text-on-surface-variant mt-1">
                  {formatStorefrontDateTime(order.createdAt)}
                </p>
              </div>
            ) : (
              <div className="w-full bg-surface-container-low p-space-md rounded-xl" data-ff-stepper>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {order.stages.map((stage) => {
                    const active = stage.state === 'active';
                    const done = stage.state === 'done';
                    return (
                      <div
                        key={stage.key}
                        className={stage.state === 'pending' ? 'opacity-60' : ''}
                        data-ff-step={stage.index}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={
                              active
                                ? 'w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center animate-pulse'
                                : done
                                  ? 'w-8 h-8 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center'
                                  : 'w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center'
                            }
                          >
                            <MaterialIcon name={stageIcon(stage.key)} className="text-lg" />
                          </div>
                          {stage.index < 3 ? (
                            <div
                              className={`h-1 flex-1 rounded-full hidden lg:block ${done ? 'bg-primary-container' : 'bg-surface-container-highest'}`}
                            />
                          ) : null}
                        </div>
                        <p className={`font-label-md uppercase mt-2 ${active ? 'text-primary' : 'text-on-surface'}`}>
                          {stage.index + 1}. {stage.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pickup ? (
              <div className="rounded-xl bg-surface-container-low p-space-md" data-ff-pickup>
                <p className="font-label-sm uppercase text-on-surface-variant">Gel al</p>
                <p className="font-headline-sm mt-1">{order.branch?.name ?? 'Şube'}</p>
                <p className="font-body-sm text-on-surface-variant break-words">{order.branch?.addressLine}</p>
                {order.scheduledFor ? (
                  <p className="font-body-sm mt-2">Planlanan: {formatStorefrontDateTime(order.scheduledFor)}</p>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
                <div className="lg:col-span-4 bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-md" data-ff-courier>
                  <span className="font-label-sm uppercase text-on-surface-variant">Görevli kurye</span>
                  {order.courier ? (
                    <>
                      <p className="font-headline-sm">{order.courier.displayName}</p>
                      <p className="font-body-sm text-on-surface-variant">
                        {locationState === 'stale'
                          ? 'Konum gecikmeli — son kayıt gösteriliyor'
                          : locationState === 'current'
                            ? 'Canlı konum'
                            : 'Konum henüz yok'}
                      </p>
                    </>
                  ) : (
                    <p className="font-body-md text-on-surface-variant">Kurye henüz atanmadı.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={order.id ? `/account/support?orderId=${order.id}` : '/account/support'}
                      className="h-10 rounded-lg bg-surface-container-high font-label-sm uppercase flex items-center justify-center"
                      data-ff-support-entry="tracking"
                    >
                      Mesaj
                    </Link>
                    <button
                      type="button"
                      disabled
                      className="h-10 rounded-lg bg-surface-container-high font-label-sm uppercase text-on-surface-variant"
                      title="Maskeli arama yok"
                    >
                      Ara yok
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-8 bg-surface-container-low rounded-xl overflow-hidden min-h-[220px] relative" data-ff-map data-ff-map-state={map.state}>
                  {map.url ? (
                    <iframe
                      title="Sipariş haritası"
                      src={map.url}
                      className="absolute inset-0 w-full h-full border-0 grayscale-[20%]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-space-md text-center">
                      <p className="font-body-sm text-on-surface-variant">
                        {map.state === 'provider-unavailable'
                          ? 'Harita sağlayıcısı şu an kullanılamıyor.'
                          : order.location?.freshness === 'stale'
                            ? 'Konum gecikmeli; harita güncellenene kadar bekleniyor.'
                            : order.courier
                              ? 'Konum geçici olarak yok.'
                              : 'Harita kurye atanınca açılır.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-surface-container p-space-md flex flex-col gap-3">
          <h2 className="font-headline-sm uppercase">Sipariş</h2>
          <ul className="flex flex-col gap-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 font-body-sm">
                <span className="truncate">
                  {item.quantity}× {item.productName}
                </span>
                <span>{formatTryMinor(item.lineGrossMinor, order.currency)}</span>
              </li>
            ))}
          </ul>
          <p className="font-headline-sm text-secondary-container">
            Toplam {formatTryMinor(order.finalPayableMinor, order.currency)}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void onReorder()}
              disabled={reorderBusy}
              className="flex-1 py-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase"
              data-ff-reorder
            >
              {reorderBusy ? 'Kontrol ediliyor…' : 'Tekrar sipariş'}
            </button>
            <Link
              href="/orders"
              className="flex-1 py-3 rounded-lg bg-surface-container-high font-label-lg uppercase text-center"
            >
              Geçmiş
            </Link>
          </div>
          {reorder && reorder.status !== 'success' ? (
            <div className="rounded-lg bg-surface-container-high p-space-sm" data-ff-reorder-result>
              <p className="font-label-lg uppercase">
                {reorder.status === 'partial' ? 'Kısmen eklendi' : 'Tekrar sipariş yapılamadı'}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {reorder.items.map((item, index) => (
                  <li key={`${item.productId}-${index}`} className="font-body-sm">
                    {item.productName || 'Kalem'}: {item.message}
                  </li>
                ))}
              </ul>
              {reorder.restoredCount > 0 ? (
                <Link href="/cart" className="inline-block mt-2 font-label-sm uppercase text-secondary-container">
                  Sepete git
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        {isCustomerAuthenticated() ? (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-headline-sm uppercase">Favoriler</h2>
              <Link href="/account/favorites" className="font-label-sm uppercase text-secondary-container">
                Tümü
              </Link>
            </div>
            <FavoritesSection favorites={favorites.slice(0, 4)} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
