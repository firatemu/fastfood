'use client';

import type { BranchView, NetworkFacts } from '../../../lib/storefront/branch-finder';
import { MaterialIcon } from '../material-icon';

export function BranchPass({
  views,
  facts,
  focusId,
  located: _located,
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

  // Top spotlight branches for quick jump
  const spotlightBranches = views.slice(0, 6);

  return (
    <section aria-labelledby="branches-hero" className="relative overflow-hidden pt-4 pb-8 sm:pb-12">
      {/* Background ambient glowing spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(254,179,0,0.16),rgba(255,255,255,0))] blur-2xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          {/* Flame pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-anton text-xs uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(254,179,0,0.12)]">
            <MaterialIcon name="local_fire_department" className="text-base text-amber-400" filled />
            <span>BURGER HOME · LEZZET AĞI</span>
          </div>

          <h1
            id="branches-hero"
            className="font-anton text-4xl sm:text-5xl md:text-6xl uppercase tracking-wide text-white leading-[1.05] drop-shadow-sm"
          >
            SİPARİŞİNİ NEREDEN <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
              ALMAK İSTERSİN?
            </span>
          </h1>

          <p className="mt-4 text-neutral-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-sans">
            Türkiye genelinde <span className="text-white font-semibold">{facts.cityCount} şehirde {branchCount} gurme lezzet durağı</span>. 
            Alevli döküm ızgara lezzetine en yakın noktadan ulaşın veya gel-al avantajıyla siparişinizi teslim alın.
          </p>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full mt-8">
            <div className="bg-[#12151f]/80 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg hover:border-amber-400/30 transition-all">
              <span className="font-anton text-2xl sm:text-3xl text-amber-400 leading-none">{branchCount}</span>
              <span className="font-anton text-[11px] sm:text-xs text-neutral-400 uppercase tracking-wider mt-1.5">
                Gurme Şube
              </span>
            </div>

            <div className="bg-[#12151f]/80 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg hover:border-amber-400/30 transition-all">
              <span className="font-anton text-2xl sm:text-3xl text-white leading-none">{cityCount}</span>
              <span className="font-anton text-[11px] sm:text-xs text-neutral-400 uppercase tracking-wider mt-1.5">
                Hizmet Şehri
              </span>
            </div>

            <div className="bg-[#12151f]/80 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg hover:border-amber-400/30 transition-all">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    Number(openCount) > 0 ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-neutral-500'
                  }`}
                />
                <span className="font-anton text-2xl sm:text-3xl text-white leading-none">{openCount}</span>
              </div>
              <span className="font-anton text-[11px] sm:text-xs text-neutral-400 uppercase tracking-wider mt-1.5">
                Şu An Açık
              </span>
            </div>

            <div className="bg-[#12151f]/80 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg hover:border-amber-400/30 transition-all">
              <span className="font-anton text-2xl sm:text-3xl text-orange-400 leading-none">280°C</span>
              <span className="font-anton text-[11px] sm:text-xs text-neutral-400 uppercase tracking-wider mt-1.5">
                Alevli Döküm
              </span>
            </div>
          </div>
        </div>

        {/* Quick branch quick-jump carousel / chips */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2 px-1">
            <span className="font-anton text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <MaterialIcon name="explore" className="text-sm text-amber-400" />
              Öne Çıkan Şubelerimiz
            </span>
            <span className="text-neutral-500 text-xs font-sans">Şubeyi seçip doğrudan karta gidin</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {spotlightBranches.map((branch) => {
              const isSelected = focusId === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  data-ff-pass-unit={branch.id}
                  data-ff-open={branch.status.open ? 'true' : 'false'}
                  onClick={() => onPick(branch.id)}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_15px_rgba(254,179,0,0.2)]'
                      : 'bg-[#12151f]/90 border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/[0.2]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      branch.status.open
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-neutral-600'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="font-anton text-xs uppercase tracking-wide text-white leading-tight">
                      {branch.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-sans leading-tight">
                      {branch.district ? `${branch.district} · ${branch.city}` : branch.city}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
