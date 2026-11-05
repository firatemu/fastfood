'use client';

import Link from 'next/link';

import { MaterialIcon } from './material-icon';

export function HomeClubTeaser() {
  return (
    <section className="w-full max-w-7xl mx-auto px-margin-sm lg:px-margin py-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181d2c]/95 via-[#121622]/95 to-[#0b0d14]/95 border border-amber-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(254,179,0,0.12)] p-6 md:p-10 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        {/* Ambient background glows */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-amber-500/15 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-orange-600/15 blur-[90px] pointer-events-none" />

        {/* Left: Content */}
        <div className="relative z-10 w-full lg:w-7/12 flex flex-col gap-5">
          <div className="flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/25 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(254,179,0,0.8)]" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-amber-400 font-bold">
              Burger Home Club & Ateş Çarkı
            </span>
          </div>

          <div>
            <h2 className="font-anton text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white leading-tight">
              HER SİPARİŞTE <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">BURGER PUAN</span>, <br className="hidden sm:inline" />
              HER GÜN <span className="text-amber-400">ATEŞ ÇARKI!</span>
            </h2>
            <p className="mt-3 text-neutral-300 font-body-md text-sm md:text-base leading-relaxed max-w-xl">
              Burger severlere özel sadakat programımızla her alışverişinizde %10 puan biriktirin.
              Ateş Çarkıfelek&apos;i çevirerek bedava gurme burgerler, çıtır atıştırmalıklar ve sürpriz indirimler kazanın.
            </p>
          </div>

          {/* Feature chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <MaterialIcon name="casino" className="text-xl" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-white font-bold">Günlük Çark</span>
                <span className="text-xs text-neutral-400">Günde 1 bedava hak</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <MaterialIcon name="stars" className="text-xl" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-white font-bold">%10 İade</span>
                <span className="text-xs text-neutral-400">Her siparişte puan</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <MaterialIcon name="military_tech" className="text-xl" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-white font-bold">VIP Ayrıcalık</span>
                <span className="text-xs text-neutral-400">Özel şef ikramları</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/account/spin"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 font-label-md text-label-md uppercase tracking-wider font-bold shadow-[0_4px_20px_rgba(254,179,0,0.35)] hover:brightness-110 hover:shadow-[0_6px_25px_rgba(254,179,0,0.45)] transition-all flex items-center gap-2"
            >
              <MaterialIcon name="local_fire_department" className="text-xl" />
              <span>Ateş Çarkı&apos;nı Çevir</span>
            </Link>
            <Link
              href="/account/club"
              className="px-6 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-label-md text-label-md uppercase tracking-wider font-semibold transition-all hover:border-white/20 flex items-center gap-2"
            >
              <MaterialIcon name="loyalty" className="text-lg text-amber-400" />
              <span>Club Avantajları</span>
            </Link>
          </div>
        </div>

        {/* Right: 3D Visual Stage */}
        <div className="relative z-10 w-full lg:w-5/12 flex justify-center">
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden border border-amber-400/30 bg-neutral-950/70 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(254,179,0,0.2)] group">
            <img
              src="/storefront/assets/brand/club-wheel-promo.jpg"
              alt="Burger Home Club Ateş Çarkıfelek"
              className="w-full h-72 md:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-neutral-900/90 backdrop-blur-md border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <MaterialIcon name="redeem" className="text-base" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Hediye Havuzu</span>
                  <span className="text-[11px] text-neutral-400">Ücretsiz Menüler & Soslar</span>
                </div>
              </div>
              <span className="text-xs font-anton text-amber-400 uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-400/10 border border-amber-400/25">
                HEMEN ÇEVİR
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
