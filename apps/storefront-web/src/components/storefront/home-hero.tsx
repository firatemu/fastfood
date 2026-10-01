'use client';

import { useEffect, useState } from 'react';

import { formatTryMinor } from '../../lib/money';
import { GRILL_LIVE_LABEL, HERO_FLOAT_FIRE, PROMISE_STRIP } from '../../lib/storefront/brand-copy';
import {
  formatDeliveryWindow,
  formatExpressLabel,
  formatHappyCustomers,
  formatRatingBps,
  formatSoldCount,
} from '../../lib/storefront/format';
import type { StorefrontHome } from '../../lib/storefront/home';

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
  const atFirstSlide = activeIndex === 0;
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
  const rating = formatRatingBps(home.socialProof.averageRatingBps);
  const customers = formatHappyCustomers(home.socialProof.happyCustomerCount);
  const sold = hero ? formatSoldCount(hero.soldCount) : '';
  const approvalPct =
    home.socialProof.averageRatingBps !== null
      ? Math.round((home.socialProof.averageRatingBps / 100) * 20)
      : null;

  return (
    <>
      <section
        className="relative w-full -mt-20 overflow-hidden bg-surface-container-lowest"
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
          <div className="absolute -top-32 left-1/4 w-[650px] h-[650px] bg-primary-container/15 rounded-full blur-[130px]" />
          <div className="absolute top-1/3 -right-28 w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-[120px]" />
          <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
            <circle className="animate-pulse" cx="15%" cy="30%" fill="#ff5722" r="2" />
            <circle cx="28%" cy="65%" fill="#feb300" r="1.5" />
            <circle className="animate-pulse" cx="82%" cy="20%" fill="#ff5722" r="2.5" />
            <circle cx="65%" cy="75%" fill="#ffd799" r="1.8" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-margin-sm lg:px-margin pt-32 pb-space-xl lg:pb-32 flex flex-col lg:flex-row items-center justify-between gap-space-xl">
          <div className="w-full lg:w-7/12 flex flex-col gap-space-md z-10">
            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high text-primary-container shadow-md">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
                <span className="font-label-sm text-label-sm uppercase tracking-wider">
                  {GRILL_LIVE_LABEL}
                </span>
              </div>
              {eta && home.branch ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  <MaterialIcon name="timer" className="text-primary text-base" />
                  <span>
                    {formatExpressLabel(home.branch.name)}:{' '}
                    <strong className="text-on-surface">{eta}</strong>
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  Teslimat adresi seçilmedi
                </div>
              )}
            </div>
            {hero ? (
              <>
                <div className="flex flex-col">
                  {hero.eyebrow ? (
                    <span className="font-headline-md text-headline-md text-secondary-fixed-dim uppercase tracking-widest">
                      {hero.eyebrow}
                    </span>
                  ) : null}
                  <h1 className="font-headline-xl text-headline-xl uppercase text-on-surface tracking-normal leading-[1.02] drop-shadow-xl mt-1">
                    {splitHeroName(hero.name)}
                  </h1>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                  {hero.heroDescription ?? hero.description}
                </p>
                {hero.heroSpecs.length > 0 ? (
                  <div className="grid grid-cols-3 gap-space-sm py-space-sm max-w-lg">
                    {hero.heroSpecs.map((spec) => (
                      <div
                        key={spec.key}
                        className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-0.5"
                      >
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          {spec.label}
                        </span>
                        <span className="font-headline-sm text-headline-sm text-on-surface">
                          {spec.value}
                        </span>
                        {spec.hint ? (
                          <span className="font-label-sm text-[10px] text-primary">{spec.hint}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-space-md pt-2">
                  <button
                    className="flex items-center gap-3 px-space-xl py-3.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-label-lg uppercase tracking-wider hover:brightness-110 shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
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
                    className="flex items-center gap-2 px-space-lg py-3.5 rounded-lg bg-surface-container-high text-on-surface font-label-lg text-label-lg uppercase hover:bg-surface-bright transition-all"
                    href="#menu-catalog"
                  >
                    <MaterialIcon name="restaurant_menu" className="text-lg text-primary-container" />
                    <span>Tüm Menüyü Gör</span>
                  </a>
                </div>
                {slides.length > 1 ? (
                  <nav
                    className="flex items-center gap-2 pt-space-sm"
                    aria-label="Vitrin slaytları"
                  >
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-md border border-white/15 bg-surface-container text-on-surface transition-colors hover:border-secondary-container hover:text-secondary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Önceki vitrin ürünü"
                      disabled={!settings.loop && atFirstSlide}
                      onClick={() =>
                        setActiveIndex((current) => {
                          if (current > 0) return current - 1;
                          return settings.loop ? slides.length - 1 : 0;
                        })
                      }
                    >
                      <MaterialIcon name="chevron_left" className="text-xl" />
                    </button>
                    <div
                      className="flex items-center gap-1.5"
                      role="group"
                      aria-label="Slayt seçimi"
                    >
                      {slides.map((slide, index) => (
                        <button
                          key={slide.id}
                          type="button"
                          className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container ${
                            index === activeIndex
                              ? 'w-7 bg-secondary-container'
                              : 'w-2 bg-white/35 hover:bg-white/65'
                          }`}
                          aria-label={`${index + 1}. slayt: ${slide.name}`}
                          aria-current={index === activeIndex ? 'true' : undefined}
                          onClick={() => setActiveIndex(index)}
                        />
                      ))}
                    </div>
                    <span
                      className="font-label-sm text-label-sm tabular-nums text-on-surface-variant"
                    >
                      {String(Math.min(activeIndex + 1, slides.length)).padStart(2, '0')} /{' '}
                      {String(slides.length).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-md border border-white/15 bg-surface-container text-on-surface transition-colors hover:border-secondary-container hover:text-secondary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Sonraki vitrin ürünü"
                      disabled={!settings.loop && atLastSlide}
                      onClick={() =>
                        setActiveIndex((current) => {
                          if (current < slides.length - 1) return current + 1;
                          return settings.loop ? 0 : current;
                        })
                      }
                    >
                      <MaterialIcon name="chevron_right" className="text-xl" />
                    </button>
                  </nav>
                ) : null}
              </>
            ) : (
              <p className="font-body-lg text-on-surface-variant">Vitrin ürünü henüz yok.</p>
            )}
            <div className="flex items-center gap-space-md pt-space-xs text-on-surface-variant">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-label-sm text-on-surface">
                  ★
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary font-label-sm flex items-center justify-center">
                  {approvalPct ?? '★'}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-label-sm flex items-center justify-center">
                  %
                </div>
              </div>
              <span className="font-body-sm text-body-sm">
                {rating ? (
                  <>
                    İstanbul genelinde <strong className="text-on-surface">{rating}/5 puan</strong>
                    {customers ? ` ve ${customers} mutlu burger sever` : null}
                  </>
                ) : (
                  'İlk değerlendirmeler yayımlandığında burada görünecek.'
                )}
              </span>
            </div>
          </div>
          <div className="w-full lg:w-5/12 flex justify-center relative">
            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary-container/30 to-secondary-container/20 blur-3xl" />
              <div className="relative w-full h-full flex items-center justify-center">
                {hero?.imageUrl ? (
                  <img
                    className="w-full h-full object-contain filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.9)] transform hover:scale-105 transition-transform duration-500"
                    alt={hero.imageAlt ?? hero.name}
                    src={hero.imageUrl}
                  />
                ) : null}
              </div>
              <div className="absolute -bottom-2 -left-3 p-space-sm rounded-xl bg-surface-container/90 backdrop-blur-xl shadow-2xl flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-surface-container-high text-secondary-container">
                  <MaterialIcon name="local_fire_department" className="text-2xl" filled />
                </div>
                <div>
                  <p className="font-headline-sm text-headline-sm text-on-surface leading-none">
                    {HERO_FLOAT_FIRE.title}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{HERO_FLOAT_FIRE.body}</p>
                </div>
              </div>
              {sold ? (
                <div className="absolute -top-2 -right-2 p-space-sm rounded-xl bg-surface-container/90 backdrop-blur-xl shadow-2xl flex items-center gap-2">
                  <MaterialIcon name="award_star" className="text-primary text-xl" />
                  <div className="text-right">
                    <p className="font-label-sm text-label-sm uppercase text-primary">Ayın En Çok Satanı</p>
                    <p className="font-headline-sm text-headline-sm text-on-surface">{sold} Adet</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <section className="w-full bg-surface-container-low py-space-md">
        <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin grid grid-cols-2 md:grid-cols-4 gap-space-md">
          {PROMISE_STRIP.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <MaterialIcon name={item.icon} className={`text-3xl ${item.iconClass}`} />
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface uppercase">{item.title}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{item.body}</span>
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
    return <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-secondary to-secondary-fixed-dim">{name}</span>;
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
