'use client';

import { useEffect, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { fetchCustomerProfile } from '../../lib/storefront/account';
import type { AddressMapPoint } from '../../lib/storefront/address-map-html';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  listAddressDistricts,
  listAddressNeighborhoods,
  listAddressProvinces,
  listCustomerAddresses,
  updateCustomerAddress,
  type CustomerAddress,
} from '../../lib/storefront/addresses';
import { checkDeliveryServiceability } from '../../lib/storefront/serviceability';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountNav } from './account-nav';
import { RequireCustomer } from './account-page';
import { AddressLocationPicker } from './address-location-picker';
import { ShopError, ShopSkeleton } from './shop-states';

type Option = { id: number; name: string; centerLatitude?: number; centerLongitude?: number };

const fieldClass = 'h-12 px-4 rounded-lg bg-surface-container-low';

export function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serviceNote, setServiceNote] = useState<Record<string, string>>({});
  const [selectedLocation, setSelectedLocation] = useState<AddressMapPoint | null>(null);
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Option[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [form, setForm] = useState({
    label: '',
    provinceId: '',
    districtId: '',
    neighborhoodId: '',
    avenue: '',
    street: '',
    buildingNumber: '',
    floor: '',
    apartmentNumber: '',
    deliveryNote: '',
    isDefault: true,
  });

  const selectedProvince = provinces.find((option) => String(option.id) === form.provinceId);
  async function load() {
    try {
      const rows = await listCustomerAddresses();
      setAddresses(rows);
      const notes: Record<string, string> = {};
      await Promise.all(
        rows.map(async (row) => {
          try {
            const loc = await checkDeliveryServiceability(
              row.latitude,
              row.longitude,
              row.label ?? row.street ?? 'Adres',
            );
            notes[row.id] = loc.serviceable ? 'Teslimat var' : 'Kayıtlı; teslimat bölgesi dışında';
          } catch {
            notes[row.id] = 'Teslimat kontrolü yapılamadı';
          }
        }),
      );
      setServiceNote(notes);
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
    void listAddressProvinces()
      .then(setProvinces)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    if (!form.provinceId) return;
    let active = true;
    void listAddressDistricts(Number(form.provinceId)).then(
      (options) => {
        if (active) {
          setDistricts(options);
          setDistrictsLoading(false);
        }
      },
      (err: unknown) => {
        if (active) {
          setError(errorMessage(err));
          setDistrictsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [form.provinceId]);

  useEffect(() => {
    if (!form.districtId) return;
    let active = true;
    void listAddressNeighborhoods(Number(form.districtId)).then(
      (options) => {
        if (active) {
          setNeighborhoods(options);
          setNeighborhoodsLoading(false);
        }
      },
      (err: unknown) => {
        if (active) {
          setError(errorMessage(err));
          setNeighborhoodsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [form.districtId]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedLocation) {
      setError('Adresi kaydetmeden önce haritadan konum seçin.');
      return;
    }
    if (!form.provinceId || !form.districtId || !form.neighborhoodId) {
      setError('İl, ilçe ve mahalle seçimi zorunludur.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const province = provinces.find((option) => String(option.id) === form.provinceId);
      const district = districts.find((option) => String(option.id) === form.districtId);
      const neighborhood = neighborhoods.find(
        (option) => String(option.id) === form.neighborhoodId,
      );
      if (!province || !district || !neighborhood)
        throw new Error('İl, ilçe ve mahalle seçimlerini yeniden yapın.');
      const profile = await fetchCustomerProfile();
      const recipientPhone = profile.phone?.trim() ?? '';
      if (!/^\+\d{10,15}$/.test(recipientPhone)) {
        throw new Error('Hesap profilinizde geçerli bir telefon bulunamadı.');
      }
      await createCustomerAddress({
        label: form.label.trim(),
        recipientName: profile.displayName?.trim() || 'Müşteri',
        recipientPhone,
        provinceId: province.id,
        districtId: district.id,
        neighborhoodId: neighborhood.id,
        province: province.name,
        city: province.name,
        district: district.name,
        neighborhood: neighborhood.name,
        avenue: form.avenue.trim() || undefined,
        street: form.street.trim() || undefined,
        buildingNumber: form.buildingNumber.trim() || undefined,
        floor: form.floor.trim() || undefined,
        apartmentNumber: form.apartmentNumber.trim() || undefined,
        deliveryNote: form.deliveryNote.trim() || undefined,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        locationConfirmed: true,
        isDefault: form.isDefault,
        countryCode: 'TR',
      });
      setSelectedLocation(null);
      setForm({
        label: '',
        provinceId: '',
        districtId: '',
        neighborhoodId: '',
        avenue: '',
        street: '',
        buildingNumber: '',
        floor: '',
        apartmentNumber: '',
        deliveryNote: '',
        isDefault: false,
      });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading')
    return (
      <RequireCustomer>
        <ShopSkeleton />
      </RequireCustomer>
    );
  if (status === 'error' && addresses.length === 0)
    return (
      <ShopError title="Adresler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
    );

  return (
    <RequireCustomer>
      <div className="w-full pt-20 bg-background min-h-screen" data-ff-surface="account-addresses">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <aside className="lg:col-span-3">
            <AccountNav />
          </aside>
          <div className="lg:col-span-9 flex flex-col gap-space-lg min-w-0">
            <h1 className="font-headline-md uppercase">Kayıtlı adresler</h1>
            {addresses.length === 0 ? (
              <p className="font-body-md text-on-surface-variant">Kayıtlı adres yok.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className="rounded-xl bg-surface-container p-space-md break-words"
                    data-ff-address-card
                  >
                    <p className="font-label-lg uppercase">{address.label || 'Adres'}</p>
                    <p className="font-body-sm text-on-surface-variant">
                      {[
                        address.neighborhood,
                        address.avenue,
                        address.street,
                        address.buildingNumber,
                        address.floor ? `${address.floor}. Kat` : null,
                        address.apartmentNumber ? `Daire ${address.apartmentNumber}` : null,
                        address.district,
                        address.province ?? address.city,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {address.deliveryNote ? (
                      <p className="font-body-sm">Tarif: {address.deliveryNote}</p>
                    ) : null}
                    <p className="font-label-sm mt-2 text-secondary">{serviceNote[address.id]}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg bg-surface-container-high font-label-sm uppercase"
                        onClick={() =>
                          void updateCustomerAddress(address.id, {
                            recipientName: address.recipientName,
                            recipientPhone: address.recipientPhone,
                            label: address.label ?? undefined,
                            isDefault: true,
                          }).then(() => load())
                        }
                      >
                        Birincil yap
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg bg-error-container text-on-error-container font-label-sm uppercase"
                        onClick={() => void deleteCustomerAddress(address.id).then(() => load())}
                      >
                        Sil
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(event) => void add(event)}
              className="rounded-xl bg-surface-container p-space-md flex flex-col gap-3"
              data-ff-address-form
            >
              <h2 className="font-headline-sm uppercase">Yeni adres</h2>
              {error ? <p className="text-error font-body-sm">{error}</p> : null}
              <input
                className={fieldClass}
                placeholder="Adres ismi"
                aria-label="Adres ismi"
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
              <select
                className={fieldClass}
                aria-label="İl"
                required
                value={form.provinceId}
                onChange={(e) => {
                  setSelectedLocation(null);
                  setDistricts([]);
                  setNeighborhoods([]);
                  setDistrictsLoading(Boolean(e.target.value));
                  setNeighborhoodsLoading(false);
                  setForm({
                    ...form,
                    provinceId: e.target.value,
                    districtId: '',
                    neighborhoodId: '',
                  });
                }}
              >
                <option value="">İl seçin</option>
                {provinces.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                aria-label="İlçe"
                required
                disabled={!form.provinceId || districtsLoading}
                value={form.districtId}
                onChange={(e) => {
                  setNeighborhoods([]);
                  setNeighborhoodsLoading(Boolean(e.target.value));
                  setForm({ ...form, districtId: e.target.value, neighborhoodId: '' });
                }}
              >
                <option value="">{districtsLoading ? 'İlçeler yükleniyor…' : 'İlçe seçin'}</option>
                {districts.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                aria-label="Mahalle"
                required
                disabled={!form.districtId || neighborhoodsLoading}
                value={form.neighborhoodId}
                onChange={(e) => setForm({ ...form, neighborhoodId: e.target.value })}
              >
                <option value="">
                  {neighborhoodsLoading ? 'Mahalleler yükleniyor…' : 'Mahalle seçin'}
                </option>
                {neighborhoods.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <AddressLocationPicker
                key={form.provinceId || 'province-unselected'}
                center={
                  selectedProvince?.centerLatitude !== undefined &&
                  selectedProvince.centerLongitude !== undefined
                    ? {
                        latitude: selectedProvince.centerLatitude,
                        longitude: selectedProvince.centerLongitude,
                      }
                    : null
                }
                onSelect={setSelectedLocation}
              />
              <p className="font-body-sm text-on-surface-variant" aria-live="polite">
                {selectedLocation
                  ? `Harita konumu seçildi: ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
                  : 'Adres kaydı için haritadan bir konum seçmelisin.'}
              </p>
              {(
                [
                  ['Cadde', 'avenue'],
                  ['Sokak', 'street'],
                  ['Bina no / isim', 'buildingNumber'],
                  ['Kat', 'floor'],
                  ['Daire no', 'apartmentNumber'],
                ] as const
              ).map(([label, key]) => (
                <input
                  key={key}
                  className={fieldClass}
                  placeholder={label}
                  aria-label={label}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              ))}
              <textarea
                className="min-h-20 px-4 py-3 rounded-lg bg-surface-container-low"
                placeholder="Adres tarifi"
                aria-label="Adres tarifi"
                value={form.deliveryNote}
                onChange={(e) => setForm({ ...form, deliveryNote: e.target.value })}
              />
              <button
                type="submit"
                disabled={saving || !selectedLocation || !form.neighborhoodId}
                className="h-12 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg uppercase disabled:opacity-50"
              >
                Adresi kaydet
              </button>
            </form>
          </div>
        </div>
      </div>
    </RequireCustomer>
  );
}
