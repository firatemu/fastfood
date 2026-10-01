import { getApiClient } from './api';
import { fetchCart } from './cart';
import {
  customerOrdersResponseSchema,
  orderTrackingResponseSchema,
  reorderResponseSchema,
  type CustomerOrder,
  type OrderTracking,
  type ReorderResult,
} from './schemas';

export async function fetchMyOrders(): Promise<CustomerOrder[]> {
  const res = await getApiClient().request({
    path: '/me/orders',
    schema: customerOrdersResponseSchema,
  });
  return res.data;
}

export async function fetchOrderTracking(orderId: string): Promise<OrderTracking> {
  const res = await getApiClient().request({
    path: `/orders/${orderId}`,
    schema: orderTrackingResponseSchema,
  });
  return res.data;
}

export async function reorderOrder(orderId: string): Promise<ReorderResult> {
  const res = await getApiClient().request({
    method: 'POST',
    path: `/orders/${orderId}/reorder`,
    schema: reorderResponseSchema,
  });
  if (res.data.restoredCount > 0) {
    await fetchCart().catch(() => undefined);
  }
  return res.data;
}
