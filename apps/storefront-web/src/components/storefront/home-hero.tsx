'use client';

import { useEffect, useState } from 'react';

import { formatTryMinor } from '../../lib/money';
import { GRILL_LIVE_LABEL, PROMISE_STRIP } from '../../lib/storefront/brand-copy';
import {
  formatDeliveryWindow,
  formatExpressLabel,
  formatSoldCount,
} from '../../lib/storefront/format';
import type { StorefrontHome } from '../../lib/storefront/home';

import { HeroSliderControl } from './hero-slider-control';
import { MaterialIcon } from './material-icon';

export function HomeHero({
  home,
  onOrderHero,
  busyId,
}: {
  home: StorefrontHome;
  onOrderHero: (productId: string) => void;
  busyId: string | null;
}) {
  const slides = home.heroSlides?.length ? home.heroSlides : home.hero ? [home.hero] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const settings = home.heroSliderSettings ?? { transitionDurationSeconds: 5, loop: true };
  const hero = slides[Math.min(activeIndex, Math.max(slides.length - 1, 0))] ?? home.hero;
  const busy = hero ? busyId === hero.id : false;
  const atLastSlide = activeIndex >= slides.length - 1;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (
      slides.length < 2 ||
      reducedMotion ||
      isHovered ||
      hasFocus ||
      (!settings.loop && atLastSlide)
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => {
        if (current < slides.length - 1) return current + 1;
        return settings.loop ? 0 : current;
      });
    }, settings.transitionDurationSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    atLastSlide,
    hasFocus,
    isHovered,
    reducedMotion,
    settings.loop,
    settings.transitionDurationSeconds,
    slides.length,
  ]);
  const eta = home.branch
    ? formatDeliveryWindow(
        home.branch.estimatedDeliveryMinutesMin,
        home.branch.estimatedDeliveryMinutesMax,
      )
    : null;
  const sold = hero ? formatSoldCount(hero.soldCount) : '';

  return (
    <>
      <section
        className="relative w-full -mt-20 overflow-hidden bg-[#0a0c13]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setHasFocus(true)}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            setHasFocus(false);
          }
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/4 w-[650px] h-[650px] bg-amber-500/15 rounded-full blur-[140px]" />
          <div className="absolute top-1/3 -right-28 w-[500px] h-[500px] bg-orange-600/15 rounded-full blur-[130px]" />
          <div className="absolute -bottom-20 left-10 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[120px]" />
          <svg
            className="absolute inset-0 w-full h-full opacity-40"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle className="animate-pulse" cx="15%" cy="30%" fill="#ff5722" r="2.5" />
            <circle cx="28%" cy="65%" fill="#feb300" r="2" />
            <circle className="animate-pulse" cx="82%" cy="20%" fill="#ff5722" r="3" />
            <circle cx="65%" cy="75%" fill="#ffd799" r="2" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-margin-sm lg:px-margin pt-32 pb-space-xl lg:pb-28 flex flex-col lg:flex-row items-center justify-between gap-space-xl">
          <div className="w-full lg:w-7/12 flex flex-col gap-space-md z-10">
            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(254,179,0,0.2)]">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-label-sm text-xs font-bold uppercase tracking-wider">
                  {GRILL_LIVE_LABEL}
                </span>
              </div>
              {eta && home.branch ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-neutral-300 font-label-sm text-xs">
                  <MaterialIcon name="timer" className="text-amber-400 text-base" />
                  <span>
                    {formatExpressLabel(home.branch.name)}:{' '}
                    <strong className="text-white font-bold">{eta}</strong>
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-neutral-400 font-label-sm text-xs">
                  Teslimat adresi seçilmedi
                </div>
              )}
            </div>
            {hero ? (
              <>
                <div className="flex flex-col">
                  {hero.eyebrow ? (
                    <span className="font-headline-md text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
                      {hero.eyebrow}
                    </span>
                  ) : null}
                  <h1 className="font-headline-xl text-headline-xl uppercase text-white tracking-normal leading-[1.02] drop-shadow-2xl mt-1">
                    {splitHeroName(hero.name)}
                  </h1>
                </div>
                <p className="font-body-lg text-body-lg text-neutral-300 max-w-xl leading-relaxed">
                  {hero.heroDescription ?? hero.description}
                </p>
                {hero.heroSpecs.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 py-2 max-w-lg">
                    {hero.heroSpecs.map((spec) => (
                      <div
                        key={spec.key}
                        className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-md flex flex-col gap-0.5 hover:border-amber-400/30 transition-colors"
                      >
                        <span className="font-label-sm text-[10.5px] text-neutral-400 uppercase font-bold tracking-wider">
                          {spec.label}
                        </span>
                        <span className="font-headline-sm text-base text-white font-bold">
                          {spec.value}
                        </span>
                        {spec.hint ? (
                          <span className="font-label-sm text-[10px] text-amber-400 font-bold">
                            {spec.hint}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-4 pt-3">
                  <button
                    className="flex items-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-neutral-950 font-label-lg text-sm uppercase tracking-wider font-extrabold hover:brightness-110 shadow-[0_6px_25px_rgba(254,179,0,0.35)] hover:shadow-[0_8px_30px_rgba(254,179,0,0.5)] transition-all transform active:scale-95 disabled:opacity-50"
                    type="button"
                    onClick={() => {
                      if (hero) onOrderHero(hero.id);
                    }}
                    disabled={busy || !hero.isAvailable}
                  >
                    <MaterialIcon name="shopping_cart_checkout" className="text-xl" />
                    <span>
                      Hemen Sipariş Ver — {formatTryMinor(hero.basePriceMinor, hero.currency)}
                    </span>
                  </button>
                  <a
                    className="flex items-center gap-2.5 px-6 py-4 rounded-xl bg-white/[0.05] border border-white/10 hover:border-amber-400/40 hover:bg-white/[0.09] text-white font-label-lg text-sm uppercase font-bold transition-all backdrop-blur-md"
                    href="#menu-catalog"
                  >
                    <MaterialIcon
                      name="restaurant_menu"
                      className="text-lg text-amber-400"
                    />
                    <span>Tüm Menüyü Gör</span>
                  </a>
                </div>
              </>
            ) : (
              <p className="font-body-lg text-neutral-400">Vitrin ürünü henüz yok.</p>
            )}
          </div>
          <div className="w-full lg:w-5/12 flex justify-center relative">
            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
              <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-500/25 via-orange-500/15 to-red-600/10 blur-3xl" />
              <div className="relative w-full h-full flex items-center justify-center p-2">
                <img
                  className="w-full h-full object-cover rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(254,179,0,0.18)] border border-white/10 transform hover:scale-105 transition-transform duration-500"
                  alt={hero?.imageAlt ?? hero?.name ?? 'Burger Home Vitrin'}
                  src={hero?.heroImageUrl ?? '/storefront/assets/brand/hero-smash-golden.jpg'}
                />
              </div>
              {sold ? (
                <div className="absolute -top-3 -right-3 p-3 rounded-2xl bg-[#12141c]/90 border border-amber-400/30 backdrop-blur-xl shadow-2xl flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
                    <MaterialIcon name="award_star" className="text-xl" />
                  </div>
                  <div className="text-right">
                    <p className="font-label-sm text-[10px] uppercase font-bold tracking-wider text-amber-400">
                      Ayın En Çok Satanı
                    </p>
                    <p className="font-headline-sm text-sm text-white font-bold">{sold} Adet</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center lg:bottom-8">
            <HeroSliderControl
              slides={slides}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
            />
          </div>
        ) : null}
      </section>
      <section className="w-full bg-[#0d0f17] border-y border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin grid grid-cols-2 md:grid-cols-4 gap-4">
          {PROMISE_STRIP.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-400/30 hover:bg-white/[0.06] transition-all group"
            >
              <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-500/20 transition-all shadow-[0_0_12px_rgba(254,179,0,0.15)]">
                <MaterialIcon name={item.icon} className="text-2xl" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-xs font-bold text-white uppercase tracking-wider truncate">
                  {item.title}
                </span>
                <span className="font-body-sm text-xs text-neutral-400 line-clamp-1">
                  {item.body}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function splitHeroName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 3) {
    return (
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-secondary to-secondary-fixed-dim">
        {name}
      </span>
    );
  }
  const lead = parts.slice(0, 2).join(' ');
  const rest = parts.slice(2).join(' ');
  return (
    <>
      {lead} <br />
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-secondary to-secondary-fixed-dim">
        {rest}
      </span>
    </>
  );
}
