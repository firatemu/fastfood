import { StatusBadge, type StatusTone } from './status-badge.js';

export type OrderStatus =
  | 'pending_payment'
  | 'received'
  | 'preparing'
  | 'ready_for_pickup'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

const ORDER_TONE: Record<OrderStatus, StatusTone> = {
  pending_payment: 'pending',
  received: 'in_progress',
  preparing: 'in_progress',
  ready_for_pickup: 'ready',
  on_the_way: 'in_progress',
  delivered: 'completed',
  cancelled: 'cancelled',
};

const ORDER_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Ödeme bekleniyor',
  received: 'Alındı',
  preparing: 'Hazırlanıyor',
  ready_for_pickup: 'Teslim için hazır',
  on_the_way: 'Yolda',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
};

export interface OrderStatusProps {
  status: OrderStatus;
}

/**
 * OrderStatus — semantic mapping for the canonical order lifecycle
 * (document 23 §Phase 7 domain vocabulary).
 */
export function OrderStatus(props: OrderStatusProps) {
  const { status } = props;
  return <StatusBadge tone={ORDER_TONE[status]}>{ORDER_LABEL[status]}</StatusBadge>;
}
