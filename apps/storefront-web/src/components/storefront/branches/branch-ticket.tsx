'use client';

import Link from 'next/link';

import type { BranchView } from '../../../lib/storefront/branch-finder';
import { MaterialIcon } from '../material-icon';

function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

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
      className={`relative flex scroll-mt-64 flex-col justify-between gap-5 rounded-2xl border p-5 sm:p-6 transition-all duration-300 overflow-hidden ${
        focused
          ? 'bg-[#141826] border-amber-400 shadow-[0_16px_50px_rgba(254,179,0,0.25)] ring-1 ring-amber-400/50'
          : open
            ? 'bg-[#12151f]/85 backdrop-blur-xl border-white/[0.08] hover:border-amber-400/50 hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
            : 'bg-[#0e111a]/90 backdrop-blur-xl border-white/[0.06] opacity-90 hover:opacity-100 hover:border-white/[0.15]'
      }`}
    >
      {/* Nearest Badge */}
      {nearest ? (
        <span className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 font-anton text-[11px] uppercase tracking-wider text-neutral-950 font-bold shadow-[0_2px_10px_rgba(254,179,0,0.35)] z-10">
          <MaterialIcon name="near_me" className="text-sm" filled />
          En Yakın Şube
        </span>
      ) : null}

      <div>
        {/* Header tags: City & Live status */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 font-anton text-[11px] tracking-wider uppercase">
            {branch.city} {branch.district ? `· ${branch.district}` : ''}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-anton uppercase tracking-wider border ${
              open
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                : 'bg-neutral-800/80 border-white/[0.08] text-neutral-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                open ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-neutral-500'
              }`}
            />
            {branch.status.pill}
          </span>

          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 ml-auto mr-1 hidden sm:inline">
            {branch.code}
          </span>
        </div>

        {/* Branch Name */}
        <h3 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-white leading-tight mt-1 mb-2">
          {branch.name}
        </h3>

        {/* Address */}
        <p className="text-neutral-300 font-sans text-xs sm:text-sm leading-relaxed mb-4 flex items-start gap-1.5">
          <MaterialIcon name="location_on" className="text-amber-400 text-base shrink-0 mt-0.5" />
          <span>{branch.addressLine}</span>
        </p>

        {/* Metric pods row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 border-y border-white/[0.06] mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-anton uppercase tracking-wider text-neutral-400">
              Teslimat Süresi
            </span>
            <span className="font-anton text-base text-amber-400 mt-0.5">
              {branch.eta ?? '25-35 dk'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-anton uppercase tracking-wider text-neutral-400">
              Hizmet Türü
            </span>
            <span className="font-anton text-xs text-white uppercase mt-1 truncate">
              {branch.fulfillmentLabel}
            </span>
          </div>

          {located ? (
            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] font-anton uppercase tracking-wider text-neutral-400">
                Mesafe
              </span>
              <span className="font-anton text-base text-emerald-400 mt-0.5">
                {distance}
              </span>
            </div>
          ) : (
            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] font-anton uppercase tracking-wider text-neutral-400">
                Bugünkü Saatler
              </span>
              <span className="font-sans text-xs text-neutral-300 mt-1 truncate">
                {branch.status.today}
              </span>
            </div>
          )}
        </div>

        {/* Hours status detail note */}
        <p className="font-sans text-xs text-neutral-400 leading-normal mb-1">
          {branch.status.detail}
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] flex-wrap sm:flex-nowrap">
        {open ? (
          <Link
            href="/menu"
            data-ff-branch-order
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 text-neutral-950 font-anton text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_16px_rgba(254,179,0,0.3)] transition-all"
          >
            <MaterialIcon name="restaurant_menu" className="text-base" />
            Sipariş Ver
          </Link>
        ) : (
          <Link
            href="/menu"
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#141824] hover:bg-white/[0.08] border border-white/[0.1] text-white font-anton text-xs sm:text-sm uppercase tracking-wider transition-all"
          >
            <MaterialIcon name="restaurant_menu" className="text-base text-amber-400" />
            Menüyü İncele
          </Link>
        )}

        {point ? (
          <a
            href={mapsUrl(point.latitude, point.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-[#141824] hover:bg-[#1a2030] border border-white/[0.08] hover:border-amber-400/40 text-neutral-200 hover:text-white font-anton text-xs uppercase tracking-wider transition-all shrink-0"
            title="Google Maps ile Yol Tarifi"
          >
            <MaterialIcon name="directions" className="text-base text-amber-400" />
            <span>Yol Tarifi</span>
          </a>
        ) : null}

        {branch.phone ? (
          <a
            href={`tel:${branch.phone}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 px-3 rounded-xl bg-[#141824] hover:bg-[#1a2030] border border-white/[0.08] text-neutral-300 hover:text-white font-anton text-xs uppercase tracking-wider transition-all shrink-0"
            title="Şubeyi Telefonla Ara"
          >
            <MaterialIcon name="call" className="text-base text-amber-400" />
            <span className="hidden sm:inline">Ara</span>
          </a>
        ) : null}

        {/* Weekly hours dropdown */}
        <details className="relative">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-1 px-3 rounded-xl bg-[#141824] hover:bg-[#1a2030] border border-white/[0.08] font-anton text-xs uppercase tracking-wider text-neutral-300 hover:text-white transition-all shrink-0">
            <span>Saatler</span>
            <MaterialIcon name="expand_more" className="text-base text-amber-400" />
          </summary>
          <ul className="absolute right-0 bottom-full mb-2 z-30 w-60 overflow-hidden rounded-xl border border-white/[0.12] bg-[#12151f] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <li className="px-3 py-2 bg-[#161a28] border-b border-white/[0.08] font-anton text-[11px] uppercase tracking-wider text-amber-400">
              Haftalık Çalışma Saatleri
            </li>
            {branch.hours.length > 0 ? (
              branch.hours.map((row, index) => (
                <li
                  key={`${row.label}-${index}`}
                  className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3.5 py-2 last:border-b-0 text-xs font-sans"
                >
                  <span className="font-anton uppercase tracking-wide text-neutral-300">
                    {row.label}
                  </span>
                  <span className="font-mono text-xs text-amber-400 font-medium">
                    {row.opensAt} – {row.closesAt}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-3 py-2.5 font-sans text-xs text-neutral-400">
                Çalışma saatleri belirtilmemiş.
              </li>
            )}
          </ul>
        </details>
      </div>
    </article>
  );
}
