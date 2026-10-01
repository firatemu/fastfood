'use client';

import type { StorefrontContent } from '../../../lib/storefront/discover';

import { GoldDivider } from './section-heading';

export function BranchHero({
  story,
  branchCount,
  cityCount,
  openCount,
}: {
  story: StorefrontContent | null;
  branchCount: number;
  cityCount: number;
  openCount: number;
}): React.ReactElement {
  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin pt-space-2xl pb-space-2xl">
        <div className="grid gap-space-xl lg:grid-cols-[1.55fr_1fr] lg:items-end lg:gap-space-2xl">
          {/* Left: editorial headline */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-secondary-container" aria-hidden />
              <p className="font-label-sm uppercase tracking-[0.22em] text-secondary-container">
                Şubeler & Ağımız
              </p>
            </div>

            <h1 className="font-headline-xl-mobile md:font-headline-xl uppercase leading-[0.92] tracking-tight">
              {story?.title ?? 'BURGER HOME'}
              <span className="block text-secondary-container">Şube Ağı</span>
            </h1>

            <p className="font-body-lg max-w-2xl leading-relaxed text-on-surface-variant">
              {story?.body ??
                'Türkiye genelinde yayılan Burger Home şubelerimizde aynı lezzet standardı, aynı döküm ızgara tekniği, aynı ev yapımı soslar. Size en yakın şubeyi bulun, yol tarifini alın ya da doğrudan sipariş verin.'}
            </p>
          </div>

          {/* Right: meta panel (asymmetric, quote-like) */}
          <aside className="flex flex-col gap-space-md border-l border-secondary-container/40 pl-space-md lg:pl-space-lg">
            <p className="font-display text-7xl font-headline-xl-mobile leading-none tabular-nums text-secondary-container">
              {String(branchCount).padStart(2, '0')}
            </p>
            <div className="flex flex-col gap-space-sm">
              <StatRow label="Şube" value={branchCount} />
              <StatRow label="Şehir" value={cityCount} />
              <StatRow label="Açık" value={openCount} />
              <StatRow label="Ortalama teslimat" value="25-35 dk" />
            </div>
            <p className="font-body-sm leading-relaxed text-on-surface-variant">
              Tüm şubelerimiz hafta içi ve hafta sonu aynı saatlerde hizmet verir.
            </p>
          </aside>
        </div>
      </div>

      <GoldDivider />
    </section>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-outline-variant/30 pt-space-xs">
      <dt className="font-label-xs uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </dt>
      <dd className="font-headline-sm tabular-nums">{value}</dd>
    </div>
  );
}
