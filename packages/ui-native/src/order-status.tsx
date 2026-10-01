import { StatusBadge, type StatusTone } from './status-badge.js';
import type { NativeTheme } from './theme.js';

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
  theme: NativeTheme;
}

export function OrderStatus(props: OrderStatusProps) {
  const { status, theme } = props;
  return (
    <StatusBadge tone={ORDER_TONE[status]} theme={theme}>
      {ORDER_LABEL[status]}
    </StatusBadge>
  );
}
