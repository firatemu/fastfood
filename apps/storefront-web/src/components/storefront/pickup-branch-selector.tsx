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
    return <p className="font-body-sm text-error">Şu an gel-al için açık şube yok.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {open.map((branch) => {
        const selected = branch.id === selectedId;
        return (
          <label
            key={branch.id}
            className={`flex flex-col gap-1 p-space-sm rounded-lg cursor-pointer ${
              selected ? 'bg-surface-container-high shadow-[inset_0_0_0_1.5px_#feb300]' : 'bg-surface-container'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="pickup-branch"
                checked={selected}
                onChange={() => onSelect(branch.id)}
              />
              <span className="font-label-lg text-label-lg text-on-surface uppercase">{branch.name}</span>
            </div>
            <span className="font-body-sm text-on-surface-variant pl-6 break-words">{branch.addressLine}</span>
            {branch.estimatedDeliveryMinutesMin !== undefined ? (
              <span className="font-label-sm text-[11px] text-primary-container pl-6">
                Hazırlık {branch.estimatedDeliveryMinutesMin}-{branch.estimatedDeliveryMinutesMax} dk
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
