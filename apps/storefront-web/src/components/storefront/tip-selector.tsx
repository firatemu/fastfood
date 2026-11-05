import { formatTryMinor } from '../../lib/money';

export const TIP_PRESETS = ['0', '1500', '2500', '5000'] as const;

export function TipSelector({
  value,
  onChange,
  currency,
}: {
  value: string;
  onChange: (minor: string) => void;
  currency: string;
}) {
  const preset = TIP_PRESETS.includes(value as (typeof TIP_PRESETS)[number]);
  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <span className="font-anton text-sm uppercase text-neutral-200 tracking-wide">
          Kuryeye Teşekkür Bahşişi
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-anton text-[10px] tracking-wider uppercase font-bold">
          %100 Kuryenize İletilir
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TIP_PRESETS.map((minor) => {
          const isSelected = value === minor;
          return (
            <button
              key={minor}
              type="button"
              className={`py-2.5 px-3 rounded-xl font-anton text-xs sm:text-sm tracking-wide uppercase transition-all duration-200 border ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950 font-bold border-transparent shadow-[0_4px_16px_rgba(254,179,0,0.3)] scale-[1.02]'
                  : 'bg-[#0e111a]/90 border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/[0.2]'
              }`}
              onClick={() => onChange(minor)}
              data-ff-tip={minor}
            >
              {minor === '0' ? 'Yok' : `+${formatTryMinor(minor, currency).replace(' ₺', '')} TL`}
            </button>
          );
        })}
      </div>
      {!preset ? (
        <input
          className="mt-2.5 w-full bg-[#141824] border border-white/[0.1] text-white font-sans text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
          inputMode="numeric"
          value={(Number(value) / 100).toString()}
          onChange={(event) => {
            const major = Number(event.target.value);
            if (Number.isNaN(major) || major < 0) return;
            onChange(String(Math.round(major * 100)));
          }}
          placeholder="Özel bahşiş tutarı (TL)"
        />
      ) : (
        <button
          type="button"
          className="mt-2 font-anton text-xs uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
          onClick={() => onChange('1000')}
        >
          + Farklı bir tutar belirle
        </button>
      )}
    </div>
  );
}
