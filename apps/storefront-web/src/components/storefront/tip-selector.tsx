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
    <div className="pt-space-sm">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-label-md text-label-md uppercase text-on-surface">Kuryeye Teşekkür Bahşişi</span>
        <span className="font-label-sm text-primary-container font-semibold">%100 kuryenize iletilir</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TIP_PRESETS.map((minor) => (
          <button
            key={minor}
            type="button"
            className={`py-2 px-3 rounded-lg font-label-md text-label-md ${
              value === minor
                ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
            onClick={() => onChange(minor)}
            data-ff-tip={minor}
          >
            {minor === '0' ? 'Yok' : `+${formatTryMinor(minor, currency).replace(' ₺', '')} TL`}
          </button>
        ))}
      </div>
      {!preset ? (
        <input
          className="mt-2 w-full bg-surface-container text-on-surface font-body-sm rounded px-3 py-2"
          inputMode="numeric"
          value={(Number(value) / 100).toString()}
          onChange={(event) => {
            const major = Number(event.target.value);
            if (Number.isNaN(major) || major < 0) return;
            onChange(String(Math.round(major * 100)));
          }}
        />
      ) : (
        <button
          type="button"
          className="mt-2 font-label-sm text-label-sm uppercase text-on-surface-variant"
          onClick={() => onChange('1000')}
        >
          Özel tutar
        </button>
      )}
    </div>
  );
}
