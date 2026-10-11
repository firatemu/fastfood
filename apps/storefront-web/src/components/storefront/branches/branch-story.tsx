'use client';

import Link from 'next/link';

import type { StorefrontContent } from '../../../lib/storefront/discover';
import { MaterialIcon } from '../material-icon';

/** CMS `hikaye` content. Renders nothing when the slug is not published. */
export function BranchStory({
  story,
}: {
  story: StorefrontContent | null;
}): React.ReactElement | null {
  const body = story?.body;
  const sections = story?.sections ?? [];
  if (!body && sections.length === 0) return null;

  return (
    <section
      aria-labelledby="branch-story"
      className="border-t border-outline-variant/25 pt-space-lg"
    >
      <div className="grid gap-space-lg lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-secondary-container" />
            <p className="font-label-sm uppercase tracking-[0.22em] text-secondary-container">
              Hikâyemiz
            </p>
          </div>
          <h2
            id="branch-story"
            className="font-headline-xl text-headline-xl-mobile uppercase leading-[0.95] tracking-tight text-on-surface md:text-headline-xl"
          >
            {story?.title ?? 'Burger Home'}
          </h2>
          {body ? (
            <p className="font-body-lg leading-relaxed text-on-surface-variant">{body}</p>
          ) : null}
        </div>
        {sections.length > 0 ? (
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-outline-variant/25 bg-outline-variant/25 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li
                key={section.id}
                className="flex flex-col gap-2 bg-surface-container-low p-space-lg"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary-container">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="font-headline-sm text-headline-sm uppercase text-on-surface">
                  {section.heading}
                </p>
                <p className="font-body-md leading-relaxed text-on-surface-variant">
                  {section.body}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function ContactCta(): React.ReactElement {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container px-space-lg py-space-lg">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-secondary-container/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-secondary-container" />
            <p className="font-label-sm uppercase tracking-[0.22em] text-secondary-container">
              İletişim
            </p>
          </div>
          <h2 className="mt-3 font-headline-lg text-headline-lg-mobile uppercase leading-[0.98] tracking-tight text-on-surface md:text-headline-lg">
            Şubemiz yakınında olsun
          </h2>
          <p className="mt-3 font-body-md leading-relaxed text-on-surface-variant">
            Yeni şube önerin ya da şubelerimizle ilgili bir sorun bildirin — çağrı merkezimiz
            çalışma saatleri içinde açık.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <a
            href="tel:4441399"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-container px-5 font-label-md uppercase tracking-[0.08em] text-on-secondary-container transition hover:brightness-105"
          >
            <MaterialIcon name="call" className="text-base" />
            444 1 399
          </a>
          <Link
            href="/menu"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 px-5 font-label-md uppercase tracking-[0.08em] text-on-surface transition-colors hover:border-secondary-container/50 hover:text-secondary-container"
          >
            <MaterialIcon name="restaurant_menu" className="text-base" />
            Menüye dön
          </Link>
        </div>
      </div>
    </section>
  );
}
