'use client';

import { useEffect, useRef } from 'react';

import { orderStatusLabel } from '../../lib/order-status';

import {
  type TimelineEntry,
  type TimelineRow,
  buildTimelineRows,
  formatDuration,
} from './orders-data-grid.helpers';

export interface OrderTimelineModalOrder {
  id: string;
  displayNumber?: string | null | undefined;
  status: string;
  createdAt?: string | null | undefined;
  events?: ReadonlyArray<{ toStatus?: string | null | undefined; createdAt?: string }> | null;
}

export interface OrderTimelineModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderTimelineModalOrder | null;
}

export function OrderTimelineModal(props: OrderTimelineModalProps) {
  const { open, onClose } = props;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!props.open || !props.order) return null;

  const order = props.order;
  // The shape coming in is a loose Zod-inferred object; the runtime
  // contract is the TimelineEntry shape used by the rest of the helper
  // layer. Cast at the boundary so the rest of the file stays typed.
  const events = (order.events ?? undefined) as unknown as readonly TimelineEntry[] | undefined;
  const rows: TimelineRow[] = events ? buildTimelineRows(events) : [];
  const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
  const firstTerminal = events?.find(
    (e) => e.toStatus && ['DELIVERED', 'CANCELLED', 'REJECTED', 'REFUNDED'].includes(e.toStatus),
  );
  const endMs = firstTerminal ? new Date(firstTerminal.createdAt).getTime() : NaN;
  const hasRange = Number.isFinite(createdMs) && Number.isFinite(endMs) && endMs > createdMs;
  const totalMinutes = hasRange ? Math.max(0, Math.floor((endMs - createdMs) / 60_000)) : null;

  return (
    <div
      className="orders-timeline-modal__overlay"
      role="presentation"
      onClick={props.onClose}
      data-ff-timeline-overlay="open"
    >
      <div
        ref={dialogRef}
        className="orders-timeline-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Sipariş ${order.displayNumber ?? order.id} süreç geçmişi`}
        onClick={(event) => event.stopPropagation()}
        data-ff-timeline-dialog={order.id}
      >
        <header className="orders-timeline-modal__header">
          <div>
            <span className="orders-timeline-modal__eyebrow">Süreç geçmişi</span>
            <strong className="orders-timeline-modal__title">
              {order.displayNumber ?? order.id.slice(0, 8)}
            </strong>
            <span className={`orders-timeline-modal__status is-${order.status}`}>
              {orderStatusLabel(order.status)}
            </span>
          </div>
          <button
            type="button"
            className="orders-timeline-modal__close"
            aria-label="Süreç geçmişini kapat"
            onClick={props.onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {totalMinutes !== null ? (
          <div className="orders-timeline-modal__summary">
            <span className="orders-timeline-modal__summary-label">Toplam süre</span>
            <strong className="orders-timeline-modal__summary-value">
              {formatDuration(totalMinutes)}
            </strong>
          </div>
        ) : (
          <div className="orders-timeline-modal__summary is-ongoing">
            <span className="orders-timeline-modal__summary-label">Süreç devam ediyor</span>
            <strong className="orders-timeline-modal__summary-value">—</strong>
          </div>
        )}

        <ol className="orders-timeline-modal__list" role="list">
          {rows.length === 0 ? (
            <li className="orders-timeline-modal__empty">Geçmiş kaydı yok.</li>
          ) : (
            rows.map((row) => (
              <li
                key={row.id}
                className={`orders-timeline-modal__item is-${row.tone}`}
                data-ff-timeline-row={row.tone}
              >
                <span className="orders-timeline-modal__bullet">
                  <span className="material-symbols-outlined">{row.icon}</span>
                </span>
                <div className="orders-timeline-modal__copy">
                  <strong>{row.title}</strong>
                  <span>{row.detail}</span>
                </div>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  );
}
