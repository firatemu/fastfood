'use client';

import { formatTryMinor } from '@fastfood/contracts';
import type { z } from 'zod';

import { formatOpsDateTime } from '../../../lib/ops-time';
import { orderStatusLabel } from '../../../lib/order-status';
import type { orderSchema } from '../../../lib/schemas';
import { OrderReceipt } from '../order-receipt';

type Order = z.infer<typeof orderSchema>;

export interface OrderReceiptModalProps {
  order: Order;
  variant?: 'standard' | 'kitchen';
  receiptToken: { token: string; prefix: string; expiresAt: string } | null;
  printing: boolean;
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function OrderReceiptModal({
  order,
  variant = 'standard',
  receiptToken,
  printing,
  open,
  onClose,
  onPrint,
}: OrderReceiptModalProps) {
  if (!open) return null;
  const currency = order.currency ?? 'TRY';
  const itemCount = (order.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  return (
    <div
      className={
        variant === 'kitchen' ? 'ops-receipt-modal ops-kitchen-receipt-modal' : 'ops-receipt-modal'
      }
      role="dialog"
      aria-modal="true"
      aria-label="Sipariş fişi"
      onClick={onClose}
    >
      <div className="ops-receipt-modal__panel" onClick={(event) => event.stopPropagation()}>
        <header className="ops-receipt-modal__header">
          <div>
            <strong>{variant === 'kitchen' ? 'Mutfak fişi' : 'Fiş önizleme'}</strong>
            <p className="muted">
              {order.displayNumber ?? '—'} · {orderStatusLabel(order.status)} · {currency} ·{' '}
              {variant === 'kitchen'
                ? 'Hazırlık kopyası'
                : receiptToken
                  ? 'Token alındı'
                  : printing
                    ? 'Token alınıyor…'
                    : 'Token alınamadı'}
            </p>
            <p className="muted">
              {itemCount} kalem · {formatOpsDateTime(order.createdAt)}
            </p>
          </div>
          <div className="ops-receipt-modal__actions">
            <button type="button" className="ops-btn ops-btn--ghost" onClick={onClose}>
              Kapat
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--primary"
              onClick={onPrint}
              disabled={variant !== 'kitchen' && !receiptToken}
            >
              Yazdır
            </button>
          </div>
        </header>
        {variant !== 'kitchen' ? (
          <p className="ops-receipt-modal__total mono">
            Ödenecek · {formatTryMinor(order.finalPayableMinor ?? '0', currency)}
          </p>
        ) : null}
        <OrderReceipt
          order={order}
          variant={variant}
          pickupToken={receiptToken?.token}
          pickupPrefix={receiptToken?.prefix}
          pickupExpiresAt={receiptToken?.expiresAt}
        />
      </div>
    </div>
  );
}
