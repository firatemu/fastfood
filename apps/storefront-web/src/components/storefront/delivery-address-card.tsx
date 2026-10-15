import type { DeliveryLocation } from '../../lib/delivery-location';
import type { CustomerAddress } from '../../lib/storefront/addresses';

import { MaterialIcon } from './material-icon';

export function DeliveryAddressCard({
  location,
  addresses,
  selectedAddressId,
  onSelectAddress,
  deliveryNote,
  onDeliveryNote,
  buildingAccessCode,
  onBuildingAccessCode,
  guestName,
  guestPhone,
  onGuestName,
  onGuestPhone,
  authenticated,
}: {
  location: DeliveryLocation;
  addresses: CustomerAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  deliveryNote: string;
  onDeliveryNote: (value: string) => void;
  buildingAccessCode: string;
  onBuildingAccessCode: (value: string) => void;
  guestName: string;
  guestPhone: string;
  onGuestName: (value: string) => void;
  onGuestPhone: (value: string) => void;
  authenticated: boolean;
}) {
  const selected = addresses.find((item) => item.id === selectedAddressId);
  const line =
    selected?.street ??
    [selected?.district, selected?.city].filter(Boolean).join(' / ') ??
    location.label;

  return (
    <div className="bg-surface-container p-space-md rounded-lg flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 rounded-lg bg-surface-container-high text-secondary-container shrink-0 mt-0.5">
            <MaterialIcon name="home" className="text-xl" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label-lg text-label-lg text-on-surface uppercase">
                {selected?.label ?? location.label}
              </span>
              {selected?.isDefault ? (
                <span className="px-2 py-0.5 rounded bg-secondary-container/20 text-secondary-container font-label-sm text-[10px] uppercase">
                  Birincil
                </span>
              ) : null}
              {!location.serviceable ? (
                <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-[10px] uppercase">
                  Bölge dışı (&gt; 10 km)
                </span>
              ) : null}
            </div>
            <p className="font-body-md text-body-md text-on-surface mt-1 font-medium break-words">{line}</p>
          </div>
        </div>
      </div>
      {authenticated && addresses.length > 1 ? (
        <select
          className="w-full bg-surface-container-low text-on-surface font-body-sm rounded px-3 py-2"
          value={selectedAddressId ?? ''}
          onChange={(event) => onSelectAddress(event.target.value)}
        >
          {addresses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label ?? item.street ?? item.id}
            </option>
          ))}
        </select>
      ) : null}
      {!authenticated ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            className="w-full bg-surface-container-low text-on-surface font-body-sm rounded px-3 py-2"
            placeholder="Ad soyad"
            value={guestName}
            onChange={(event) => onGuestName(event.target.value)}
          />
          <input
            className="w-full bg-surface-container-low text-on-surface font-body-sm rounded px-3 py-2"
            placeholder="Telefon"
            value={guestPhone}
            onChange={(event) => onGuestPhone(event.target.value)}
          />
        </div>
      ) : null}
      <label className="font-label-sm text-label-sm uppercase text-on-surface-variant">Bina / erişim kodu</label>
      <input
        className="w-full bg-surface-container-low text-on-surface font-body-sm rounded px-3 py-2"
        value={buildingAccessCode}
        onChange={(event) => onBuildingAccessCode(event.target.value)}
        placeholder="Kapı / bina kodu"
      />
      <div className="pt-1 bg-surface-container-low rounded-lg p-3">
        <label className="font-label-sm text-label-sm uppercase text-on-surface-variant flex items-center gap-1.5 mb-1.5">
          <MaterialIcon name="notifications_off" className="text-base text-secondary-container" />
          Kurye teslimat notu
        </label>
        <input
          className="w-full bg-surface-container text-on-surface font-body-sm rounded px-3 py-2"
          value={deliveryNote}
          onChange={(event) => onDeliveryNote(event.target.value)}
          placeholder="Kurye için kapı/daire notu..."
        />
      </div>
    </div>
  );
}
