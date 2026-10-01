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
    <div className="flex flex-col gap-space-sm p-space-md rounded-2xl bg-surface-container shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm flex items-center justify-center">
            {step}
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface uppercase">Porsiyon / Boyut</span>
        </div>
        <span className="font-label-sm text-label-sm text-primary uppercase">Zorunlu Seçim</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
        {variants.map((variant) => {
          const checked = selectedId === variant.id;
          const delta = BigInt(variant.priceMinor) - BigInt(basePriceMinor);
          return (
            <label
              key={variant.id}
              className="relative flex flex-col p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container-high cursor-pointer transition-all has-[:checked]:bg-surface-container-high has-[:checked]:shadow-[inset_0_0_0_1.5px_#ff5722]"
            >
              <input
                className="ff-sr-only"
                type="radio"
                name="product-variant"
                checked={checked}
                onChange={() => onSelect(variant.id)}
              />
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-label-lg text-label-lg text-on-surface break-words">{variant.name}</span>
                <span className="w-4 h-4 rounded-full bg-surface-container flex items-center justify-center ring-1 ring-outline/40 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${checked ? 'bg-primary-container' : 'bg-transparent'}`} />
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {formatTryMinor(variant.priceMinor, currency)}
              </span>
              <span
                className={`font-label-md text-label-md mt-2 ${
                  delta > 0n ? 'text-primary' : 'text-secondary-container'
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
