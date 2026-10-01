import type { z } from 'zod';

import { createStorefrontClient, sessionHeaders } from '../api';
import {
  courierLocationResponseSchema,
  customerOrdersResponseSchema,
  orderTrackingResponseSchema,
  reorderResponseSchema,
  type customerOrderSchema,
  type orderTrackingSchema,
  type reorderResultSchema,
} from '../schemas';

export type CustomerOrder = z.infer<typeof customerOrderSchema>;
export type OrderTracking = z.infer<typeof orderTrackingSchema>;
export type ReorderResult = z.infer<typeof reorderResultSchema>;

export async function fetchMyOrders(): Promise<CustomerOrder[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'me/orders',
    headers: sessionHeaders(),
    schema: customerOrdersResponseSchema,
  });
  return res.data;
}

export async function fetchOrderTracking(orderId: string): Promise<OrderTracking> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `orders/${orderId}`,
    headers: sessionHeaders(),
    schema: orderTrackingResponseSchema,
  });
  return res.data;
}

export async function fetchCourierLocation(orderId: string) {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `orders/${orderId}/courier-location`,
    headers: sessionHeaders(),
    schema: courierLocationResponseSchema,
  });
  return res.data;
}

export async function reorderOrder(orderId: string): Promise<ReorderResult> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: `orders/${orderId}/reorder`,
    headers: sessionHeaders(),
    schema: reorderResponseSchema,
  });
  return res.data;
}
