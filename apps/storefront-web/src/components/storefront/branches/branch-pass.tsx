'use client';

import type { BranchView, NetworkFacts } from '../../../lib/storefront/branch-finder';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-xl leading-none tabular-nums text-on-surface">{value}</span>
      <span className="font-label-sm uppercase tracking-[0.16em] text-on-surface-variant">
        {label}
      </span>
    </div>
  );
}

function PassUnit({
  branch,
  focused,
  located,
  onPick,
}: {
  branch: BranchView;
  focused: boolean;
  located: boolean;
  onPick: (id: string) => void;
}) {
  const open = branch.status.open;
  const meta = located
    ? branch.distanceKm === null
      ? '—'
      : `${branch.distanceKm.toFixed(1).replace('.', ',')} km`
    : branch.unitTag;
  return (
    <li>
      <button
        type="button"
        data-ff-pass-unit={branch.id}
        data-ff-open={open ? 'true' : 'false'}
        onClick={() => onPick(branch.id)}
        className={`flex w-full items-center gap-3 border-b border-outline-variant/15 px-space-md py-3 text-left transition-colors last:border-b-0 hover:bg-surface-container-high/70 ${
          focused ? 'bg-surface-container-high' : ''
        }`}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            open
              ? 'bg-secondary-container shadow-[0_0_10px_rgba(254,179,0,0.8)]'
              : 'bg-outline-variant'
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-label-md uppercase text-on-surface">
            {branch.name}
          </span>
          <span className="block truncate font-body-sm text-on-surface-variant">
            {branch.district ? `${branch.district} · ${branch.city}` : branch.city}
          </span>
        </span>
        <span
          className={`shrink-0 font-mono text-[11px] uppercase tabular-nums ${
            open ? 'text-secondary-container' : 'text-on-surface-variant/50'
          }`}
        >
          {meta}
        </span>
      </button>
    </li>
  );
}

/**
 * "Teşhir" — the kitchen pass. Every branch is a live status unit: open ones are
 * lit, closed ones dim, and each unit jumps the finder to that branch. It is
 * the only place on the page that lists all branches at once.
 */
export function BranchPass({
  views,
  facts,
  focusId,
  located,
  onPick,
}: {
  views: BranchView[];
  facts: NetworkFacts;
  focusId: string | null;
  located: boolean;
  onPick: (id: string) => void;
}) {
  const branchCount = String(views.length);
  const cityCount = String(facts.cityCount);
  const openCount = String(facts.openCount);

  return (
    <section aria-labelledby="branches-hero" className="relative overflow-hidden">
      <div aria-hidden className="ff-branch-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-24 h-[440px] w-[440px] rounded-full bg-secondary-container/10 blur-[140px]"
      />
      <div className="relative mx-auto max-w-7xl px-margin-sm py-space-2xl lg:px-margin">
        <div className="grid gap-space-xl lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-px w-10 bg-secondary-container" />
              <p className="font-label-sm uppercase tracking-[0.22em] text-secondary-container">
                Burger Home · Şube ağı
              </p>
            </div>
            <h1
              id="branches-hero"
              className="font-headline-xl text-headline-xl-mobile uppercase leading-[0.92] tracking-tight text-on-surface md:text-headline-xl"
            >
              Siparişini nereden
              <br />
              <span className="text-secondary-container">vereceksin?</span>
            </h1>
            <p className="max-w-xl font-body-lg leading-relaxed text-on-surface-variant">
              {facts.cityCount} şehirde {branchCount} şube. Şu an {openCount} şube açık — şehrini
              seç, açık olan şubeden siparişini ver.
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-outline-variant/25 pt-space-sm">
              <Stat value={branchCount} label="Şube" />
              <Stat value={cityCount} label="Şehir" />
              <Stat value={openCount} label="Açık" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container/80 backdrop-blur">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant/25 px-space-md py-3">
              <p className="flex items-center gap-2 font-label-md uppercase tracking-[0.18em] text-on-surface">
                <span
                  aria-hidden
                  className="ff-live-pulse h-1.5 w-1.5 rounded-full bg-secondary-container shadow-[0_0_10px_rgba(254,179,0,0.8)]"
                />
                Teşhir
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                {openCount} açık · {facts.closedCount} kapalı
              </p>
            </div>
            <div className="relative">
              <ul className="max-h-[352px] overflow-y-auto">
                {views.map((branch) => (
                  <PassUnit
                    key={branch.id}
                    branch={branch}
                    focused={focusId === branch.id}
                    located={located}
                    onPick={onPick}
                  />
                ))}
              </ul>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-container to-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
