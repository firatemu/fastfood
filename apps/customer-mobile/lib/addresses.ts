import { getApiClient } from './api';
import { cacheAddresses } from './private-cache';
import {
  addressMutationResponseSchema,
  addressGeographyOptionsResponseSchema,
  addressesResponseSchema,
  okResponseSchema,
  type CustomerAddress,
} from './schemas';

export type AddressWriteBody = {
  label?: string;
  recipientName: string;
  recipientPhone: string;
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
  floorApartment?: string;
  deliveryNote?: string;
  accessCode?: string;
  isDefault?: boolean;
};

export type AddressCreateBody = AddressWriteBody & {
  label: string;
  provinceId: number;
  districtId: number;
  neighborhoodId: number;
};

export async function listAddressProvinces() {
  const res = await getApiClient().request({
    path: '/me/address-geography/provinces',
    schema: addressGeographyOptionsResponseSchema,
  });
  return res.data;
}

export async function listAddressDistricts(provinceId: number) {
  const res = await getApiClient().request({
    path: `/me/address-geography/provinces/${provinceId}/districts`,
    schema: addressGeographyOptionsResponseSchema,
  });
  return res.data;
}

export async function listAddressNeighborhoods(districtId: number) {
  const res = await getApiClient().request({
    path: `/me/address-geography/districts/${districtId}/neighborhoods`,
    schema: addressGeographyOptionsResponseSchema,
  });
  return res.data;
}

export async function listCustomerAddresses(): Promise<CustomerAddress[]> {
  const res = await getApiClient().request({
    path: '/me/addresses',
    schema: addressesResponseSchema,
  });
  cacheAddresses(res.data);
  return res.data;
}

export async function createCustomerAddress(body: AddressCreateBody): Promise<CustomerAddress> {
  const res = await getApiClient().request({
    method: 'POST',
    path: '/me/addresses',
    body: { countryCode: 'TR', ...body },
    schema: addressMutationResponseSchema,
  });
  return res.data;
}

export async function updateCustomerAddress(
  id: string,
  body: Partial<AddressWriteBody>,
): Promise<CustomerAddress> {
  const res = await getApiClient().request({
    method: 'PATCH',
    path: `/me/addresses/${id}`,
    body,
    schema: addressMutationResponseSchema,
  });
  return res.data;
}

export async function deleteCustomerAddress(id: string): Promise<void> {
  await getApiClient().request({
    method: 'DELETE',
    path: `/me/addresses/${id}`,
    schema: okResponseSchema,
  });
}
