'use client';

import { useCallback, useEffect, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { deviceLocationMessage, getDeviceLocation } from '../../lib/device-location';
import { errorMessage } from '../../lib/load-state';
import { fetchCustomerProfile } from '../../lib/storefront/account';
import {
  composerFormFromAddress,
  emptyComposerForm,
  type ComposerForm,
  type ComposerOption,
} from '../../lib/storefront/address-form';
import type { AddressMapPoint } from '../../lib/storefront/address-map-html';
import { isPointOutsideProvince } from '../../lib/storefront/address-point';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  listAddressDistricts,
  listAddressNeighborhoods,
  listAddressProvinces,
  listCustomerAddresses,
  updateCustomerAddress,
  type AddressWriteBody,
  type CustomerAddress,
} from '../../lib/storefront/addresses';
import { checkDeliveryServiceability } from '../../lib/storefront/serviceability';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { AddressComposer } from './address-composer';
import { AddressLocationPicker } from './address-location-picker';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

type ServiceNote = { tone: 'delivery' | 'outside' | 'unknown'; label: string };

function placeLine(address: CustomerAddress): string {
  return [
    address.neighborhood,
    address.avenue,
    address.street,
    address.buildingNumber,
    address.floor ? `${address.floor}. kat` : null,
    address.apartmentNumber ? `Daire ${address.apartmentNumber}` : null,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(', ');
}

function cityLine(address: CustomerAddress): string {
  return [address.district, address.province ?? address.city]
    .filter((part) => part && part.trim().length > 0)
    .join(' · ');
}

/**
 * Address book.
 *
 * A ledger, not a card deck: one hairline-bordered list of rows on the left,
 * a sticky map on the right. Selection is a real radio group with arrow-key
 * handling — the previous version put an `onClick` on an `<article>`, which a
 * mouse could reach and a keyboard could not. Deleting asks first, because an
 * address is the one record on this screen that cannot be reconstructed from
 * anything the account already holds.
 */
export function AccountAddressesPage() {
  const { confirm, toast, profile } = useAccountUi();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [serviceNote, setServiceNote] = useState<Record<string, ServiceNote>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<AddressMapPoint | null>(null);
  const [devicePoint, setDevicePoint] = useState<AddressMapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<ComposerOption[]>([]);
  const [districts, setDistricts] = useState<ComposerOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<ComposerOption[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [form, setForm] = useState<ComposerForm>(emptyComposerForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [geoToken, setGeoToken] = useState(0);
  const [composerPoint, setComposerPoint] = useState<AddressMapPoint | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listCustomerAddresses();
      setAddresses(rows);
      setSelectedId(
        (current) => current ?? rows.find((row) => row.isDefault)?.id ?? rows[0]?.id ?? null,
      );
      const notes: Record<string, ServiceNote> = {};
      await Promise.all(
        rows.map(async (row) => {
          try {
            const loc = await checkDeliveryServiceability(
              row.latitude,
              row.longitude,
              row.label ?? row.street ?? 'Adres',
            );
            notes[row.id] = loc.serviceable
              ? { tone: 'delivery', label: 'Teslimat var' }
              : { tone: 'outside', label: 'Bölge dışı · kaydedilir' };
          } catch {
            notes[row.id] = { tone: 'unknown', label: 'Kontrol edilemedi' };
          }
        }),
      );
      setServiceNote(notes);
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }, []);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
    void listAddressProvinces()
      .then(setProvinces)
      .catch((err) => setError(errorMessage(err)));
  }, [load]);

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
  }, [form.provinceId, geoToken]);

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
  }, [form.districtId, geoToken]);

  function resetComposer() {
    setEditingId(null);
    setForm(emptyComposerForm());
    setDistricts([]);
    setNeighborhoods([]);
    setDistrictsLoading(false);
    setNeighborhoodsLoading(false);
    setSelectedLocation(null);
    setComposerPoint(null);
    setDevicePoint(null);
    setLocationError(null);
    setError(null);
  }

  function openComposer() {
    resetComposer();
    setGeoToken((token) => token + 1);
    setComposerOpen(true);
  }

  function openEdit(address: CustomerAddress) {
    const point = { latitude: address.latitude, longitude: address.longitude };
    setEditingId(address.id);
    setSelectedId(address.id);
    setForm(composerFormFromAddress(address));
    setDistricts([]);
    setNeighborhoods([]);
    setDistrictsLoading(Boolean(address.provinceId));
    setNeighborhoodsLoading(Boolean(address.districtId));
    setSelectedLocation(point);
    setComposerPoint(point);
    setDevicePoint(null);
    setLocationError(null);
    setError(null);
    setGeoToken((token) => token + 1);
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    resetComposer();
  }

  async function selectDeviceLocation() {
    if (locating) return;
    setLocating(true);
    setLocationError(null);
    try {
      const point = await getDeviceLocation();
      setDevicePoint(point);
      setSelectedLocation(point);
    } catch (err) {
      setLocationError(deviceLocationMessage(err));
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    const editing = editingId ? (addresses.find((row) => row.id === editingId) ?? null) : null;
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
      if (
        province.centerLatitude !== undefined &&
        province.centerLongitude !== undefined &&
        isPointOutsideProvince(selectedLocation, {
          latitude: province.centerLatitude,
          longitude: province.centerLongitude,
        })
      ) {
        throw new Error(
          `Seçilen konum ${province.name} sınırları dışında görünüyor. Haritadan konumu yeniden seç.`,
        );
      }
      const place: AddressWriteBody = {
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
      };
      const label = form.label.trim();
      if (editing) {
        const updated = await updateCustomerAddress(editing.id, {
          ...place,
          label,
          recipientName: editing.recipientName,
          recipientPhone: editing.recipientPhone,
        });
        setSelectedId(updated.id);
        toast.ok('Adres güncellendi.');
      } else {
        const profile = await fetchCustomerProfile();
        const recipientPhone = profile.phone?.trim() ?? '';
        if (!/^\+\d{10,15}$/.test(recipientPhone)) {
          throw new Error('Hesap profilinizde geçerli bir telefon bulunamadı.');
        }
        const created = await createCustomerAddress({
          ...place,
          label,
          provinceId: province.id,
          districtId: district.id,
          neighborhoodId: neighborhood.id,
          recipientName: profile.displayName?.trim() || 'Müşteri',
          recipientPhone,
        });
        setSelectedId(created.id);
        toast.ok('Adres eklendi.');
      }
      closeComposer();
      await load();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      // The inline line above the button is the primary report, but the user is
      // looking at the map when this fails — so it also goes to a toast, like
      // every other mutation on this surface.
      toast.error('Adres kaydedilemedi.', message);
    } finally {
      setSaving(false);
    }
  }

  async function makePrimary(address: CustomerAddress) {
    setBusyId(address.id);
    try {
      await updateCustomerAddress(address.id, {
        recipientName: address.recipientName,
        recipientPhone: address.recipientPhone,
        label: address.label ?? undefined,
        isDefault: true,
      });
      await load();
      toast.ok(`${address.label || 'Adres'} birincil adres olarak ayarlandı.`);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error('Adres güncellenemedi.', message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeAddress(address: CustomerAddress) {
    const ok = await confirm({
      title: 'Adresi sil',
      body: `${address.label ? `"${address.label}"` : 'Bu adres'} kalıcı olarak silinecek. Geri alma imkânı yok.`,
      confirmLabel: 'Adresi sil',
      tone: 'danger',
    });
    if (!ok) return;

    setBusyId(address.id);
    try {
      await deleteCustomerAddress(address.id);
      await load();
      toast.ok('Adres silindi.');
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error('Adres silinemedi.', message);
    } finally {
      setBusyId(null);
    }
  }

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error' && addresses.length === 0) {
    return <ShopError title="Adresler" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  const active =
    addresses.find((address) => address.id === selectedId) ??
    addresses.find((address) => address.isDefault) ??
    addresses[0] ??
    null;

  /*
   * Creating an address sends `recipientPhone` from the profile, and the API
   * only accepts it in E.164 form. Without it the form cannot succeed — so say
   * so before the user fills ten fields, and give them the way out. Editing an
   * existing address is unaffected: it re-sends that address's own recipient.
   */
  const profilePhone = profile.status === 'ready' ? (profile.profile.phone ?? '').trim() : '';
  const profilePhoneReady = /^\+\d{10,15}$/.test(profilePhone);

  return (
    <>
      <AccountShell
        surface="account-addresses"
        eyebrow="Hesap · Adresler"
        title="Adres defteri"
        description="Kurye nereye bıraksın? Kayıtlı teslimat noktaların burada. Bir adresi seç, haritada gör."
        actions={
          <button type="button" onClick={openComposer} className="ff-btn ff-btn-primary" data-ff-new-address>
            <MaterialIcon name="add_location_alt" />
            Yeni adres ekle
          </button>
        }
      >
        {error ? (
          <div className="ff-notice" data-tone="danger" role="alert">
            <MaterialIcon name="error" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="ff-section">
          <div className="ff-section-head">
            <h2 className="ff-section-title">Kayıtlı adresler</h2>
            <p className="ff-section-desc">
              {addresses.length > 0
                ? `${addresses.length} adres kayıtlı. Seçtiğin adres haritada işaretlenir.`
                : 'Henüz adres kaydın yok.'}
            </p>
          </div>
          <div className="ff-section-body">
            {addresses.length === 0 ? (
              <div className="ff-empty">
                <MaterialIcon name="add_location_alt" />
                <p className="ff-empty-title">Henüz adres yok</p>
                <p className="ff-empty-text">
                  İlk teslimat noktanı haritadan işaretle, kurye tam kapına gelsin.
                </p>
                <button type="button" onClick={openComposer} className="ff-btn ff-btn-outline ff-btn-sm">
                  Yeni adres ekle
                </button>
              </div>
            ) : (
              <div className="ff-address-layout">
                <div
                  role="radiogroup"
                  aria-label="Kayıtlı adresler"
                  className="ff-rows"
                  data-ff-address-list
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                    event.preventDefault();
                    const index = addresses.findIndex((row) => row.id === selectedId);
                    if (index < 0) return;
                    const next =
                      event.key === 'ArrowDown'
                        ? (index + 1) % addresses.length
                        : (index - 1 + addresses.length) % addresses.length;
                    const target = addresses[next];
                    if (!target) return;
                    setSelectedId(target.id);
                    document.getElementById(`address-radio-${target.id}`)?.focus();
                  }}
                >
                  {addresses.map((address) => (
                    <AddressRow
                      key={address.id}
                      address={address}
                      note={serviceNote[address.id] ?? { tone: 'unknown', label: 'Kontrol edilemedi' }}
                      selected={active?.id === address.id}
                      busy={busyId === address.id}
                      onSelect={() => setSelectedId(address.id)}
                      onEdit={() => openEdit(address)}
                      onMakePrimary={() => void makePrimary(address)}
                      onRemove={() => void removeAddress(address)}
                    />
                  ))}
                </div>

                <div className="ff-address-map">
                  <AddressLocationPicker
                    readOnly
                    focusPoint={
                      active ? { latitude: active.latitude, longitude: active.longitude } : null
                    }
                  />

                </div>
              </div>
            )}
          </div>
        </section>
      </AccountShell>

      {composerOpen ? (
        <AddressComposer
          mode={editingId ? 'edit' : 'create'}
          form={form}
          onFormChange={setForm}
          provinces={provinces}
          districts={districts}
          neighborhoods={neighborhoods}
          districtsLoading={districtsLoading}
          neighborhoodsLoading={neighborhoodsLoading}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          initialPoint={composerPoint}
          devicePoint={devicePoint}
          locating={locating}
          locationError={locationError}
          onUseDeviceLocation={() => void selectDeviceLocation()}
          error={error}
          saving={saving}
          canSave={Boolean(selectedLocation) && Boolean(form.neighborhoodId)}
          blockedReason={
            editingId || profilePhoneReady
              ? null
              : 'Adres eklemek için profil telefonu gerekli. Profilinizde yok ve kayıt dışında eklenemiyor.'
          }
          blockedHref="/account/support"
          blockedHrefLabel="Destek ekibine yaz"
          onSubmit={() => void handleSave()}
          onClose={closeComposer}
        />
      ) : null}
    </>
  );
}

function AddressRow(props: {
  address: CustomerAddress;
  note: ServiceNote;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onMakePrimary: () => void;
  onRemove: () => void;
}) {
  const { address } = props;
  const radioId = `address-radio-${address.id}`;
  const noteTone =
    props.note.tone === 'delivery' ? 'ok' : props.note.tone === 'outside' ? 'warn' : undefined;

  return (
    <div
      className="ff-row ff-address-row"
      data-ff-address-card
      data-selected={props.selected ? 'true' : 'false'}
      style={{ alignItems: 'flex-start' }}
    >
      <span className="ff-radio">
        <input
          id={radioId}
          type="radio"
          name="customer-address"
          checked={props.selected}
          onChange={props.onSelect}
        />
      </span>

      <label className="ff-row-key" htmlFor={radioId}>
        <span className="ff-cluster" style={{ marginBottom: '0.25rem' }}>
          <span className="ff-row-label">{address.label || 'Adres'}</span>
          {address.isDefault ? (
            <span className="ff-tag" data-tone="brand">
              Birincil
            </span>
          ) : null}
          <span className="ff-tag" data-tone={noteTone}>
            {props.note.label}
          </span>
        </span>
        <span className="ff-row-hint">{placeLine(address)}</span>
        <span className="ff-row-hint">{cityLine(address)}</span>
        {address.deliveryNote ? (
          <span className="ff-row-hint">Tarif · {address.deliveryNote}</span>
        ) : null}
      </label>

      <div className="ff-row-actions">
        <button
          type="button"
          className="ff-icon-btn"
          disabled={props.busy}
          onClick={props.onEdit}
          data-ff-edit-address
          aria-label={`${address.label || 'Adres'} adresini düzenle`}
          title="Düzenle"
        >
          <MaterialIcon name="edit" />
        </button>
        {!address.isDefault ? (
          <button
            type="button"
            className="ff-icon-btn"
            disabled={props.busy}
            onClick={props.onMakePrimary}
            aria-label={`${address.label || 'Adres'} adresini birincil yap`}
            title="Birincil yap"
          >
            <MaterialIcon name="star" />
          </button>
        ) : null}
        <button
          type="button"
          className="ff-icon-btn"
          data-tone="danger"
          disabled={props.busy}
          onClick={props.onRemove}
          aria-label={`${address.label || 'Adres'} adresini sil`}
          title="Sil"
        >
          <MaterialIcon name="delete" />
        </button>
      </div>
    </div>
  );
}