import { formatTryMinor } from '@fastfood/contracts';

import { isIstanbulToday } from './ops-time';
import { ACTIVE_ORDER_STATUSES, KITCHEN_BOARD_STATUSES, TERMINAL_STATUSES } from './order-status';

export type MetricOrder = {
  status: string;
  createdAt?: string;
  finalPayableMinor?: string;
  currency?: string;
};

export function dashboardMetrics(input: {
  orders: MetricOrder[];
  kitchenCount: number;
  now?: Date;
}): {
  todayCount: number;
  activeCount: number;
  kitchenCount: number;
  todayNetLabel: string;
  cancelledToday: number;
} {
  const now = input.now ?? new Date();
  const today = input.orders.filter((o) => o.createdAt && isIstanbulToday(o.createdAt, now));
  const todayNet = today
    .filter((o) => !TERMINAL_STATUSES.has(o.status) || o.status === 'DELIVERED')
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED')
    .reduce((sum, o) => sum + BigInt(o.finalPayableMinor ?? '0'), 0n);
  const currency = today[0]?.currency ?? 'TRY';
  return {
    todayCount: today.length,
    activeCount: input.orders.filter((o) => ACTIVE_ORDER_STATUSES.has(o.status)).length,
    kitchenCount: input.kitchenCount,
    todayNetLabel: formatTryMinor(todayNet.toString(), currency),
    cancelledToday: today.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED').length,
  };
}

export function kitchenQueueFromOrders(orders: MetricOrder[]): number {
  return orders.filter((o) => KITCHEN_BOARD_STATUSES.has(o.status)).length;
}
