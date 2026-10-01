import { getApiClient } from './api';
import { cacheLoyaltyPoints, cachePreferences, cacheProfile } from './private-cache';
import {
  customerPreferenceResponseSchema,
  customerProfileResponseSchema,
  loyaltyResponseSchema,
  type CustomerPreference,
  type CustomerProfile,
} from './schemas';

export async function fetchCustomerProfile(): Promise<CustomerProfile> {
  const res = await getApiClient().request({
    path: '/me',
    schema: customerProfileResponseSchema,
  });
  cacheProfile(res.data);
  return res.data;
}

export async function patchCustomerProfile(patch: {
  displayName?: string;
  locale?: string;
  email?: string;
}): Promise<CustomerProfile> {
  const res = await getApiClient().request({
    method: 'PATCH',
    path: '/me',
    body: patch,
    schema: customerProfileResponseSchema,
  });
  cacheProfile(res.data);
  return res.data;
}

export async function fetchCustomerPreferences(): Promise<CustomerPreference> {
  const res = await getApiClient().request({
    path: '/me/preferences',
    schema: customerPreferenceResponseSchema,
  });
  cachePreferences(res.data);
  return res.data;
}

export async function patchCustomerPreferences(
  patch: Partial<Pick<CustomerPreference, 'marketingOptIn' | 'newsletterOptIn' | 'orderUpdatesOptIn' | 'locale'>>,
): Promise<CustomerPreference> {
  const res = await getApiClient().request({
    method: 'PATCH',
    path: '/me/preferences',
    body: patch,
    schema: customerPreferenceResponseSchema,
  });
  cachePreferences(res.data);
  return res.data;
}

export async function fetchLoyaltyPoints(): Promise<string> {
  const res = await getApiClient().request({
    path: '/me/loyalty',
    schema: loyaltyResponseSchema,
  });
  cacheLoyaltyPoints(res.data.points);
  return res.data.points;
}
