'use client';

import Link from 'next/link';

import { MaterialIcon } from '../material-icon';

export type BranchCardData = {
  id: string;
  code?: string;
  name: string;
  city: string;
  addressLine: string;
  phone: string | null;
  latitude?: number;
  longitude?: number;
  isAcceptingOrders: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  estimatedDeliveryMinutesMin?: number;
  estimatedDeliveryMinutesMax?: number;
  hours: Array<{ label: string; opensAt: string; closesAt: string }>;
};

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function etaLabel(min?: number, max?: number): string | null {
  if (!min || !max) return null;
  return `${min}-${max} dk`;
}

function fulfillment(d: BranchCardData): { label: string; icon: string } {
  if (!d.isAcceptingOrders) return { label: 'Şu an kapalı', icon: 'do_not_disturb_on' };
  if (d.deliveryEnabled && d.pickupEnabled) return { label: 'Teslimat + Gel-al', icon: 'delivery_dining' };
  if (d.deliveryEnabled) return { label: 'Yalnız Teslimat', icon: 'delivery_dining' };
  if (d.pickupEnabled) return { label: 'Yalnız Gel-al', icon: 'storefront' };
  return { label: 'Hizmet dışı', icon: 'remove_circle' };
}

export function BranchCard({
  branch,
}: {
  branch: BranchCardData;
  isHighlighted?: boolean;
}): React.ReactElement {
  const eta = etaLabel(branch.estimatedDeliveryMinutesMin, branch.estimatedDeliveryMinutesMax);
  const fchip = fulfillment(branch);
  const hasMap = typeof branch.latitude === 'number' && typeof branch.longitude === 'number';

  return (
    <article
      id={`branch-${branch.id}`}
      data-ff-branch={branch.id}
      data-ff-city={branch.city}
      className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container transition-shadow duration-200 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] md:flex-row"
    >
      {/* LEFT: meta strip (dark, fixed-width) */}
      <aside className="relative flex shrink-0 flex-col gap-space-sm border-b border-outline-variant/40 bg-surface-container-low p-space-md md:w-44 md:border-b-0 md:border-r">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary-container/50 to-transparent md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:left-0 md:h-auto md:w-px md:bg-gradient-to-b"
        />
        <p className="font-label-xs uppercase tracking-[0.2em] text-secondary-container">
          {branch.city || 'ŞUBE'}
        </p>
        {branch.code ? (
          <p className="font-mono font-label-xs uppercase tracking-[0.15em] text-on-surface-variant/70">
            {branch.code}
          </p>
        ) : null}
        <div className="mt-auto">
          {branch.isAcceptingOrders ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary/10 px-2.5 py-1 font-label-xs uppercase tracking-wider text-tertiary">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              Açık
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-1 font-label-xs uppercase tracking-wider text-on-surface-variant">
              Kapalı
            </span>
          )}
        </div>
      </aside>

      {/* RIGHT: content */}
      <div className="flex flex-1 flex-col gap-space-md p-space-md sm:p-space-lg">
        <h3 className="font-headline-md uppercase leading-[1.1] tracking-tight">
          {branch.name}
        </h3>

        <p className="font-body-md leading-relaxed text-on-surface-variant">
          {branch.addressLine}
        </p>

        <div className="flex flex-col gap-space-xs text-on-surface-variant">
          {branch.phone ? (
            <a
              href={`tel:${branch.phone}`}
              className="inline-flex w-fit items-center gap-2 font-label-md uppercase tracking-wider text-on-surface hover:text-secondary-container"
            >
              <MaterialIcon name="call" className="text-base text-secondary-container" />
              {branch.phone}
            </a>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <span className="inline-flex items-center gap-1.5 font-label-xs uppercase tracking-wider">
              <MaterialIcon name={fchip.icon} className="text-base text-secondary-container" />
              {fchip.label}
            </span>
            {eta && branch.deliveryEnabled ? (
              <span className="inline-flex items-center gap-1.5 font-label-xs uppercase tracking-wider">
                <MaterialIcon name="bolt" className="text-base text-secondary-container" />
                Teslimat {eta}
              </span>
            ) : null}
          </div>
        </div>

        {/* Hours */}
        {branch.hours.length > 0 ? (
          <ul className="font-body-sm text-on-surface-variant divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/30 bg-surface-container-low/40">
            {branch.hours.map((row, i) => (
              <li
                key={`${row.label}-${i}`}
                className="flex items-center justify-between gap-3 px-3 py-1.5 first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="font-label-xs uppercase tracking-wider">{row.label}</span>
                <span className="font-mono tabular-nums text-on-surface">
                  {row.opensAt} – {row.closesAt}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-body-sm text-on-surface-variant/70">
            Hafta içi 11:30 – 23:00 · Pazar 12:00 – 23:00
          </p>
        )}

        {/* Actions — primary CTA prominent, secondary as text link */}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-space-xs">
          {branch.deliveryEnabled && branch.isAcceptingOrders ? (
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-secondary-container px-space-md py-2.5 font-label-md uppercase tracking-wider text-on-secondary-container transition hover:brightness-110"
            >
              <MaterialIcon name="restaurant_menu" className="text-base" />
              Menüye Git
            </Link>
          ) : null}
          {hasMap ? (
            <a
              href={mapsUrl(branch.latitude as number, branch.longitude as number)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-space-sm py-2.5 font-label-md uppercase tracking-wider text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline"
            >
              Yol Tarifi
              <MaterialIcon name="north_east" className="text-sm" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
