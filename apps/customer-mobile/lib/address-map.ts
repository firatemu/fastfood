import { ADDRESS_ALLOWED_PROVINCE_IDS } from '@fastfood/contracts';

import type { AddressCreateBody } from './addresses';
import { isE164Phone, normalizePhoneInput } from './phone';
import type { CustomerAddress } from './schemas';

export type AddressForm = {
  label: string;
  recipientName: string;
  recipientPhone: string;
  provinceId: string;
  neighborhoodId: string;
  avenue: string;
  city: string;
  district: string;
  districtId: string;
  floor: string;
  apartmentNumber: string;
  street: string;
  buildingNumber: string;
  accessCode: string;
  deliveryNote: string;
  isDefault: boolean;
  latitude: string;
  longitude: string;
  locationConfirmed: boolean;
};

export function emptyAddressForm(): AddressForm {
  return {
    label: '',
    recipientName: '',
    recipientPhone: '',
    provinceId: '',
    neighborhoodId: '',
    avenue: '',
    city: '',
    district: '',
    districtId: '',
    floor: '',
    apartmentNumber: '',
    street: '',
    buildingNumber: '',
    accessCode: '',
    deliveryNote: '',
    isDefault: false,
    latitude: '',
    longitude: '',
    locationConfirmed: false,
  };
}

export function addressToForm(address: CustomerAddress): AddressForm {
  return {
    label: address.label ?? '',
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    provinceId: address.provinceId ? String(address.provinceId) : '',
    neighborhoodId: address.neighborhoodId ? String(address.neighborhoodId) : '',
    avenue: address.avenue ?? '',
    city: address.city ?? '',
    district: address.district ?? '',
    districtId: address.districtId ? String(address.districtId) : '',
    floor: address.floor ?? '',
    apartmentNumber: address.apartmentNumber ?? '',
    street: address.street ?? '',
    buildingNumber: address.buildingNumber ?? '',
    accessCode: address.accessCode ?? '',
    deliveryNote: address.deliveryNote ?? '',
    isDefault: address.isDefault === true,
    latitude: String(address.latitude),
    longitude: String(address.longitude),
    locationConfirmed: true,
  };
}

export type AddressMapResult =
  | { ok: true; body: AddressCreateBody }
  | { ok: false; message: string };

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function addressFormToWriteBody(form: AddressForm): AddressMapResult {
  const recipientName = form.recipientName.trim();
  if (recipientName.length < 1) {
    return { ok: false, message: 'Alıcı adı gerekli.' };
  }
  const label = form.label.trim();
  if (label.length < 1) {
    return { ok: false, message: 'Adres ismi gerekli.' };
  }
  const recipientPhone = normalizePhoneInput(form.recipientPhone);
  if (!isE164Phone(recipientPhone)) {
    return { ok: false, message: 'Telefon +90… biçiminde olmalı.' };
  }
  const provinceId = Number(form.provinceId);
  const districtId = Number(form.districtId);
  const neighborhoodId = Number(form.neighborhoodId);
  if (
    ![provinceId, districtId, neighborhoodId].every((id) => Number.isInteger(id) && id > 0) ||
    !(ADDRESS_ALLOWED_PROVINCE_IDS as readonly number[]).includes(provinceId)
  ) {
    return { ok: false, message: 'İl, ilçe ve mahalle seçimi zorunludur.' };
  }
  if (!form.locationConfirmed) {
    return { ok: false, message: 'Adresi kaydetmeden önce haritadan konum seçin.' };
  }
  if (!form.latitude.trim() || !form.longitude.trim()) {
    return { ok: false, message: 'Adresi kaydetmeden önce haritadan konum seçin.' };
  }
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, message: 'Geçerli bir enlem girin.' };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, message: 'Geçerli bir boylam girin.' };
  }
  return {
    ok: true,
    body: {
      label,
      recipientName,
      recipientPhone,
      latitude,
      longitude,
      locationConfirmed: true,
      countryCode: 'TR',
      provinceId,
      districtId,
      neighborhoodId,
      city: optional(form.city),
      province: optional(form.city),
      avenue: optional(form.avenue),
      street: optional(form.street),
      buildingNumber: optional(form.buildingNumber),
      floor: optional(form.floor),
      apartmentNumber: optional(form.apartmentNumber),
      accessCode: optional(form.accessCode),
      deliveryNote: optional(form.deliveryNote),
      isDefault: form.isDefault,
    },
  };
}

export function addressLine(address: CustomerAddress): string {
  return [
    address.neighborhood,
    address.avenue,
    address.street,
    address.buildingNumber,
    address.floor ? `${address.floor}. Kat` : null,
    address.apartmentNumber ? `Daire ${address.apartmentNumber}` : null,
    address.district,
    address.province ?? address.city,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(', ');
}
