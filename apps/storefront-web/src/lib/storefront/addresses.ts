import type { z } from 'zod';

import { createStorefrontClient, sessionHeaders } from '../api';
import {
  addressMutationResponseSchema,
  addressGeographyOptionsResponseSchema,
  addressesResponseSchema,
  type customerAddressSchema,
  okResponseSchema,
} from '../schemas';

export type CustomerAddress = z.infer<typeof customerAddressSchema>;

export async function listAddressProvinces() {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'me/address-geography/provinces',
    headers: sessionHeaders(),
    schema: addressGeographyOptionsResponseSchema,
  });
  return res.data;
}

export async function listAddressDistricts(provinceId: number) {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `me/address-geography/provinces/${provinceId}/districts`,
    headers: sessionHeaders(),
    schema: addressGeographyOptionsResponseSchema,
  });
  return res.data;
}

export async function listAddressNeighborhoods(districtId: number) {
  const client = createStorefrontClient();
  const res = await client.request({
    path: `me/address-geography/districts/${districtId}/neighborhoods`,
    headers: sessionHeaders(),
    schema: addressGeographyOptionsResponseSchema,
  });
  return res.data;
}

export async function listCustomerAddresses(): Promise<CustomerAddress[]> {
  const client = createStorefrontClient();
  const res = await client.request({
    path: 'me/addresses',
    headers: sessionHeaders(),
    schema: addressesResponseSchema,
  });
  return res.data;
}

export type AddressWriteBody = {
  label?: string;
  recipientName?: string;
  recipientPhone?: string;
  latitude: number;
  longitude: number;
  locationConfirmed: true;
  countryCode?: string;
  provinceId?: number;
  districtId?: number;
  neighborhoodId?: number;
  province?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  avenue?: string;
  street?: string;
  buildingNumber?: string;
  floor?: string;
  apartmentNumber?: string;
  deliveryNote?: string;
  accessCode?: string;
  isDefault?: boolean;
};

export type AddressUpdateBody = Partial<AddressWriteBody>;

export type AddressCreateBody = AddressWriteBody & {
  label: string;
  recipientName: string;
  recipientPhone: string;
  provinceId: number;
  districtId: number;
  neighborhoodId: number;
};

export async function createCustomerAddress(body: AddressCreateBody): Promise<CustomerAddress> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'POST',
    path: 'me/addresses',
    headers: sessionHeaders(),
    body: { countryCode: 'TR', ...body },
    schema: addressMutationResponseSchema,
  });
  return res.data;
}

export async function updateCustomerAddress(
  id: string,
  body: AddressUpdateBody,
): Promise<CustomerAddress> {
  const client = createStorefrontClient();
  const res = await client.request({
    method: 'PATCH',
    path: `me/addresses/${id}`,
    headers: sessionHeaders(),
    body: { countryCode: 'TR', ...body },
    schema: addressMutationResponseSchema,
  });
  return res.data;
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  const client = createStorefrontClient();
  await client.request({
    method: 'DELETE',
    path: `me/addresses/${id}`,
    headers: sessionHeaders(),
    schema: okResponseSchema,
  });
}
