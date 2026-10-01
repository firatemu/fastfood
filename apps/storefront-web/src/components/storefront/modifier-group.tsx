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
    <div className="flex flex-col gap-space-sm p-space-md rounded-2xl bg-surface-container shadow-lg">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs min-w-0">
          <span
            className={`w-6 h-6 rounded-full font-label-sm text-label-sm flex items-center justify-center shrink-0 ${
              required
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-secondary-container text-on-secondary-container'
            }`}
          >
            {step}
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface uppercase truncate">
            {group.name}
          </span>
        </div>
        <span
          className={`font-label-sm text-label-sm uppercase shrink-0 ${
            required ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          {required ? 'Zorunlu Seçim' : 'İsteğe Bağlı'}
        </span>
      </div>
      {radio ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
          {group.modifiers.map((mod) => {
            const checked = selectedIds.includes(mod.id);
            return (
              <label
                key={mod.id}
                className="relative flex flex-col p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container-high cursor-pointer transition-all has-[:checked]:bg-surface-container-high has-[:checked]:shadow-[inset_0_0_0_1.5px_#ff5722]"
              >
                <input
                  className="ff-sr-only"
                  type="radio"
                  name={`modifier-${group.id}`}
                  checked={checked}
                  onChange={() => onToggle(mod.id)}
                />
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="font-label-lg text-label-lg text-on-surface break-words">{mod.name}</span>
                  <span className="w-4 h-4 rounded-full bg-surface-container flex items-center justify-center ring-1 ring-outline/40 shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full ${checked ? 'bg-primary-container' : 'bg-transparent'}`}
                    />
                  </span>
                </div>
                <span
                  className={`font-label-md text-label-md mt-2 ${
                    BigInt(mod.priceDeltaMinor) > 0n ? 'text-primary' : 'text-secondary-container'
                  }`}
                >
                  {formatDeltaMinor(mod.priceDeltaMinor, currency)}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          {group.modifiers.map((mod) => {
            const checked = selectedIds.includes(mod.id);
            return (
              <label
                key={mod.id}
                className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container-high cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    className="w-5 h-5 rounded accent-primary-container cursor-pointer shrink-0"
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(mod.id)}
                  />
                  <span className="font-label-md text-label-md text-on-surface break-words">{mod.name}</span>
                </div>
                <span
                  className={`font-label-md text-label-md shrink-0 ${
                    BigInt(mod.priceDeltaMinor) > 0n ? 'text-primary' : 'text-secondary-container'
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
        <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1">
          <MaterialIcon name="info" className="text-sm" />
          En fazla {group.selectionMax} seçim
        </p>
      ) : null}
    </div>
  );
}
