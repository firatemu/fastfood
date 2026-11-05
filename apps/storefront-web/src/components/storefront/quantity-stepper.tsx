'use client';

import { MaterialIcon } from './material-icon';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  labelledBy,
  size = 'default',
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  labelledBy?: string;
  size?: 'default' | 'compact';
}) {
  const compact = size === 'compact';
  return (
    <div
      className={
        compact
          ? 'flex items-center bg-white/[0.06] border border-white/10 rounded-lg p-1'
          : 'flex items-center gap-3 bg-[#0d1017] border border-white/10 px-3 py-1.5 rounded-xl shadow-inner'
      }
      role="group"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className={
          compact
            ? 'w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-40'
            : 'w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-amber-400 hover:text-neutral-950 text-neutral-200 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-white/[0.06] disabled:hover:text-neutral-200 cursor-pointer'
        }
        aria-label="Azalt"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <MaterialIcon name="remove" className={compact ? 'text-sm' : 'text-base'} />
      </button>
      <span
        className={
          compact
            ? 'w-8 text-center font-anton text-sm text-white'
            : 'font-anton text-lg text-white w-7 text-center'
        }
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={
          compact
            ? 'w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-40'
            : 'w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-amber-400 hover:text-neutral-950 text-neutral-200 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-white/[0.06] disabled:hover:text-neutral-200 cursor-pointer'
        }
        aria-label="Artır"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <MaterialIcon name="add" className={compact ? 'text-sm' : 'text-base'} />
      </button>
    </div>
  );
}
