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
    <div className="bg-[#0e111a]/90 border border-white/[0.08] p-4 sm:p-5 rounded-xl flex flex-col gap-3.5 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(254,179,0,0.15)]">
            <MaterialIcon name="home" className="text-xl" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-anton text-base text-white uppercase tracking-wide">
                {selected?.label ?? location.label}
              </span>
              {selected?.isDefault ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-anton text-[10px] tracking-wider uppercase">
                  Birincil
                </span>
              ) : null}
              {!location.serviceable ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-anton text-[10px] tracking-wider uppercase">
                  Bölge dışı (&gt; 10 km)
                </span>
              ) : null}
            </div>
            <p className="text-neutral-300 text-sm mt-1 break-words font-medium leading-relaxed">
              {line}
            </p>
          </div>
        </div>
      </div>

      {authenticated && addresses.length > 1 ? (
        <div>
          <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1.5">
            Kayıtlı Adresleriniz
          </label>
          <select
            className="w-full bg-[#141824] border border-white/[0.1] text-white font-sans text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all cursor-pointer"
            value={selectedAddressId ?? ''}
            onChange={(event) => onSelectAddress(event.target.value)}
          >
            {addresses.map((item) => (
              <option key={item.id} value={item.id} className="bg-[#141824] text-white">
                {item.label ?? item.street ?? item.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!authenticated ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1">
              Ad Soyad
            </label>
            <input
              className="w-full bg-[#141824] border border-white/[0.1] text-white placeholder:text-neutral-500 font-sans text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
              placeholder="Adınız Soyadınız"
              value={guestName}
              onChange={(event) => onGuestName(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1">
              Telefon Numarası
            </label>
            <input
              className="w-full bg-[#141824] border border-white/[0.1] text-white placeholder:text-neutral-500 font-sans text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
              placeholder="05XX XXX XX XX"
              value={guestPhone}
              onChange={(event) => onGuestPhone(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="block text-[11px] font-anton uppercase tracking-wider text-neutral-400 mb-1.5">
          Bina / Erişim Kodu
        </label>
        <input
          className="w-full bg-[#141824] border border-white/[0.1] text-white placeholder:text-neutral-500 font-sans text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
          value={buildingAccessCode}
          onChange={(event) => onBuildingAccessCode(event.target.value)}
          placeholder="Örn: Kapı zili 4B, diafon kodu #1234"
        />
      </div>

      <div className="bg-[#121622] border border-white/[0.06] rounded-xl p-3.5">
        <label className="text-[11px] font-anton uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
          <MaterialIcon name="notifications_off" className="text-base text-amber-400" />
          Kurye Teslimat Notu
        </label>
        <input
          className="w-full bg-[#0a0c13] border border-white/[0.08] text-white placeholder:text-neutral-500 font-sans text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
          value={deliveryNote}
          onChange={(event) => onDeliveryNote(event.target.value)}
          placeholder="Kurye için kapı/daire notu... (Örn: Zili çalmayın, bebek uyuyor)"
        />
      </div>
    </div>
  );
}
