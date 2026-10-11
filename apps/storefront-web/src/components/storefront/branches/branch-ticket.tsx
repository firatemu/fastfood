'use client';

import Link from 'next/link';

import type { BranchView } from '../../../lib/storefront/branch-finder';
import { MaterialIcon } from '../material-icon';

function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

function PlateCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container px-3 py-2.5">
      <dt className="font-label-sm uppercase tracking-[0.14em] text-on-surface-variant">{label}</dt>
      <dd className="mt-1 font-mono text-lg leading-none tabular-nums text-on-surface">{value}</dd>
    </div>
  );
}

/**
 * One branch as an order ticket: identity, address, the numbers that can differ
 * from branch to branch, then the actions.
 */
export function BranchTicket({
  branch,
  nearest,
  focused,
  located,
}: {
  branch: BranchView;
  nearest: boolean;
  focused: boolean;
  located: boolean;
}) {
  const open = branch.status.open;
  const point =
    branch.latitude !== null && branch.longitude !== null
      ? { latitude: branch.latitude, longitude: branch.longitude }
      : null;
  const distance =
    branch.distanceKm === null
      ? '—'
      : branch.distanceKm < 10
        ? `${branch.distanceKm.toFixed(1).replace('.', ',')} km`
        : `${Math.round(branch.distanceKm)} km`;

  return (
    <article
      id={`branch-${branch.id}`}
      data-ff-branch={branch.id}
      data-ff-city={branch.city}
      data-ff-open={open ? 'true' : 'false'}
      data-ff-focused={focused ? 'true' : 'false'}
      className={`relative flex scroll-mt-64 flex-col gap-space-md rounded-2xl border p-space-lg transition-[border-color,box-shadow,transform] duration-200 ${
        focused
          ? 'border-secondary-container/60 bg-surface-container shadow-[0_24px_60px_-34px_rgba(254,179,0,0.55)]'
          : open
            ? 'border-outline-variant/30 bg-surface-container-low hover:-translate-y-0.5 hover:border-outline/50'
            : 'border-outline-variant/20 bg-surface-container-lowest/70'
      }`}
    >
      {nearest ? (
        <span className="absolute -top-2.5 left-space-lg inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 font-label-sm uppercase tracking-[0.1em] text-on-primary-container shadow-[0_10px_24px_-14px_rgba(255,87,34,0.95)]">
          <MaterialIcon name="near_me" className="text-sm" />
          En yakın
        </span>
      ) : null}

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              open
                ? 'bg-secondary-container shadow-[0_0_10px_rgba(254,179,0,0.8)]'
                : 'bg-outline-variant'
            }`}
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant/70">
            {branch.code}
          </span>
          <span
            className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 font-label-sm uppercase tracking-[0.1em] ${
              open
                ? 'border-secondary-container/40 bg-secondary-container/15 text-secondary-container'
                : 'border-outline-variant/30 text-on-surface-variant'
            }`}
          >
            {branch.status.pill}
          </span>
        </div>
        <h3 className="font-headline-md text-headline-sm uppercase leading-[1.05] text-on-surface md:text-headline-md">
          {branch.name}
        </h3>
        <p className="font-body-sm text-on-surface-variant">
          {branch.district ? `${branch.district} · ${branch.city}` : branch.city}
        </p>
      </header>

      <p className="font-body-md leading-relaxed text-on-surface">{branch.addressLine}</p>

      <dl className="flex w-fit overflow-hidden rounded-xl border border-outline-variant/25 [&>*+*]:border-l [&>*+*]:border-outline-variant/25">
        <PlateCell label="Teslimat" value={branch.eta ?? '—'} />
        {located ? <PlateCell label="Mesafe" value={distance} /> : null}
      </dl>

      <p className="font-body-sm text-on-surface-variant">{branch.status.detail}</p>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-on-surface-variant/70">
        {branch.fulfillmentLabel} · {branch.status.today}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-space-xs">
        {open ? (
          <Link
            href="/menu"
            data-ff-branch-order
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-secondary-container px-3.5 font-label-md uppercase tracking-[0.08em] text-on-secondary-container transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-container"
          >
            <MaterialIcon name="restaurant_menu" className="text-base" />
            Sipariş ver
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-outline-variant/30 px-3.5 font-label-md uppercase tracking-[0.08em] text-on-surface-variant">
            <MaterialIcon name="schedule" className="text-base" />
            {branch.status.pill}
          </span>
        )}
        {point ? (
          <a
            href={mapsUrl(point.latitude, point.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1 rounded-xl border border-outline-variant/40 px-3 font-label-sm uppercase tracking-[0.08em] text-on-surface transition-colors hover:border-secondary-container/50 hover:text-secondary-container"
          >
            Yol tarifi
            <MaterialIcon name="north_east" className="text-sm" />
          </a>
        ) : null}
        {branch.phone ? (
          <a
            href={`tel:${branch.phone}`}
            className="inline-flex h-11 items-center px-2 font-label-sm uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Ara
          </a>
        ) : null}
        <details className="relative ml-auto">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1 px-2 font-label-sm uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:text-on-surface">
            Saatler
            <MaterialIcon name="expand_more" className="text-base" />
          </summary>
          <ul className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-outline-variant/25 bg-surface-container shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)]">
            {branch.hours.length > 0 ? (
              branch.hours.map((row, index) => (
                <li
                  key={`${row.label}-${index}`}
                  className="flex items-center justify-between gap-3 border-b border-outline-variant/15 px-3 py-2 last:border-b-0"
                >
                  <span className="font-label-sm uppercase tracking-[0.1em] text-on-surface-variant">
                    {row.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-on-surface">
                    {row.opensAt} – {row.closesAt}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 font-body-sm text-on-surface-variant">
                Çalışma saatleri girilmemiş.
              </li>
            )}
          </ul>
        </details>
      </div>
    </article>
  );
}
