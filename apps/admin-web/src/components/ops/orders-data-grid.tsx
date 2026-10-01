'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { z } from 'zod';

import { type ColumnId, type ColumnVisibility, defaultVisibility } from '../../lib/column-prefs';
import { formatOpsDateTime, shortId } from '../../lib/ops-time';
import { fulfillmentLabel, orderStatusLabel } from '../../lib/order-status';
import type { orderSchema } from '../../lib/schemas';

import { OrderTimelineModal } from './order-timeline-modal';
import {
  computeAllowedTransitions,
  deriveElapsedState,
  formatDuration,
} from './orders-data-grid.helpers';
import styles from './orders-data-grid.module.css';
import { ClientPortal } from './portals';

type Order = z.infer<typeof orderSchema>;
type SortKey = 'orderNo' | 'status' | 'mode' | 'customer' | 'items' | 'amount' | 'elapsed';
type SortState = { key: SortKey; dir: 'asc' | 'desc' };
type Tone = 'ready' | 'warn' | 'amber' | 'logistics' | 'critical' | 'idle';

const PILL_TONE: Record<string, Tone> = {
  PAID: 'ready',
  BRANCH_ASSIGNED: 'warn',
  PREPARING: 'amber',
  READY_FOR_COURIER: 'ready',
  COURIER_ASSIGNED: 'logistics',
  PICKED_UP: 'logistics',
  ON_THE_WAY: 'logistics',
  DELIVERED: 'ready',
  CANCELLED: 'critical',
  REJECTED: 'critical',
  REFUND_PENDING: 'warn',
  PARTIALLY_REFUNDED: 'warn',
  REFUNDED: 'idle',
};

const orderNoOf = (row: Order) =>
  row.displayNumber && row.displayNumber.length > 0 ? row.displayNumber : shortId(row.id);
const itemCountOf = (row: Order) =>
  (row.items ?? []).reduce((count, item) => count + (item.quantity ?? 1), 0);
const customerNameOf = (row: Order) =>
  row.customer?.displayName?.trim() || (row.userId ? 'Kayıtlı müşteri' : 'Misafir');
const amountOf = (row: Order): bigint => {
  try {
    return BigInt(row.finalPayableMinor || '0');
  } catch {
    return 0n;
  }
};
const createdMsOf = (row: Order) => {
  const value = row.createdAt ? new Date(row.createdAt).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
};

function compareOrders(key: SortKey, dir: SortState['dir'], a: Order, b: Order): number {
  const sign = dir === 'asc' ? 1 : -1;
  let result = 0;
  switch (key) {
    case 'orderNo':
      result = orderNoOf(a).localeCompare(orderNoOf(b), 'tr');
      break;
    case 'status':
      result = orderStatusLabel(a.status).localeCompare(orderStatusLabel(b.status), 'tr');
      break;
    case 'mode':
      result = fulfillmentLabel(a.fulfillmentMode).localeCompare(
        fulfillmentLabel(b.fulfillmentMode),
        'tr',
      );
      break;
    case 'customer':
      result = customerNameOf(a).localeCompare(customerNameOf(b), 'tr');
      break;
    case 'items':
      result = itemCountOf(a) - itemCountOf(b);
      break;
    case 'amount': {
      const amountA = amountOf(a);
      const amountB = amountOf(b);
      result = amountA === amountB ? 0 : amountA < amountB ? -1 : 1;
      break;
    }
    case 'elapsed':
      result = createdMsOf(a) - createdMsOf(b);
      break;
  }
  return result * sign;
}

const MENU_WIDTH = 280;
const MENU_MAX_HEIGHT = 360;
const MENU_GAP = 6;

function menuPosition(
  trigger: HTMLButtonElement,
  contentHeight = MENU_MAX_HEIGHT,
): MenuStatePosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(MENU_WIDTH, window.innerWidth - 24);
  const availableBelow = Math.max(0, window.innerHeight - rect.bottom - MENU_GAP - 12);
  const availableAbove = Math.max(0, rect.top - MENU_GAP - 12);
  const fitsBelow = availableBelow >= contentHeight;
  const fitsAbove = availableAbove >= contentHeight;
  const opensBelow = fitsBelow || (!fitsAbove && availableBelow >= availableAbove);
  const maxHeight = Math.max(
    120,
    Math.min(MENU_MAX_HEIGHT, contentHeight, opensBelow ? availableBelow : availableAbove),
  );
  const top = opensBelow
    ? rect.bottom + MENU_GAP
    : Math.max(12, rect.top - Math.min(contentHeight, maxHeight) - MENU_GAP);
  const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
  return { top, left, maxHeight };
}

interface MenuStatePosition {
  top: number;
  left: number;
  maxHeight: number;
}

export interface OrdersDataGridProps {
  rows: Order[];
  onRowClick: (row: Order) => void;
  onTransition: (row: Order, toStatus: string) => Promise<void> | void;
  onPrintReceipt: (row: Order) => void;
  busyOrderId?: string | null;
  visibility: ColumnVisibility;
  ariaLabel?: string;
}

interface MenuState {
  orderId: string;
  top: number;
  left: number;
  maxHeight: number;
}

export function OrdersDataGrid(props: OrdersDataGridProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<Order | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuOrderId = menu?.orderId ?? null;

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNowMs(Date.now()), 0);
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (menuOrderId === null) return;
    menuRootRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
  }, [menuOrderId]);

  useEffect(() => {
    if (menuOrderId === null) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && menuRootRef.current?.contains(target)) return;
      closeMenu();
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        menuTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOrderId, closeMenu]);

  useEffect(() => {
    if (menuOrderId === null) return;
    const reposition = () => {
      const trigger = menuTriggerRef.current;
      if (!trigger) return;
      const position = menuPosition(
        trigger,
        Math.min(menuRootRef.current?.scrollHeight ?? MENU_MAX_HEIGHT, MENU_MAX_HEIGHT),
      );
      setMenu((current) =>
        current?.orderId === menuOrderId ? { orderId: menuOrderId, ...position } : current,
      );
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [menuOrderId]);

  const rows = useMemo(
    () =>
      sort ? [...props.rows].sort((a, b) => compareOrders(sort.key, sort.dir, a, b)) : props.rows,
    [props.rows, sort],
  );
  const visibility = props.visibility ?? defaultVisibility();
  const isShown = (id: ColumnId) =>
    id === 'orderNo' || id === 'status' || id === 'receipt' || visibility[id] !== false;
  const activeOrder = menu ? (props.rows.find((row) => row.id === menu.orderId) ?? null) : null;
  const transitions = activeOrder ? computeAllowedTransitions(activeOrder.status) : [];
  const columnCount = (
    ['orderNo', 'status', 'mode', 'customer', 'items', 'amount', 'elapsed', 'receipt'] as ColumnId[]
  ).filter(isShown).length;

  const requestSort = (key: SortKey) => {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: 'asc' };
      if (current.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const ariaSortFor = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sort?.key !== key ? 'none' : sort.dir === 'asc' ? 'ascending' : 'descending';

  const openMenu = (row: Order, trigger: HTMLButtonElement) => {
    menuTriggerRef.current = trigger;
    const estimatedHeight = 245 + computeAllowedTransitions(row.status).length * 31;
    setMenu({ orderId: row.id, ...menuPosition(trigger, estimatedHeight) });
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      menuRootRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  const activateRow = (row: Order, event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget || props.busyOrderId === row.id) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onRowClick(row);
    }
  };

  const openOrderDetails = (row: Order) => {
    menuTriggerRef.current?.focus();
    props.onRowClick(row);
  };

  return (
    <div className={styles.grid} data-ff-datagrid="orders-v1">
      <div className={styles.gridBar}>
        <div className={styles.gridTitle}>
          <span className={styles.gridMark} aria-hidden="true" />
          <div>
            <h2>Sipariş defteri</h2>
            <p>Durum, müşteri ve operasyon süresi</p>
          </div>
        </div>
        <div className={styles.gridMeta} aria-live="polite">
          <span className={styles.count}>{props.rows.length.toLocaleString('tr-TR')}</span>
          <span>kayıt</span>
          <span className={styles.metaDivider} aria-hidden="true" />
          <span>{sort ? 'Bu sayfada sıralanıyor' : 'En yeni siparişler'}</span>
        </div>
      </div>

      <div className={styles.tableViewport} role="region" aria-label="Sipariş listesi" tabIndex={0}>
        <table className={styles.table} aria-label={props.ariaLabel ?? 'Sipariş tablosu'}>
          <colgroup>
            {isShown('orderNo') ? <col className={styles.colOrder} /> : null}
            {isShown('status') ? <col className={styles.colStatus} /> : null}
            {isShown('mode') ? <col className={styles.colMode} /> : null}
            {isShown('customer') ? <col className={styles.colCustomer} /> : null}
            {isShown('items') ? <col className={styles.colItems} /> : null}
            {isShown('amount') ? <col className={styles.colAmount} /> : null}
            {isShown('elapsed') ? <col className={styles.colElapsed} /> : null}
            {isShown('receipt') ? <col className={styles.colActions} /> : null}
          </colgroup>
          <thead>
            <tr>
              {isShown('orderNo') ? (
                <SortHeader
                  label="Sipariş"
                  hint="No · oluşturulma"
                  sortKey="orderNo"
                  active={sort}
                  ariaSort={ariaSortFor('orderNo')}
                  onSort={requestSort}
                />
              ) : null}
              {isShown('status') ? (
                <SortHeader
                  label="Durum"
                  sortKey="status"
                  active={sort}
                  ariaSort={ariaSortFor('status')}
                  onSort={requestSort}
                />
              ) : null}
              {isShown('mode') ? (
                <SortHeader
                  label="Akış"
                  sortKey="mode"
                  active={sort}
                  ariaSort={ariaSortFor('mode')}
                  onSort={requestSort}
                />
              ) : null}
              {isShown('customer') ? (
                <SortHeader
                  label="Müşteri"
                  sortKey="customer"
                  active={sort}
                  ariaSort={ariaSortFor('customer')}
                  onSort={requestSort}
                />
              ) : null}
              {isShown('items') ? (
                <SortHeader
                  label="Kalem"
                  hint="Adet"
                  numeric
                  sortKey="items"
                  active={sort}
                  ariaSort={ariaSortFor('items')}
                  onSort={requestSort}
                />
              ) : null}
              {isShown('amount') ? (
                <SortHeader
                  label="Toplam"
                  hint="TRY"
                  numeric
                  sortKey="amount"
                  active={sort}
                  ariaSort={ariaSortFor('amount')}
                  onSort={requestSort}
                />
              ) : null}
              {isShown('elapsed') ? (
                <SortHeader
                  label="Sipariş yaşı"
                  hint="Europe / Istanbul"
                  sortKey="elapsed"
                  active={sort}
                  ariaSort={ariaSortFor('elapsed')}
                  onSort={requestSort}
                />
              ) : null}
              {isShown('receipt') ? (
                <th scope="col" className={styles.actionsHead}>
                  İşlem
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={Math.max(columnCount, 1)}>
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true">
                      —
                    </span>
                    <strong>Bu görünümde sipariş yok</strong>
                    <span>Filtreleri değiştirin veya yeni siparişleri bekleyin.</span>
                  </div>
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const busy = props.busyOrderId === row.id;
              const tone = PILL_TONE[row.status] ?? 'idle';
              const elapsed = deriveElapsedState(row.createdAt, row.events, nowMs);
              return (
                <tr
                  key={row.id}
                  className={styles.row}
                  tabIndex={0}
                  aria-label={
                    'Sipariş ' +
                    orderNoOf(row) +
                    ', ' +
                    orderStatusLabel(row.status) +
                    '. Detayı aç.'
                  }
                  data-clickable="true"
                  data-ff-row={row.id}
                  data-ff-status={row.status}
                  onClick={(event) => {
                    if (!busy) {
                      event.currentTarget.focus();
                      props.onRowClick(row);
                    }
                  }}
                  onKeyDown={(event) => activateRow(row, event)}
                >
                  {isShown('orderNo') ? (
                    <td className={styles.orderCell}>
                      <span className={styles.orderId}>{orderNoOf(row)}</span>
                      <time className={styles.secondary} dateTime={row.createdAt ?? undefined}>
                        {formatOpsDateTime(row.createdAt)}
                      </time>
                    </td>
                  ) : null}
                  {isShown('status') ? (
                    <td>
                      <span className={styles.status} data-tone={tone}>
                        <span className={styles.statusDot} aria-hidden="true" />
                        {orderStatusLabel(row.status)}
                      </span>
                    </td>
                  ) : null}
                  {isShown('mode') ? (
                    <td>
                      <span className={styles.flow}>
                        <span className={styles.flowIcon} aria-hidden="true">
                          {row.fulfillmentMode === 'PICKUP' ? 'storefront' : 'delivery_dining'}
                        </span>
                        {fulfillmentLabel(row.fulfillmentMode)}
                      </span>
                    </td>
                  ) : null}
                  {isShown('customer') ? (
                    <td>
                      <span className={styles.customer}>{customerNameOf(row)}</span>
                      <span className={styles.secondary}>
                        {row.userId ? 'Kayıtlı hesap' : 'Misafir siparişi'}
                      </span>
                    </td>
                  ) : null}
                  {isShown('items') ? (
                    <td className={styles.numeric}>
                      <span className={styles.itemCount}>{itemCountOf(row)}</span>
                    </td>
                  ) : null}
                  {isShown('amount') ? (
                    <td className={styles.amount}>
                      {row.finalPayableMinor ? (
                        <span>{formatTryMinor(row.finalPayableMinor, row.currency ?? 'TRY')}</span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                  ) : null}
                  {isShown('elapsed') ? (
                    <td>
                      {elapsed ? (
                        <span className={styles.elapsed} data-state={elapsed.tone}>
                          <span className={styles.elapsedMarker} aria-hidden="true" />
                          <span>{formatDuration(elapsed.minutes)}</span>
                          <span className={styles.elapsedCaption}>
                            {elapsed.tone === 'completed' ? 'tamamlandı' : 'devam ediyor'}
                          </span>
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                  ) : null}
                  {isShown('receipt') ? (
                    <td className={styles.actionCell}>
                      <button
                        type="button"
                        className={styles.actionTrigger}
                        aria-haspopup="menu"
                        aria-expanded={menu?.orderId === row.id}
                        aria-label={'Sipariş ' + orderNoOf(row) + ' işlemleri'}
                        data-ff-row-action="actions-toggle"
                        data-order-id={row.id}
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (menu?.orderId === row.id) closeMenu();
                          else openMenu(row, event.currentTarget);
                        }}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          more_horiz
                        </span>
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ClientPortal>
        {menu && activeOrder ? (
          <div className={styles.menuLayer}>
            <div
              ref={menuRootRef}
              className={styles.actionMenu}
              data-admin-theme="kitchen-fleet"
              role="menu"
              aria-label={'Sipariş ' + orderNoOf(activeOrder) + ' işlemleri'}
              style={{ top: menu.top, left: menu.left, maxHeight: menu.maxHeight }}
              data-ff-action-menu={activeOrder.id}
              onKeyDown={handleMenuKeyDown}
            >
              <header className={styles.menuHeader}>
                <div>
                  <span className={styles.menuCaption}>Sipariş işlemleri</span>
                  <strong>{orderNoOf(activeOrder)}</strong>
                </div>
                <span className={styles.status} data-tone={PILL_TONE[activeOrder.status] ?? 'idle'}>
                  <span className={styles.statusDot} aria-hidden="true" />
                  {orderStatusLabel(activeOrder.status)}
                </span>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuClose}
                  aria-label="Menüyü kapat"
                  data-ff-action="close-menu"
                  onClick={closeMenu}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </header>
              <div className={styles.menuGroup} role="group" aria-label="Sipariş görüntüleme">
                <span className={styles.menuGroupLabel}>Görüntüleme</span>
                <MenuItem
                  icon="open_in_new"
                  label="Sipariş detayını aç"
                  action="view-detail"
                  onClick={() => openOrderDetails(activeOrder)}
                  close={closeMenu}
                />
                <MenuItem
                  icon="history"
                  label="Süreç geçmişi"
                  action="view-timeline"
                  onClick={() => setTimelineOrder(activeOrder)}
                  close={closeMenu}
                />
                <MenuItem
                  icon="print"
                  label="Fiş yazdır"
                  action="print-receipt"
                  onClick={() => props.onPrintReceipt(activeOrder)}
                  close={closeMenu}
                />
              </div>
              {transitions.length > 0 ? (
                <div className={styles.menuGroup} role="group" aria-label="Durum geçişi">
                  <span className={styles.menuGroupLabel}>Durumu güncelle</span>
                  {transitions.map((transition) => (
                    <MenuItem
                      key={transition.toStatus}
                      icon={transition.variant === 'warning' ? 'warning' : 'arrow_forward'}
                      label={transition.label}
                      action={transition.toStatus}
                      warning={transition.variant === 'warning'}
                      disabled={props.busyOrderId === activeOrder.id}
                      onClick={() => props.onTransition(activeOrder, transition.toStatus)}
                      close={closeMenu}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </ClientPortal>

      <OrderTimelineModal
        open={timelineOrder !== null}
        onClose={() => setTimelineOrder(null)}
        order={timelineOrder}
      />
    </div>
  );
}

function MenuItem(props: {
  icon: string;
  label: string;
  action: string;
  onClick: () => void | Promise<void>;
  close: () => void;
  warning?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={props.warning ? styles.menuItemWarning : styles.menuItem}
      data-ff-action={props.action}
      disabled={props.disabled}
      onClick={async (event) => {
        event.stopPropagation();
        props.close();
        await props.onClick();
      }}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {props.icon}
      </span>
      <span>{props.label}</span>
      {props.warning ? <span className={styles.warningTag}>Dikkat</span> : null}
    </button>
  );
}

function SortHeader(props: {
  label: string;
  hint?: string;
  numeric?: boolean;
  sortKey: SortKey;
  active: SortState | null;
  ariaSort: 'ascending' | 'descending' | 'none';
  onSort: (key: SortKey) => void;
}) {
  const active = props.active?.key === props.sortKey ? props.active.dir : null;
  const icon =
    active === 'asc' ? 'arrow_upward' : active === 'desc' ? 'arrow_downward' : 'unfold_more';
  return (
    <th
      scope="col"
      aria-sort={props.ariaSort}
      data-col={props.sortKey}
      className={props.numeric ? styles.numericHead : undefined}
    >
      <button
        type="button"
        className={styles.sortButton}
        onClick={() => props.onSort(props.sortKey)}
        aria-label={props.label + ' kolonuna göre sırala'}
        data-ff-sort-state={active ?? 'none'}
      >
        <span className={styles.sortText}>
          <span>{props.label}</span>
          {props.hint ? <small>{props.hint}</small> : null}
        </span>
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
      </button>
    </th>
  );
}
