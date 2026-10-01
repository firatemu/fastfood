'use client';

import Link from 'next/link';

import type { StorefrontContent } from '../../../lib/storefront/discover';

import { MaterialIcon } from '../material-icon';

export function BranchStory({
  story,
}: {
  story: StorefrontContent | null;
}): React.ReactElement | null {
  const body = story?.body;
  const sections = story?.sections ?? [];
  if (!body && sections.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container p-space-lg sm:p-space-xl">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary-container/40 to-transparent"
      />
      <div className="flex flex-col gap-space-md lg:flex-row lg:gap-space-xl">
        <div className="flex shrink-0 flex-col gap-space-xs lg:w-72">
          <p className="font-label-sm uppercase tracking-[0.22em] text-secondary-container">
            Hikâyemiz
          </p>
          <h2 className="font-headline-xl uppercase leading-[1.05] tracking-tight">
            {story?.title ?? 'BURGER HOME'}
          </h2>
        </div>
        <div className="flex flex-1 flex-col gap-space-md">
          {body ? (
            <p className="font-body-lg leading-relaxed text-on-surface-variant">{body}</p>
          ) : null}
          {sections.length > 0 ? (
            <ul className="flex flex-col gap-space-md">
              {sections.map((s, i) => (
                <li
                  key={s.id}
                  className="flex gap-space-sm border-l border-outline-variant/30 pl-space-sm"
                >
                  <span className="font-headline-md tabular-nums leading-none text-secondary-container">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-headline-sm uppercase">{s.heading}</p>
                    <p className="font-body-md leading-relaxed text-on-surface-variant">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ContactCta(): React.ReactElement {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface p-space-lg sm:p-space-xl">
      <div
        aria-hidden
        className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary-container/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary-container/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-space-md lg:flex-row lg:items-center lg:justify-between lg:gap-space-xl">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-secondary-container" aria-hidden />
            <p className="font-label-sm uppercase tracking-[0.22em] text-secondary-container">
              İletişim
            </p>
          </div>
          <h2 className="mt-space-sm font-headline-xl uppercase leading-[1.05] tracking-tight">
            Yeni şubeler için iletişime geçin
          </h2>
          <p className="mt-space-sm font-body-md leading-relaxed text-on-surface-variant">
            Türkiye genelinde franchise görüşmeleri ve yeni lokasyon önerileri için ekibimizle iletişime geçin.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <a
            href="tel:4441399"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-container px-space-md py-3 font-label-md uppercase tracking-wider text-on-secondary-container"
          >
            <MaterialIcon name="call" className="text-base" />
            +90 444 1 399
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/60 px-space-md py-3 font-label-md uppercase tracking-wider text-on-surface hover:border-primary-container hover:text-primary-container"
          >
            <MaterialIcon name="restaurant_menu" className="text-base" />
            Menüye Dön
          </Link>
        </div>
      </div>
    </section>
  );
}
