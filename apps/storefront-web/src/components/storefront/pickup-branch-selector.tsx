import type { z } from 'zod';

import type { branchSchema } from '../../lib/schemas';

type Branch = z.infer<typeof branchSchema>;

export function PickupBranchSelector({
  branches,
  selectedId,
  onSelect,
}: {
  branches: Branch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const open = branches.filter((item) => item.isAcceptingOrders);
  if (open.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-sans text-sm">
        Şu an gel-al için açık şube bulunmamaktadır.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {open.map((branch) => {
        const selected = branch.id === selectedId;
        return (
          <label
            key={branch.id}
            className={`flex flex-col gap-1.5 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
              selected
                ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(254,179,0,0.15)] text-white'
                : 'bg-[#0e111a]/90 border-white/[0.08] hover:border-white/[0.15] text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="pickup-branch"
                className="accent-amber-400 w-4 h-4 cursor-pointer"
                checked={selected}
                onChange={() => onSelect(branch.id)}
              />
              <span className="font-anton text-base uppercase tracking-wide text-white">
                {branch.name}
              </span>
            </div>
            <span className="text-neutral-400 text-xs pl-6 break-words font-sans">
              {branch.addressLine}
            </span>
            {branch.estimatedDeliveryMinutesMin !== undefined ? (
              <span className="font-anton text-amber-400 text-[11px] uppercase tracking-wider pl-6">
                Hazırlık {branch.estimatedDeliveryMinutesMin}-{branch.estimatedDeliveryMinutesMax} dk
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
