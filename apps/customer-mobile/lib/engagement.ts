import { getApiClient } from './api';
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
  type ClubSnapshot,
  type DiningTable,
  type InboxNotification,
  type SpinEligibility,
  type SpinPlay,
  type SupportConversation,
  type SupportMessage,
} from './schemas';

export async function fetchClub(): Promise<ClubSnapshot> {
  const res = await getApiClient().request({
    path: '/me/club',
    schema: clubResponseSchema,
  });
  return res.data;
}

export async function fetchSpin(): Promise<SpinEligibility> {
  const res = await getApiClient().request({
    path: '/me/spin',
    schema: spinEligibilityResponseSchema,
  });
  return res.data;
}

export async function playSpin(idempotencyKey: string): Promise<SpinPlay> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/me/spin',
    body: { idempotencyKey },
    schema: spinPlayResponseSchema,
  });
  return res.data;
}

export async function fetchNotifications(): Promise<{
  items: InboxNotification[];
  unreadCount: number;
}> {
  const res = await getApiClient().request({
    path: '/me/notifications',
    schema: notificationsResponseSchema,
  });
  return res.data;
}

export async function markNotificationRead(id: string): Promise<InboxNotification> {
  const res = await getApiClient().request({
    method: 'PATCH',
    path: `/me/notifications/${id}/read`,
    schema: notificationItemResponseSchema,
  });
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await getApiClient().request({
    method: 'POST',
    path: '/me/notifications/read-all',
    schema: okResponseSchema,
  });
}

export async function openSupport(orderId?: string): Promise<SupportConversation> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/me/support/conversations',
    body: orderId ? { orderId } : {},
    schema: supportConversationResponseSchema,
  });
  return res.data;
}

export async function fetchSupport(id: string): Promise<SupportConversation> {
  const res = await getApiClient().request({
    path: `/me/support/conversations/${id}`,
    schema: supportConversationResponseSchema,
  });
  return res.data;
}

export async function sendSupportMessage(
  conversationId: string,
  body: string,
  clientRequestId: string,
): Promise<SupportMessage> {
  const res = await getApiClient().request({
    method: 'POST',
    path: `/me/support/conversations/${conversationId}/messages`,
    body: { body, clientRequestId },
    schema: supportMessageResponseSchema,
  });
  return res.data;
}

export async function listSupport(): Promise<SupportConversation[]> {
  const res = await getApiClient().request({
    path: '/me/support/conversations',
    schema: supportConversationsResponseSchema,
  });
  return res.data;
}

export async function fetchDiningTable(code: string): Promise<DiningTable> {
  const res = await getApiClient().request({
    path: `/storefront/tables/${encodeURIComponent(code)}`,
    schema: diningTableResponseSchema,
  });
  return res.data;
}

export async function scanDiningTable(code: string): Promise<DiningTable> {
  const res = await getApiClient().request({
    method: 'POST',
    path: `/storefront/tables/${encodeURIComponent(code)}/scan`,
    schema: diningTableResponseSchema,
  });
  return res.data;
}
