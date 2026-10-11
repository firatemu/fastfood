'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { notifyCartChanged } from '../../lib/cart-events';
import { errorMessage } from '../../lib/load-state';
import { formatTryMinor } from '../../lib/money';
import { useSubmitLock } from '../../lib/storefront/account-hooks';
import { fetchMyOrders, reorderOrder, type CustomerOrder } from '../../lib/storefront/orders';
import { formatStorefrontDateTime } from '../../lib/storefront/tracking-map';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

/**
 * Order history.
 *
 * This is an account surface, not a storefront page: it needs a session, it
 * sits in the account menu, and it shows the customer's own records. It used to
 * be an old 12-column grid with the nav in a sidebar, which meant it rendered
 * in the storefront's warm palette while every sibling account screen used the
 * account tokens — the one page where the redesign was visible as a seam.
 *
 * Orders are records with numbers and dates, so the instrument is a table, not
 * a stack of cards. That also matches the "Son siparişler" table on
 * `/account`, so the two never disagree about how an order looks.
 */
const STATUS_TONES: Record<string, 'ok' | 'warn' | 'danger' | 'info'> = {
  delivered: 'ok',
  completed: 'ok',
  cancelled: 'danger',
  rejected: 'danger',
  failed: 'danger',
  preparing: 'info',
  accepted: 'info',
  pending: 'warn',
};

export function OrdersListPage() {
  const router = useRouter();
  const { toast } = useAccountUi();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reorderBusyId, setReorderBusyId] = useState<string | null>(null);
  const [reorderNote, setReorderNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await fetchMyOrders());
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }, []);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, []);

  const reorder = useSubmitLock(
    useCallback(async (orderId: string) => {
      if (reorderBusyId) return null;
      setReorderBusyId(orderId);
      setReorderNote(null);
      try {
        return await reorderOrder(orderId);
      } finally {
        setReorderBusyId(null);
      }
    }, [reorderBusyId]),
  );

  const onReorder = useCallback(
    async (order: CustomerOrder) => {
      try {
        const result = await reorder.run(order.id);
        if (!result) return;
        if (result.status === 'success') {
          notifyCartChanged();
          toast.ok('Sipariş yeniden sepete eklendi.', 'Sepete yönlendiriliyorsun.');
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
        const message = errorMessage(err);
        setReorderNote(message);
        toast.error('Tekrar sipariş yapılamadı.', message);
      }
    },
    [reorder, router, toast],
  );

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error') {
    return <ShopError title="Siparişler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  const trackingIds = new Set(orders.filter((o) => o.trackerKind === 'progress').map((o) => o.id));

  return (
    <AccountShell
      surface="orders"
      eyebrow="Sipariş"
      title="Siparişlerim"
      description="Geçmiş siparişlerin, durumları ve tutarları."
    >
      {reorderNote ? (
        <div className="ff-notice" data-tone="warn" role="status">
          <MaterialIcon name="info" />
          <span>{reorderNote}</span>
        </div>
      ) : null}

      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Sipariş geçmişi</h2>
          <p className="ff-section-desc">
            {orders.length === 0
              ? 'Henüz siparişin yok.'
              : `${orders.length} sipariş · ${trackingIds.size} tanesi yolda.`}
          </p>
        </div>
        <div className="ff-section-body">
          {orders.length === 0 ? (
            <div className="ff-empty">
              <MaterialIcon name="receipt_long" />
              <p className="ff-empty-title">Sipariş geçmişi boş</p>
              <p className="ff-empty-text">
                İlk siparişini verdiğinde sipariş numarası, durum ve tutar burada listelenir.
              </p>
              <Link href="/" className="ff-btn ff-btn-outline ff-btn-sm">
                Menüye git
              </Link>
            </div>
          ) : (
            <div className="ff-table-wrap">
              <div className="ff-table-scroll ff-scroll">
                <table className="ff-table">
                  <thead>
                    <tr>
                      <th scope="col">Sipariş</th>
                      <th scope="col">Tarih</th>
                      <th scope="col">Şube</th>
                      <th scope="col">Teslim</th>
                      <th scope="col">Durum</th>
                      <th scope="col" className="num">
                        Tutar
                      </th>
                      <th scope="col" className="col-actions">
                        <span className="ff-sr-only">İşlemler</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} data-ff-order-row>
                        <td>
                          <Link
                            href={`/orders/${order.id}`}
                            className="ff-row-label"
                            data-ff-order-number
                          >
                            #{order.displayNumber ?? order.id.slice(-6)}
                          </Link>
                          {order.itemSummary ? (
                            <div className="ff-row-hint">{order.itemSummary}</div>
                          ) : null}
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                          {order.createdAt ? formatStorefrontDateTime(order.createdAt) : '—'}
                        </td>
                        <td>{order.branch?.name ?? '—'}</td>
                        <td>
                          <span className="ff-tag ff-tag-plain">
                            {order.fulfillmentMode === 'PICKUP' ? 'Gel al' : 'Teslimat'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="ff-tag"
                            data-tone={STATUS_TONES[order.trackerKind ?? ''] ?? 'info'}
                            data-ff-order-status={order.status}
                          >
                            {order.statusLabel ?? order.status}
                          </span>
                        </td>
                        <td className="num">
                          {order.finalPayableMinor
                            ? formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')
                            : '—'}
                        </td>
                        <td className="col-actions">
                          <div className="ff-cluster" style={{ gap: '0.25rem', flexWrap: 'nowrap' }}>
                            <Link
                              href={`/orders/${order.id}`}
                              className="ff-btn ff-btn-outline ff-btn-sm"
                            >
                              {trackingIds.has(order.id) ? 'Takip et' : 'Detay'}
                            </Link>
                            {order.reorderAvailable !== false ? (
                              <button
                                type="button"
                                className="ff-btn ff-btn-ghost ff-btn-sm"
                                data-ff-reorder
                                disabled={reorderBusyId === order.id}
                                onClick={() => void onReorder(order)}
                              >
                                {reorderBusyId === order.id ? 'Kontrol…' : 'Tekrar'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </AccountShell>
  );
}