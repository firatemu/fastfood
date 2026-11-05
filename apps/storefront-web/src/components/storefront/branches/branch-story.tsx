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
      className="border-t border-white/[0.08] pt-10"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-anton text-xs uppercase tracking-widest w-fit">
            <MaterialIcon name="menu_book" className="text-sm" />
            <span>HİKÂYEMİZ & TUTKUMUZ</span>
          </div>
          <h2
            id="branch-story"
            className="font-anton text-3xl sm:text-4xl uppercase tracking-wide text-white drop-shadow-sm"
          >
            {story?.title ?? 'BURGER HOME'}
          </h2>
          {body ? (
            <p className="font-sans text-sm sm:text-base leading-relaxed text-neutral-300">{body}</p>
          ) : null}
        </div>

        {sections.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li
                key={section.id}
                className="flex flex-col gap-2 bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl shadow-lg hover:border-amber-400/30 transition-all"
              >
                <span className="font-anton text-xs uppercase tracking-widest text-amber-400">
                  {String(index + 1).padStart(2, '0')} · ÖZEL YAKLAŞIM
                </span>
                <p className="font-anton text-base sm:text-lg uppercase text-white tracking-wide">
                  {section.heading}
                </p>
                <p className="font-sans text-xs sm:text-sm leading-relaxed text-neutral-400">
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
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12151f]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-anton text-xs uppercase tracking-widest mb-3">
            <MaterialIcon name="storefront" className="text-sm" />
            <span>YENİ ŞUBE & İLETİŞİM</span>
          </div>

          <h2 className="font-anton text-2xl sm:text-3xl uppercase tracking-wide text-white">
            BURGER HOME ŞUBENİZ YAKININIZDA OLSUN
          </h2>
          <p className="mt-2 font-sans text-xs sm:text-sm leading-relaxed text-neutral-300">
            Bölgenizde veya semtinizde yeni bir BURGER HOME lezzet durağı açılması için lokasyon önerisinde bulunun veya şubelerimizle ilgili her türlü sorunuz için müşteri temsilcimizle görüşün.
          </p>
        </div>

        <div className="flex shrink-0 flex-col sm:flex-row gap-3">
          <a
            href="tel:4441399"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 text-neutral-950 font-anton text-sm uppercase tracking-wider px-6 shadow-[0_4px_16px_rgba(254,179,0,0.3)] transition-all"
          >
            <MaterialIcon name="call" className="text-lg" />
            444 1 399
          </a>
          <Link
            href="/menu"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-[#141824] hover:bg-white/[0.08] px-6 font-anton text-sm uppercase tracking-wider text-white transition-all"
          >
            <MaterialIcon name="restaurant_menu" className="text-lg text-amber-400" />
            Menüyü İncele
          </Link>
        </div>
      </div>
    </section>
  );
}
