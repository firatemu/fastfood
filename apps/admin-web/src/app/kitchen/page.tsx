'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

import {
  errorMessage,
  isForbidden,
  isUnauthorized,
  type LoadState,
} from '../../components/async-boundary';
import { useBranchContext } from '../../components/ops/branch-context';
import { useOpsSync } from '../../components/ops/ops-sync';
import { OrderReceiptModal } from '../../components/ops/order-detail-v2/order-receipt-modal';
import { createAdminClient } from '../../lib/api';
import { KITCHEN_POLL_MS, shouldRunKitchenPoll } from '../../lib/kitchen-poll';
import { formatElapsed, formatOpsDateTime, shortId } from '../../lib/ops-time';
import {
  fulfillmentLabel,
  kdsLane,
  kitchenPrimaryAction,
  orderStatusLabel,
  type KdsLaneId,
} from '../../lib/order-status';
import { orderResponseSchema, ordersResponseSchema, type orderSchema } from '../../lib/schemas';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import styles from './kitchen.module.css';

type Order = z.infer<typeof orderSchema>;
type OrderItem = NonNullable<Order['items']>[number];
type Selection = { kind: 'added' | 'removed'; label: string; count: number };

const EMPTY_ORDERS: Order[] = [];

const LANES: { id: KdsLaneId; number: string; title: string; description: string }[] = [
  { id: 'new', number: '01', title: 'Yeni siparişler', description: 'Hazırlığa alınmayı bekliyor' },
  { id: 'prep', number: '02', title: 'Hazırlanıyor', description: 'Mutfakta işlemde' },
  { id: 'ready', number: '03', title: 'Paketlendi', description: 'Teslim için hazır' },
];

function orderNumber(order: Order): string {
  return order.displayNumber || shortId(order.id);
}

function orderTimestamp(order: Order): number {
  const time = Date.parse(order.createdAt ?? '');
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function itemQuantity(order: Order): number {
  return (order.items ?? []).reduce((total, item) => total + (item.quantity ?? 1), 0);
}

function matchesSearch(order: Order, search: string): boolean {
  const query = search.trim().toLocaleLowerCase('tr-TR');
  if (!query) return true;
  return [
    orderNumber(order),
    ...(order.items ?? []).flatMap((item) => [
      item.productNameSnapshot ?? '',
      ...(item.modifiers ?? []).map((modifier) => modifier.nameSnapshot ?? ''),
      ...(item.removals ?? []).map((removal) => removal.nameSnapshot ?? ''),
    ]),
  ].some((value) => value.toLocaleLowerCase('tr-TR').includes(query));
}

function selectionSummary(item: OrderItem): Selection[] {
  const summary = new Map<string, Selection>();
  const add = (kind: Selection['kind'], label: string) => {
    const key = `${kind}:${label}`;
    const current = summary.get(key);
    if (current) current.count += 1;
    else summary.set(key, { kind, label, count: 1 });
  };

  for (const modifier of item.modifiers ?? []) {
    const name = modifier.nameSnapshot?.trim();
    add('added', name && name !== 'Modifiye' ? `Ek: ${name}` : 'Ek seçim (ad bilgisi yok)');
  }
  for (const removal of item.removals ?? []) {
    const name = removal.nameSnapshot?.trim();
    add('removed', name ? `Çıkar: ${name}` : 'Çıkarılan malzeme (ad bilgisi yok)');
  }
  return [...summary.values()];
}

function KitchenTicket(props: {
  order: Order;
  lane: KdsLaneId;
  busy: boolean;
  onTransition: (order: Order, status: string) => void;
  onPrint: (order: Order) => void;
}) {
  const { order, lane, busy, onTransition, onPrint } = props;
  const primary = kitchenPrimaryAction(order.status);
  const quantity = itemQuantity(order);

  return (
    <article className={styles.ticket} data-stage={lane}>
      <header className={styles.ticketHead}>
        <div className={styles.ticketIdentity}>
          <span className={styles.orderNumber}>{orderNumber(order)}</span>
          <span className={styles.ticketMode}>{fulfillmentLabel(order.fulfillmentMode)}</span>
        </div>
        <div className={styles.ticketAge} title="Sipariş oluşturulmasından geçen süre">
          <span className="material-symbols-outlined" aria-hidden="true">
            schedule
          </span>
          {order.createdAt ? formatElapsed(order.createdAt) : '—'}
        </div>
      </header>

      <div className={styles.ticketMeta}>
        <span>{orderStatusLabel(order.status)}</span>
        <span>{quantity} adet</span>
        <time dateTime={order.createdAt}>{formatOpsDateTime(order.createdAt)}</time>
      </div>

      <ul className={styles.itemList} aria-label={`${orderNumber(order)} ürünleri`}>
        {(order.items ?? []).map((item, index) => {
          const selections = selectionSummary(item);
          return (
            <li className={styles.product} key={item.id ?? `${order.id}-${index}`}>
              <span className={styles.quantity}>{item.quantity ?? 1}×</span>
              <div className={styles.productCopy}>
                <strong>{item.productNameSnapshot ?? 'Ürün adı yok'}</strong>
                {selections.length > 0 ? (
                  <div className={styles.customizations}>
                    {selections.map((selection) => (
                      <span
                        className={selection.kind === 'added' ? styles.added : styles.removed}
                        key={`${selection.kind}:${selection.label}`}
                      >
                        {selection.label}
                        {selection.count > 1 ? ` ×${selection.count}` : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {order.deliveryNote ? (
        <div className={styles.orderNote}>
          <span className="material-symbols-outlined" aria-hidden="true">
            sticky_note_2
          </span>
          <span>{order.deliveryNote}</span>
        </div>
      ) : null}

      <footer className={styles.ticketFooter}>
        <span className={styles.ticketAmount}>
          {order.finalPayableMinor != null
            ? formatTryMinor(order.finalPayableMinor, order.currency ?? 'TRY')
            : '—'}
        </span>
        {lane !== 'ready' ? (
          <div className={styles.ticketActions}>
            <button
              type="button"
              className={styles.printAction}
              disabled={busy}
              onClick={() => onPrint(order)}
              aria-label={`${orderNumber(order)} fişini yazdır`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                print
              </span>
              Fiş yazdır
            </button>
            {primary ? (
              <button
                type="button"
                className={styles.primaryAction}
                disabled={busy}
                onClick={() => onTransition(order, primary.toStatus)}
              >
                {busy ? 'İşleniyor…' : primary.label}
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </footer>
    </article>
  );
}

export default function KitchenPage() {
  const { branchId, selected } = useBranchContext();
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const [state, setState] = useState<LoadState<Order[]>>({ status: 'loading' });
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pollWarning, setPollWarning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(
    async (options?: { silent?: boolean; manual?: boolean }) => {
      const request = ++requestRef.current;
      if (!options?.silent) setState({ status: 'loading' });
      if (options?.manual) setRefreshing(true);
      try {
        const response = await createAdminClient().request({
          path: 'admin/kitchen',
          query: { branchId },
          schema: ordersResponseSchema,
        });
        if (request !== requestRef.current) return;
        setState(
          response.data.length > 0 ? { status: 'ready', data: response.data } : { status: 'empty' },
        );
        setLastLoaded(new Date().toISOString());
        setPollWarning(false);
        markSynced();
      } catch (error) {
        if (request !== requestRef.current) return;
        if (options?.silent) setPollWarning(true);
        else setState({ status: 'error', error });
        markStale();
      } finally {
        if (request === requestRef.current) setRefreshing(false);
      }
    },
    [branchId, markStale, markSynced],
  );

  useEffect(() => {
    registerRefresh(() => load({ silent: true, manual: true }));
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (shouldRunKitchenPoll(document.hidden)) void load({ silent: true });
    }, KITCHEN_POLL_MS);
    const onVisibility = () => {
      if (shouldRunKitchenPoll(document.hidden)) void load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  async function transition(order: Order, toStatus: string) {
    setBusyId(order.id);
    setFlash(null);
    setActionError(null);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/orders/${order.id}/transitions`,
        body: { toStatus },
        schema: orderResponseSchema,
      });
      setFlash(`${orderNumber(order)}: ${orderStatusLabel(toStatus).toLocaleLowerCase('tr-TR')}.`);
      await load({ silent: true });
    } catch (error) {
      setActionError(errorMessage(error));
      await load({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  const orders = state.status === 'ready' ? state.data : EMPTY_ORDERS;
  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesSearch(order, search)),
    [orders, search],
  );
  const laneOrders = useMemo(() => {
    const grouped: Record<KdsLaneId, Order[]> = { new: [], prep: [], ready: [] };
    for (const order of visibleOrders) {
      const lane = kdsLane(order.status);
      if (lane) grouped[lane].push(order);
    }
    for (const lane of LANES) {
      grouped[lane.id].sort((a, b) => orderTimestamp(a) - orderTimestamp(b));
    }
    return grouped;
  }, [visibleOrders]);
  const laneCounts = useMemo(() => {
    const counts: Record<KdsLaneId, number> = { new: 0, prep: 0, ready: 0 };
    for (const order of orders) {
      const lane = kdsLane(order.status);
      if (lane) counts[lane] += 1;
    }
    return counts;
  }, [orders]);
  const total = state.status === 'loading' || state.status === 'error' ? '—' : orders.length;

  return (
    <main className={`${styles.page} ops-kitchen-page`} data-admin-theme="fastfood-navy">
      <section className={styles.commandBar} aria-labelledby="kitchen-title">
        <div className={styles.titleBlock}>
          <span className={styles.titleRule} aria-hidden="true" />
          <div>
            <p className={styles.context}>{selected?.name ?? 'Seçili şube'} mutfağı</p>
            <h1 id="kitchen-title">Mutfak akışı</h1>
            <p className={styles.intro}>Siparişleri hazırlık sırasına göre takip edin.</p>
          </div>
        </div>
        <div className={styles.commandActions}>
          <div className={styles.totalCount} aria-label={`${total} açık mutfak siparişi`}>
            <strong>{total}</strong>
            <span>Açık fiş</span>
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            disabled={refreshing}
            onClick={() => void load({ silent: true, manual: true })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              refresh
            </span>
            {refreshing ? 'Yenileniyor' : 'Yenile'}
          </button>
        </div>
      </section>

      <section className={styles.flowStrip} aria-label="Mutfak aşamaları">
        {LANES.map((lane) => (
          <div className={styles.flowStage} data-stage={lane.id} key={lane.id}>
            <span className={styles.flowIndex}>{lane.number}</span>
            <div className={styles.flowCopy}>
              <strong>{lane.title}</strong>
              <span>{lane.description}</span>
            </div>
            <span className={styles.flowCount}>{laneCounts[lane.id]}</span>
          </div>
        ))}
      </section>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Sipariş no veya ürün ara"
            aria-label="Mutfak siparişlerinde ara"
          />
        </label>
        <div className={styles.toolbarInfo}>
          {search.trim() ? <span>{visibleOrders.length} sonuç</span> : null}
          <span className={styles.syncDot} data-stale={pollWarning} aria-hidden="true" />
          <span>
            {lastLoaded
              ? `Son kontrol ${new Intl.DateTimeFormat('tr-TR', {
                  timeZone: 'Europe/Istanbul',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(new Date(lastLoaded))}`
              : 'Veri bekleniyor'}
          </span>
          <span className={styles.pollInfo}>8 sn aralıklarla yenilenir</span>
        </div>
      </div>

      {flash ? (
        <p className={styles.successNotice} role="status">
          {flash}
        </p>
      ) : null}
      {actionError ? (
        <p className={styles.errorNotice} role="alert">
          {actionError}
        </p>
      ) : null}
      {pollWarning ? (
        <p className={styles.warningNotice} role="status">
          Yeni veriler alınamadı. Son yüklenen siparişler gösteriliyor.
        </p>
      ) : null}

      {state.status === 'loading' ? (
        <div className={styles.statePanel} role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            hourglass_top
          </span>
          <strong>Mutfak kuyruğu yükleniyor</strong>
          <span>Şubedeki açık siparişler getiriliyor.</span>
        </div>
      ) : state.status === 'error' ? (
        <div className={styles.statePanel} role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <strong>
            {isUnauthorized(state.error)
              ? 'Oturum gerekli'
              : isForbidden(state.error)
                ? 'Bu şubenin mutfak kuyruğunu görme yetkiniz yok'
                : 'Mutfak kuyruğu yüklenemedi'}
          </strong>
          <span>
            {isUnauthorized(state.error) || isForbidden(state.error)
              ? 'Yetkinizi kontrol edin.'
              : errorMessage(state.error)}
          </span>
          <button type="button" onClick={() => void load()}>
            Tekrar dene
          </button>
        </div>
      ) : state.status === 'empty' ? (
        <div className={styles.statePanel} role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            done_all
          </span>
          <strong>Mutfak kuyruğu boş</strong>
          <span>Bu şubede hazırlık bekleyen sipariş yok.</span>
        </div>
      ) : (
        <div className={styles.board}>
          {LANES.map((lane) => (
            <section
              className={styles.lane}
              data-stage={lane.id}
              key={lane.id}
              aria-labelledby={`lane-${lane.id}`}
            >
              <header className={styles.laneHead}>
                <div>
                  <span className={styles.laneIndex}>{lane.number} / 03</span>
                  <h2 id={`lane-${lane.id}`}>{lane.title}</h2>
                  <p>{lane.description}</p>
                </div>
                <strong className={styles.laneCount}>{laneOrders[lane.id].length}</strong>
              </header>
              <div className={styles.laneBody}>
                {laneOrders[lane.id].length > 0 ? (
                  laneOrders[lane.id].map((order) => (
                    <KitchenTicket
                      key={order.id}
                      order={order}
                      lane={lane.id}
                      busy={busyId === order.id}
                      onTransition={(row, status) => void transition(row, status)}
                      onPrint={setReceiptOrder}
                    />
                  ))
                ) : (
                  <div className={styles.laneEmpty}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      check_circle
                    </span>
                    <p>
                      {search.trim()
                        ? 'Bu aramada eşleşen sipariş yok.'
                        : 'Bu aşamada sipariş yok.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {receiptOrder ? (
        <OrderReceiptModal
          order={receiptOrder}
          variant="kitchen"
          receiptToken={null}
          printing={false}
          open
          onClose={() => setReceiptOrder(null)}
          onPrint={() => window.print()}
        />
      ) : null}
    </main>
  );
}
