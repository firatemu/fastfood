'use client';

import { isRadioGroup, isRequiredGroup, type ModifierGroup } from '../../lib/modifiers';
import { formatDeltaMinor } from '../../lib/money';

import { MaterialIcon } from './material-icon';

export function ModifierGroupCard({
  group,
  step,
  selectedIds,
  onToggle,
  currency,
}: {
  group: ModifierGroup;
  step: number;
  selectedIds: string[];
  onToggle: (modifierId: string) => void;
  currency: string;
}) {
  const required = isRequiredGroup(group);
  const radio = isRadioGroup(group);

  return (
    <div className="flex flex-col gap-space-sm p-5 md:p-6 rounded-2xl bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] shadow-xl hover:border-white/15 transition-all">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-7 h-7 rounded-lg font-anton text-sm flex items-center justify-center font-bold shrink-0 ${
              required
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-neutral-950 shadow-[0_2px_10px_rgba(254,179,0,0.4)]'
                : 'bg-white/[0.08] border border-white/15 text-neutral-200'
            }`}
          >
            {step}
          </span>
          <span className="font-anton text-xl text-white uppercase tracking-wide truncate">
            {group.name}
          </span>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full font-label-sm text-xs uppercase tracking-wider shrink-0 ${
            required
              ? 'bg-amber-500/15 border border-amber-400/30 text-amber-400 font-bold'
              : 'bg-white/[0.05] border border-white/10 text-neutral-400'
          }`}
        >
          {required ? 'Zorunlu Seçim' : 'İsteğe Bağlı'}
        </span>
      </div>
      {radio ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-1">
          {group.modifiers.map((mod) => {
            const checked = selectedIds.includes(mod.id);
            return (
              <label
                key={mod.id}
                className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                  checked
                    ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_20px_rgba(254,179,0,0.18)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-amber-400/30 hover:bg-white/[0.06]'
                }`}
              >
                <input
                  className="ff-sr-only"
                  type="radio"
                  name={`modifier-${group.id}`}
                  checked={checked}
                  onChange={() => onToggle(mod.id)}
                />
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="font-label-lg text-label-lg text-white font-semibold break-words">
                    {mod.name}
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
                <span
                  className={`font-anton text-base mt-2 ${
                    BigInt(mod.priceDeltaMinor) > 0n ? 'text-amber-400' : 'text-neutral-400 font-body-sm text-sm'
                  }`}
                >
                  {formatDeltaMinor(mod.priceDeltaMinor, currency)}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-1">
          {group.modifiers.map((mod) => {
            const checked = selectedIds.includes(mod.id);
            return (
              <label
                key={mod.id}
                className={`flex items-center justify-between gap-space-sm p-3.5 rounded-xl border transition-all cursor-pointer ${
                  checked
                    ? 'bg-amber-500/10 border-amber-400/60 shadow-[0_0_15px_rgba(254,179,0,0.12)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-amber-400/30 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    className="w-4 h-4 rounded accent-amber-400 cursor-pointer shrink-0"
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(mod.id)}
                  />
                  <span className="font-label-md text-label-md text-white font-medium break-words">
                    {mod.name}
                  </span>
                </div>
                <span
                  className={`font-anton text-base shrink-0 ${
                    BigInt(mod.priceDeltaMinor) > 0n ? 'text-amber-400' : 'text-neutral-400 font-body-sm text-sm'
                  }`}
                >
                  {formatDeltaMinor(mod.priceDeltaMinor, currency)}
                </span>
              </label>
            );
          })}
        </div>
      )}
      {group.selectionMax > 1 ? (
        <p className="font-body-sm text-xs text-neutral-400 flex items-center gap-1.5 pt-1">
          <MaterialIcon name="info" className="text-sm text-amber-400/70" />
          <span>En fazla {group.selectionMax} seçim yapabilirsiniz</span>
        </p>
      ) : null}
    </div>
  );
}
