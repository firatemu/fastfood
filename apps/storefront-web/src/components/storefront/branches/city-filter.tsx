'use client';

export type CityOption = {
  key: string;
  label: string;
  count: number;
};

export function CityFilter({
  options,
  active,
  onSelect,
}: {
  options: CityOption[];
  active: string;
  onSelect: (key: string) => void;
}): React.ReactElement {
  return (
    <nav
      aria-label="Şehir filtresi"
      className="border-b border-outline-variant/30 bg-background"
    >
      <div className="max-w-7xl mx-auto px-margin-sm lg:px-margin">
        <div
          role="tablist"
          className="-mb-px flex gap-1 overflow-x-auto py-space-sm"
        >
          {options.map((opt) => {
            const isActive = active === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(opt.key)}
                className={`relative shrink-0 px-space-sm py-space-xs font-label-md uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-secondary-container'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {opt.label}
                <span
                  className={`ml-1.5 tabular-nums text-[10px] ${
                    isActive ? 'text-secondary-container/70' : 'text-on-surface-variant/60'
                  }`}
                >
                  {opt.count}
                </span>
                <span
                  aria-hidden
                  className={`absolute inset-x-space-sm -bottom-px h-0.5 transition-colors ${
                    isActive ? 'bg-secondary-container' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
