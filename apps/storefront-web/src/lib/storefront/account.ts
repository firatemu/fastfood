import type { z } from 'zod';

import { createStorefrontClient, sessionHeaders } from '../api';
import {
  accountDeletionResponseSchema,
  customerPreferenceResponseSchema,
  customerProfileResponseSchema,
  loyaltyResponseSchema,
  type customerPreferenceSchema,
  type customerProfileSchema,
} from '../schemas';

export type CustomerProfile = z.infer<typeof customerProfileSchema>;
export type CustomerPreference = z.infer<typeof customerPreferenceSchema>;
export type { CustomerOrder } from './orders';
export { fetchMyOrders } from './orders';

export async function fetchCustomerProfile(): Promise<CustomerProfile> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'me',
    headers: sessionHeaders(),
    schema: customerProfileResponseSchema,
  });
  return res.data;
}

export async function patchCustomerProfile(patch: {
  displayName?: string;
  locale?: string;
  email?: string;
}): Promise<CustomerProfile> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'PATCH',
    path: 'me',
    headers: sessionHeaders(),
    body: patch,
    schema: customerProfileResponseSchema,
  });
  return res.data;
}

export async function deleteCustomerAccount(): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'DELETE',
    path: 'me',
    headers: sessionHeaders(),
    body: { confirm: true },
    schema: accountDeletionResponseSchema,
  });
}

export async function fetchCustomerPreferences(): Promise<CustomerPreference> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'me/preferences',
    headers: sessionHeaders(),
    schema: customerPreferenceResponseSchema,
  });
  return res.data;
}

export async function patchCustomerPreferences(
  patch: Partial<CustomerPreference>,
): Promise<CustomerPreference> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'PATCH',
    path: 'me/preferences',
    headers: sessionHeaders(),
    body: patch,
    schema: customerPreferenceResponseSchema,
  });
  return res.data;
}

export async function fetchLoyaltyPoints(): Promise<string> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'me/loyalty',
    headers: sessionHeaders(),
    schema: loyaltyResponseSchema,
  });
  return res.data.points;
}
