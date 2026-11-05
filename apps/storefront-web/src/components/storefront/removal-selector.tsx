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
    <div className="flex flex-col gap-space-sm p-5 md:p-6 rounded-2xl bg-[#12151f]/85 backdrop-blur-xl border border-white/[0.08] shadow-xl hover:border-white/15 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-white/[0.08] border border-white/15 text-neutral-200 font-anton text-sm flex items-center justify-center font-bold">
            {step}
          </span>
          <span className="font-anton text-xl text-white uppercase tracking-wide">
            Çıkarılmasını İstedikleriniz
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 font-label-sm text-xs text-neutral-400 uppercase tracking-wider">
          Damak Zevkine Göre
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-1">
        {options.map((option) => {
          const checked = selectedIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                checked
                  ? 'bg-red-500/10 border-red-500/40 text-neutral-200'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-neutral-300'
              }`}
            >
              <input
                className="w-4 h-4 rounded accent-red-400 cursor-pointer shrink-0"
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option.id)}
              />
              <span
                className={`font-body-sm text-sm break-words ${
                  checked ? 'line-through text-red-300/80' : 'text-neutral-200'
                }`}
              >
                {option.name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
