'use client';

import { formatDeltaMinor, formatTryMinor } from '../../lib/money';

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
  currency,
  basePriceMinor,
  step,
}: {
  variants: ReadonlyArray<{ id: string; name: string; priceMinor: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  currency: string;
  basePriceMinor: string;
  step: number;
}) {
  if (variants.length <= 1) return null;

  return (
    <div className="flex flex-col gap-space-sm p-5 md:p-6 rounded-2xl bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] shadow-xl hover:border-white/15 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-neutral-950 font-anton text-sm flex items-center justify-center font-bold shadow-[0_2px_10px_rgba(254,179,0,0.4)]">
            {step}
          </span>
          <span className="font-anton text-xl text-white uppercase tracking-wide">
            Porsiyon / Boyut
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 font-label-sm text-xs text-amber-400 font-bold uppercase tracking-wider">
          Zorunlu Seçim
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-1">
        {variants.map((variant) => {
          const checked = selectedId === variant.id;
          const delta = BigInt(variant.priceMinor) - BigInt(basePriceMinor);
          return (
            <label
              key={variant.id}
              className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                checked
                  ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_20px_rgba(254,179,0,0.18)]'
                  : 'bg-white/[0.03] border-white/10 hover:border-amber-400/30 hover:bg-white/[0.06]'
              }`}
            >
              <input
                className="ff-sr-only"
                type="radio"
                name="product-variant"
                checked={checked}
                onChange={() => onSelect(variant.id)}
              />
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-label-lg text-label-lg text-white font-semibold break-words">
                  {variant.name}
                </span>
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    checked
                      ? 'bg-amber-500/20 border border-amber-400'
                      : 'bg-white/5 border border-white/20'
                  }`}
                >
                  {checked ? (
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_6px_rgba(254,179,0,0.8)]" />
                  ) : null}
                </span>
              </div>
              <span className="font-body-sm text-xs text-neutral-400">
                {formatTryMinor(variant.priceMinor, currency)}
              </span>
              <span
                className={`font-anton text-base mt-2 ${
                  delta > 0n ? 'text-amber-400' : 'text-neutral-400 font-body-sm text-sm'
                }`}
              >
                {delta === 0n ? 'Dahil' : formatDeltaMinor(delta.toString(), currency)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
