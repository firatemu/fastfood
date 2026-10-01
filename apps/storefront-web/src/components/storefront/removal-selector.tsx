'use client';

export function RemovalSelector({
  options,
  selectedIds,
  onToggle,
  step,
}: {
  options: ReadonlyArray<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  step: number;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-space-sm p-space-md rounded-2xl bg-surface-container shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="w-6 h-6 rounded-full bg-surface-bright text-on-surface font-label-sm text-label-sm flex items-center justify-center">
            {step}
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
            Çıkarılmasını İstedikleriniz
          </span>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Damak Zevkine Göre</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container-high cursor-pointer transition-all"
          >
            <input
              className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
              type="checkbox"
              checked={selectedIds.includes(option.id)}
              onChange={() => onToggle(option.id)}
            />
            <span className="font-body-sm text-body-sm text-on-surface break-words">{option.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
