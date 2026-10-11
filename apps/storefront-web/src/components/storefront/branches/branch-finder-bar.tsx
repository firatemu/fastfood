'use client';

import { ALL_CITIES, type SortMode } from '../../../lib/storefront/branch-finder';
import { MaterialIcon } from '../material-icon';

const SORTS: Array<{ value: SortMode; label: string }> = [
  { value: 'distance', label: 'En yakın' },
  { value: 'eta', label: 'En hızlı' },
  { value: 'az', label: 'A–Z' },
];

function Chip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-ff-finder-chip={testId}
      className={`h-9 shrink-0 rounded-full border px-3.5 font-label-sm uppercase tracking-[0.1em] transition-colors ${
        active
          ? 'border-secondary-container/60 bg-secondary-container/15 text-secondary-container'
          : 'border-outline-variant/30 text-on-surface-variant hover:border-outline/50 hover:text-on-surface'
      }`}
    >
      {children}
    </button>
  );
}

function Count({ value }: { value: number }) {
  return <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-70">{value}</span>;
}

/**
 * Sticky finder: search, sort, the opt-in location button, the city rail and the
 * fulfilment toggles. Filter values are written to the URL by the page component.
 */
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
    <div className="sticky top-20 z-40 border-y border-outline-variant/25 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-margin-sm lg:px-margin">
        <div className="flex flex-col gap-3 py-space-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-96">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Şube, ilçe veya kod ara"
              aria-label="Şube ara"
              data-ff-branch-search
              className="h-11 w-full rounded-xl border border-outline-variant/30 bg-surface-container pl-10 pr-3 font-body-sm text-on-surface transition-colors placeholder:text-on-surface-variant/60 focus:border-secondary-container/60 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Sıralama"
              className="flex items-center gap-1 rounded-xl border border-outline-variant/25 bg-surface-container p-1"
            >
              {SORTS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSort(item.value)}
                  aria-pressed={sort === item.value}
                  data-ff-finder-sort={item.value}
                  className={`h-8 rounded-lg px-3 font-label-sm uppercase tracking-[0.1em] transition-colors ${
                    sort === item.value
                      ? 'bg-secondary-container/15 text-secondary-container'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onLocate}
              disabled={locating}
              data-ff-branch-locate
              className={`flex h-11 items-center gap-2 rounded-xl border px-4 font-label-sm uppercase tracking-[0.1em] transition-colors disabled:opacity-50 ${
                located
                  ? 'border-secondary-container/60 bg-secondary-container/15 text-secondary-container'
                  : 'border-outline-variant/30 text-on-surface hover:border-secondary-container/50 hover:text-secondary-container'
              }`}
            >
              <MaterialIcon name="my_location" className="text-base" />
              {locating ? 'Konum alınıyor…' : located ? 'Yakınlık sıralı' : 'Yakınımdakini bul'}
            </button>
          </div>
        </div>

        <div className="sf-chip-scroll -mx-margin-sm flex items-center gap-2 overflow-x-auto px-margin-sm pb-space-sm">
          <Chip active={city === ALL_CITIES} onClick={() => onCity(ALL_CITIES)} testId="city-all">
            Tümü
            <Count value={total} />
          </Chip>
          {cities.map((item) => (
            <Chip
              key={item.key}
              active={city === item.label}
              onClick={() => onCity(item.label)}
              testId={`city-${item.key}`}
            >
              {item.label}
              <Count value={item.count} />
            </Chip>
          ))}
          <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-outline-variant/40" />
          <Chip active={openOnly} onClick={() => onOpenOnly(!openOnly)} testId="open">
            Şu an açık
          </Chip>
          <Chip
            active={deliveryOnly}
            onClick={() => onDeliveryOnly(!deliveryOnly)}
            testId="delivery"
          >
            Teslimat
          </Chip>
          <Chip active={pickupOnly} onClick={() => onPickupOnly(!pickupOnly)} testId="pickup">
            Gel-al
          </Chip>
        </div>

        <p className="pb-space-sm font-body-sm text-on-surface-variant" role="status">
          {shown === total ? `${total} şube` : `${shown} / ${total} şube gösteriliyor`}
          {hint ? <span className="text-on-surface-variant/70"> · {hint}</span> : null}
        </p>
      </div>
    </div>
  );
}
