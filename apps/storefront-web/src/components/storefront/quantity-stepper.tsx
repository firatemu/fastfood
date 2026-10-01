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
          ? 'flex items-center bg-surface-container-highest rounded-lg p-1'
          : 'flex items-center gap-3 bg-surface-container-lowest px-3 py-1.5 rounded-xl'
      }
      role="group"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className={
          compact
            ? 'w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors disabled:opacity-40'
            : 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface active:scale-95 transition-all disabled:opacity-40'
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
            ? 'w-8 text-center font-label-md text-label-md text-on-surface'
            : 'font-label-lg text-label-lg text-on-surface w-6 text-center'
        }
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={
          compact
            ? 'w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors disabled:opacity-40'
            : 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface active:scale-95 transition-all disabled:opacity-40'
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
