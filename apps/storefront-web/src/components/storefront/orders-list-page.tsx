'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { notifyCartChanged } from '../../lib/cart-events';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { fetchMyOrders, reorderOrder, type CustomerOrder } from '../../lib/storefront/orders';
import { formatStorefrontDateTime } from '../../lib/storefront/tracking-map';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { ShopError, ShopSkeleton } from './shop-states';

function statusClass(kind: string | undefined): string {
  if (kind === 'cancelled' || kind === 'rejected' || kind === 'failed') return 'text-error';
  if (kind === 'completed') return 'text-secondary-container';
  return 'text-primary-container';
}

export function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reorderBusyId, setReorderBusyId] = useState<string | null>(null);
  const [reorderNote, setReorderNote] = useState<string | null>(null);

  async function load() {
    try {
      setOrders(await fetchMyOrders());
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, []);

  async function onReorder(orderId: string) {
    if (reorderBusyId) return;
    setReorderBusyId(orderId);
    setReorderNote(null);
    try {
      const result = await reorderOrder(orderId);
      if (result.status === 'success') {
        notifyCartChanged();
        router.push('/cart');
        return;
      }
      if (result.restoredCount > 0) {
        notifyCartChanged();
        setReorderNote('Bazı ürünler güncel menüye göre eklendi. Sepeti kontrol edin.');
        router.push('/cart');
        return;
      }
      setReorderNote(result.items[0]?.message ?? 'Tekrar sipariş yapılamadı.');
    } catch (err) {
      setReorderNote(errorMessage(err));
    } finally {
      setReorderBusyId(null);
    }
  }

  if (status === 'loading') {
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  }
  if (status === 'error') {
    return <ShopError title="Siparişler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  const active = orders.filter((order) => order.trackerKind === 'progress');

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="orders">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 min-w-0">
            <h1 className="font-headline-md uppercase mb-4">Siparişlerim</h1>
            {reorderNote ? <p className="font-body-sm text-on-surface-variant mb-3">{reorderNote}</p> : null}
            {orders.length === 0 ? (
              <p className="font-body-md text-on-surface-variant" data-ff-orders-empty>
                Sipariş geçmişi boş.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {orders.map((order) => (
                  <li key={order.id} className="rounded-xl bg-surface-container p-space-md min-w-0">
                    <div className="flex flex-col gap-2" data-ff-order-row>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-headline-sm uppercase">
                          {order.displayNumber ?? order.id.slice(-6)}
                        </span>
                        <span className={`font-label-sm uppercase ${statusClass(order.trackerKind)}`}>
                          {order.statusLabel ?? order.status}
                        </span>
                      </div>
                      <p className="font-body-sm text-on-surface-variant">
                        {order.createdAt ? formatStorefrontDateTime(order.createdAt) : ''}
                        {order.branch?.name ? ` · ${order.branch.name}` : ''}
                        {order.fulfillmentMode === 'PICKUP' ? ' · Gel al' : ' · Teslimat'}
                      </p>
                      {order.itemSummary ? (
                        <p className="font-body-md truncate">{order.itemSummary}</p>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-label-lg">
                          {order.finalPayableMinor
                            ? formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')
                            : ''}
                        </span>
                        <div className="flex gap-2">
                          <Link
                            href={`/orders/${order.id}`}
                            className="px-3 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-label-sm uppercase"
                          >
                            {active.some((item) => item.id === order.id) ? 'Takip et' : 'Detay'}
                          </Link>
                          {order.reorderAvailable !== false ? (
                            <button
                              type="button"
                              onClick={() => void onReorder(order.id)}
                              disabled={reorderBusyId === order.id}
                              className="px-3 py-2 rounded-lg bg-surface-container-high font-label-sm uppercase"
                              data-ff-reorder
                            >
                              {reorderBusyId === order.id ? 'Kontrol…' : 'Tekrar'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
