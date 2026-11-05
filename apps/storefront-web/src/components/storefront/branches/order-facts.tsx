'use client';

import { formatPriceMinor } from '../../../lib/money';
import type { NetworkFacts } from '../../../lib/storefront/branch-finder';
import { MaterialIcon } from '../material-icon';

export function OrderFacts({ facts, eta }: { facts: NetworkFacts; eta: string | null }) {
  return (
    <section
      aria-label="Sipariş kuralları"
      data-ff-order-facts
      className="rounded-2xl border border-white/[0.08] bg-[#12151f]/85 backdrop-blur-xl p-5 sm:p-6 shadow-xl relative overflow-hidden"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MaterialIcon name="verified_user" className="text-lg" filled />
          </div>
          <div>
            <h2 className="font-anton text-lg uppercase text-white tracking-wide">
              Sipariş & Teslimat Standartlarımız
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              Tüm şubelerimizde geçerli ortak sipariş ve servis prensipleri
            </p>
          </div>
        </div>
        <span className="font-anton text-xs uppercase tracking-wider text-amber-400 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 self-start md:self-auto">
          Güvenli & Hızlı Servis
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Min Sepet */}
        <div className="p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MaterialIcon name="shopping_bag" className="text-xl" />
          </div>
          <div className="min-w-0">
            <span className="block font-anton text-[10px] uppercase tracking-wider text-neutral-400">
              Min. Sepet Tutarı
            </span>
            <span className="font-anton text-base text-white mt-0.5 block truncate">
              {facts.minOrderMinor ? formatPriceMinor(facts.minOrderMinor, 'TRY') : '₺50,00'}
            </span>
          </div>
        </div>

        {/* Teslimat Ücreti */}
        <div className="p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MaterialIcon name="local_shipping" className="text-xl" />
          </div>
          <div className="min-w-0">
            <span className="block font-anton text-[10px] uppercase tracking-wider text-neutral-400">
              Teslimat Ücreti
            </span>
            <span className="font-anton text-base text-emerald-400 mt-0.5 block truncate">
              {facts.deliveryFeeMinor ? formatPriceMinor(facts.deliveryFeeMinor, 'TRY') : '₺15,00'}
            </span>
          </div>
        </div>

        {/* Ortalama Hazırlık */}
        <div className="p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MaterialIcon name="timer" className="text-xl" />
          </div>
          <div className="min-w-0">
            <span className="block font-anton text-[10px] uppercase tracking-wider text-neutral-400">
              Ortalama Süre
            </span>
            <span className="font-anton text-base text-amber-400 mt-0.5 block truncate">
              {eta ?? '25-35 dk'}
            </span>
          </div>
        </div>

        {/* Müşteri Hizmetleri */}
        <div className="p-3.5 rounded-xl bg-[#0e111a]/90 border border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <MaterialIcon name="headset_mic" className="text-xl" />
          </div>
          <div className="min-w-0">
            <span className="block font-anton text-[10px] uppercase tracking-wider text-neutral-400">
              Çağrı Merkezi
            </span>
            <a
              href={`tel:${facts.phone ?? '4441399'}`}
              className="font-anton text-base text-white hover:text-amber-400 transition-colors mt-0.5 block truncate"
            >
              {facts.phoneLabel || '444 1 399'}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
