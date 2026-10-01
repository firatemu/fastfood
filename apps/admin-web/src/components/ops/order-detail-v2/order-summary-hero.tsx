'use client';

import Link from 'next/link';
import type { z } from 'zod';

import { shortId, formatOpsDateTime } from '../../../lib/ops-time';
import { fulfillmentLabel, orderStatusLabel, orderStatusTone } from '../../../lib/order-status';
import type { orderSchema } from '../../../lib/schemas';
import { StatusBadge } from '../ops-ui';

type Order = z.infer<typeof orderSchema>;

export interface OrderSummaryHeroProps {
  order: Order;
  branchName: string | null;
  onOpenReceipt: () => void;
  printing: boolean;
}

export function OrderSummaryHero({
  order,
  branchName,
  onOpenReceipt,
  printing,
}: OrderSummaryHeroProps) {
  return (
    <header className="order-summary-hero">
      <div className="order-summary-hero__main">
        <div className="order-summary-hero__breadcrumbs">
          <Link href="/orders">← Siparişler</Link>
          <span className="ops-scope-tag">
            Şube · {branchName ?? '—'}
          </span>
          <StatusBadge tone={orderStatusTone(order.status)}>
            {orderStatusLabel(order.status)}
          </StatusBadge>
          <span className="muted">{fulfillmentLabel(order.fulfillmentMode)}</span>
        </div>
        <h1 className="order-summary-hero__title">
          <span className="mono">{order.displayNumber || shortId(order.id)}</span>
        </h1>
        <p className="order-summary-hero__sub">
          <span>{order.items?.length ?? 0} kalem</span>
          <span>· Oluşturma {formatOpsDateTime(order.createdAt)}</span>
        </p>
      </div>
      <div className="order-summary-hero__actions">
        <button
          type="button"
          className="ops-btn ops-btn--primary"
          onClick={onOpenReceipt}
          disabled={printing}
        >
          Fiş yazdır
        </button>
        <button
          type="button"
          className="ops-btn ops-btn--ghost"
          onClick={() =>
            window.open(`/orders/${order.id}/tracking`, '_blank', 'noopener')
          }
          disabled={!order.checkoutSessionId}
        >
          Müşteri takibi
        </button>
        {order.userId ? (
          <Link href={`/customers/${order.userId}`} className="ops-btn ops-btn--ghost">
            Müşteri kaydı
          </Link>
        ) : null}
      </div>
    </header>
  );
}
