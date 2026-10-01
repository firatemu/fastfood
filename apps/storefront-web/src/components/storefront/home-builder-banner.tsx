import Link from 'next/link';

import { BUILDER_BANNER } from '../../lib/storefront/brand-copy';

import { MaterialIcon } from './material-icon';

export function HomeBuilderBanner() {
  return (
    <section className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin pb-space-xl">
      <div className="w-full rounded-2xl bg-surface-container p-space-lg lg:p-space-xl grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
        <div className="lg:col-span-8 flex flex-col gap-space-sm">
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
            {BUILDER_BANNER.kicker}
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface uppercase">
            {BUILDER_BANNER.title}
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">{BUILDER_BANNER.body}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {BUILDER_BANNER.perks.map((perk) => (
              <span
                key={perk}
                className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm"
              >
                ✓ {perk}
              </span>
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 flex justify-end">
          <Link
            href="/builder"
            data-path="ozel-burgerini-yarat"
            className="w-full sm:w-auto px-space-xl py-4 rounded-lg bg-surface-container-highest hover:bg-secondary-container text-on-surface hover:text-on-secondary-container font-label-md text-label-md uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2 font-bold"
          >
            <span>{BUILDER_BANNER.cta}</span>
            <MaterialIcon name="arrow_forward" className="text-base" />
          </Link>
        </div>
      </div>
    </section>
  );
}
