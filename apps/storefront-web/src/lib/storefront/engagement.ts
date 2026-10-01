import type { z } from 'zod';

import { createStorefrontClient, sessionHeaders } from '../api';
import {
  clubResponseSchema,
  diningTableResponseSchema,
  notificationItemResponseSchema,
  notificationsResponseSchema,
  okResponseSchema,
  spinEligibilityResponseSchema,
  spinPlayResponseSchema,
  supportConversationResponseSchema,
  supportConversationsResponseSchema,
  supportMessageResponseSchema,
  type clubSnapshotSchema,
  type diningTableSchema,
  type notificationItemSchema,
  type spinEligibilitySchema,
  type spinPlaySchema,
  type supportConversationSchema,
  type supportMessageSchema,
} from '../schemas';

export type ClubSnapshot = z.infer<typeof clubSnapshotSchema>;
export type SpinEligibility = z.infer<typeof spinEligibilitySchema>;
export type SpinPlay = z.infer<typeof spinPlaySchema>;
export type InboxNotification = z.infer<typeof notificationItemSchema>;
export type SupportConversation = z.infer<typeof supportConversationSchema>;
export type SupportMessage = z.infer<typeof supportMessageSchema>;
export type DiningTable = z.infer<typeof diningTableSchema>;

export async function fetchClub(): Promise<ClubSnapshot> {
  const res = await createStorefrontClient().request({
    path: 'me/club',
    headers: sessionHeaders(),
    schema: clubResponseSchema,
  });
  return res.data;
}

export async function fetchSpin(): Promise<SpinEligibility> {
  const res = await createStorefrontClient().request({
    path: 'me/spin',
    headers: sessionHeaders(),
    schema: spinEligibilityResponseSchema,
  });
  return res.data;
}

export async function playSpin(idempotencyKey: string): Promise<SpinPlay> {
  const res = await createStorefrontClient().request({
    method: 'POST',
    path: 'me/spin',
    headers: sessionHeaders(),
    body: { idempotencyKey },
    schema: spinPlayResponseSchema,
  });
  return res.data;
}

export async function fetchNotifications(): Promise<{
  items: InboxNotification[];
  unreadCount: number;
}> {
  const res = await createStorefrontClient().request({
    path: 'me/notifications',
    headers: sessionHeaders(),
    schema: notificationsResponseSchema,
  });
  return res.data;
}

export async function markNotificationRead(id: string): Promise<InboxNotification> {
  const res = await createStorefrontClient().request({
    method: 'PATCH',
    path: `me/notifications/${id}/read`,
    headers: sessionHeaders(),
    schema: notificationItemResponseSchema,
  });
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await createStorefrontClient().request({
    method: 'POST',
    path: 'me/notifications/read-all',
    headers: sessionHeaders(),
    schema: okResponseSchema,
  });
}

export async function openSupport(orderId?: string): Promise<SupportConversation> {
  const res = await createStorefrontClient().request({
    method: 'POST',
    path: 'me/support/conversations',
    headers: sessionHeaders(),
    body: orderId ? { orderId } : {},
    schema: supportConversationResponseSchema,
  });
  return res.data;
}

export async function fetchSupport(id: string): Promise<SupportConversation> {
  const res = await createStorefrontClient().request({
    path: `me/support/conversations/${id}`,
    headers: sessionHeaders(),
    schema: supportConversationResponseSchema,
  });
  return res.data;
}

export async function sendSupportMessage(
  conversationId: string,
  body: string,
  clientRequestId: string,
): Promise<SupportMessage> {
  const res = await createStorefrontClient().request({
    method: 'POST',
    path: `me/support/conversations/${conversationId}/messages`,
    headers: sessionHeaders(),
    body: { body, clientRequestId },
    schema: supportMessageResponseSchema,
  });
  return res.data;
}

export async function listSupport(): Promise<SupportConversation[]> {
  const res = await createStorefrontClient().request({
    path: 'me/support/conversations',
    headers: sessionHeaders(),
    schema: supportConversationsResponseSchema,
  });
  return res.data;
}

export async function fetchDiningTable(code: string): Promise<DiningTable> {
  const res = await createStorefrontClient().request({
    path: `storefront/tables/${encodeURIComponent(code)}`,
    headers: sessionHeaders(),
    schema: diningTableResponseSchema,
  });
  return res.data;
}

export async function scanDiningTable(code: string): Promise<DiningTable> {
  const res = await createStorefrontClient().request({
    method: 'POST',
    path: `storefront/tables/${encodeURIComponent(code)}/scan`,
    headers: sessionHeaders(),
    schema: diningTableResponseSchema,
  });
  return res.data;
}

const TABLE_KEY = 'ff_dining_table';

export function readDiningContext(): DiningTable | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TABLE_KEY);
    return raw ? (JSON.parse(raw) as DiningTable) : null;
  } catch {
    return null;
  }
}

export function writeDiningContext(table: DiningTable): void {
  window.localStorage.setItem(TABLE_KEY, JSON.stringify(table));
}

export function clearDiningContext(): void {
  window.localStorage.removeItem(TABLE_KEY);
}
