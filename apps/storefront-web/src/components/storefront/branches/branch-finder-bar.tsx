'use client';

import { ALL_CITIES, type SortMode } from '../../../lib/storefront/branch-finder';
import { MaterialIcon } from '../material-icon';

const SORTS: Array<{ value: SortMode; label: string }> = [
  { value: 'eta', label: 'En Hızlı' },
  { value: 'distance', label: 'En Yakın' },
  { value: 'az', label: 'A–Z' },
];

export function BranchFinderBar({
  cities,
  city,
  query,
  onQuery,
  onCity,
  openOnly,
  onOpenOnly,
  deliveryOnly,
  onDeliveryOnly,
  pickupOnly,
  onPickupOnly,
  sort,
  onSort,
  locating,
  located,
  onLocate,
  total,
  shown,
  hint,
}: {
  cities: Array<{ key: string; label: string; count: number }>;
  city: string;
  query: string;
  onQuery: (value: string) => void;
  onCity: (key: string) => void;
  openOnly: boolean;
  onOpenOnly: (value: boolean) => void;
  deliveryOnly: boolean;
  onDeliveryOnly: (value: boolean) => void;
  pickupOnly: boolean;
  onPickupOnly: (value: boolean) => void;
  sort: SortMode;
  onSort: (value: SortMode) => void;
  locating: boolean;
  located: boolean;
  onLocate: () => void;
  total: number;
  shown: number;
  hint: string | null;
}) {
  return (
    <div className="sticky top-20 z-40 border-y border-white/[0.08] bg-[#0a0c14]/90 backdrop-blur-xl shadow-xl transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col gap-3">
        {/* Top search & geolocation & sorting row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-amber-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Şube adı, ilçe veya cadde ara..."
              className="w-full bg-[#12151f] border border-white/[0.1] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-white placeholder:text-neutral-500 font-sans text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                aria-label="Aramayı temizle"
              >
                <MaterialIcon name="close" className="text-base" />
              </button>
            ) : null}
          </div>

          {/* Location button & Sort controls */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {/* Geolocation Button */}
            <button
              type="button"
              onClick={onLocate}
              disabled={locating}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-anton text-xs uppercase tracking-wider transition-all duration-200 border ${
                located
                  ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(254,179,0,0.2)]'
                  : 'bg-[#12151f] border-white/[0.1] text-neutral-200 hover:border-amber-400/40 hover:text-white'
              } disabled:opacity-50`}
            >
              <MaterialIcon
                name={locating ? 'sync' : 'near_me'}
                className={`text-base text-amber-400 ${locating ? 'animate-spin' : ''}`}
                filled={located}
              />
              <span>{locating ? 'Konum aranıyor...' : located ? 'Konum Alındı' : 'Yakınımdakini Bul'}</span>
            </button>

            {/* Sort Dropdown / Segment */}
            <div className="flex items-center p-1 bg-[#12151f] border border-white/[0.08] rounded-xl shrink-0">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onSort(s.value)}
                  className={`px-3 py-1.5 rounded-lg font-anton text-[11px] uppercase tracking-wider transition-all ${
                    sort === s.value
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* City rail & Quick status filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1 border-t border-white/[0.06]">
          {/* City Pills Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => onCity(ALL_CITIES)}
              data-ff-finder-chip="all-cities"
              className={`shrink-0 px-3 py-1.5 rounded-full font-anton text-xs uppercase tracking-wider transition-all border ${
                city === ALL_CITIES
                  ? 'bg-amber-400 border-amber-400 text-neutral-950 font-bold shadow-sm'
                  : 'bg-[#141824] border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/[0.2]'
              }`}
            >
              Tümü ({total})
            </button>

            {cities.map((group) => {
              const active = city === group.key || city === group.label;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => onCity(group.key)}
                  data-ff-finder-chip={group.key}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-anton text-xs uppercase tracking-wider transition-all border ${
                    active
                      ? 'bg-amber-400 border-amber-400 text-neutral-950 font-bold shadow-sm'
                      : 'bg-[#141824] border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/[0.2]'
                  }`}
                >
                  {group.label} ({group.count})
                </button>
              );
            })}
          </div>

          {/* Quick Filter Toggles */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-0.5">
            {/* Open Only */}
            <button
              type="button"
              onClick={() => onOpenOnly(!openOnly)}
              aria-pressed={openOnly}
              data-ff-finder-chip="open-only"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-anton text-[11px] uppercase tracking-wider border transition-all ${
                openOnly
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-[#12151f] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${openOnly ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
              Şu An Açık
            </button>

            {/* Delivery Only */}
            <button
              type="button"
              onClick={() => onDeliveryOnly(!deliveryOnly)}
              aria-pressed={deliveryOnly}
              data-ff-finder-chip="delivery-only"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-anton text-[11px] uppercase tracking-wider border transition-all ${
                deliveryOnly
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-[#12151f] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MaterialIcon name="moped" className="text-xs" />
              Teslimat
            </button>

            {/* Pickup Only */}
            <button
              type="button"
              onClick={() => onPickupOnly(!pickupOnly)}
              aria-pressed={pickupOnly}
              data-ff-finder-chip="pickup-only"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-anton text-[11px] uppercase tracking-wider border transition-all ${
                pickupOnly
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-[#12151f] border-white/[0.08] text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MaterialIcon name="storefront" className="text-xs" />
              Gel-Al
            </button>

            {/* Total Results Count */}
            <span className="font-anton text-xs uppercase tracking-wider text-neutral-400 ml-2 hidden sm:inline">
              {shown} şube
            </span>
          </div>
        </div>

        {hint ? (
          <p className="text-amber-400/90 text-xs font-sans flex items-center gap-1.5 pt-0.5">
            <MaterialIcon name="info" className="text-sm" />
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
