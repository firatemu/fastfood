export function DeliveryScheduleSelector({
  mode,
  onMode,
  slots,
  scheduledFor,
  onScheduledFor,
  etaLabel,
}: {
  mode: 'asap' | 'scheduled';
  onMode: (mode: 'asap' | 'scheduled') => void;
  slots: Array<{ startAt: string; label: string }>;
  scheduledFor: string | null;
  onScheduledFor: (value: string) => void;
  etaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="relative flex items-center gap-3 p-3.5 rounded-lg bg-surface-container cursor-pointer hover:bg-surface-container-high">
          <input
            className="accent-secondary-container w-4 h-4 shrink-0"
            type="radio"
            name="delivery_time"
            checked={mode === 'asap'}
            onChange={() => onMode('asap')}
          />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md uppercase text-on-surface flex items-center gap-1.5">
              Hemen (En Hızlı)
              <span className="px-1.5 rounded bg-primary-container text-on-primary-container font-label-sm text-[10px]">
                Popüler
              </span>
            </span>
            <span className="font-body-sm text-primary-container font-semibold mt-0.5">{etaLabel}</span>
          </div>
        </label>
        <label className="relative flex items-center gap-3 p-3.5 rounded-lg bg-surface-container cursor-pointer hover:bg-surface-container-high">
          <input
            className="accent-secondary-container w-4 h-4 shrink-0"
            type="radio"
            name="delivery_time"
            checked={mode === 'scheduled'}
            onChange={() => onMode('scheduled')}
          />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md uppercase text-on-surface">İleri Bir Saate Planla</span>
            <span className="font-body-sm text-on-surface-variant mt-0.5">Şube saatlerine göre uygun slot</span>
          </div>
        </label>
      </div>
      {mode === 'scheduled' ? (
        slots.length === 0 ? (
          <p className="font-body-sm text-error">Şu an planlanabilir saat yok.</p>
        ) : (
          <select
            className="w-full bg-surface-container text-on-surface font-body-sm rounded px-3 py-2"
            value={scheduledFor ?? ''}
            onChange={(event) => onScheduledFor(event.target.value)}
            data-ff-schedule-slot
          >
            <option value="">Saat seçin</option>
            {slots.map((slot) => (
              <option key={slot.startAt} value={slot.startAt}>
                {slot.label}
              </option>
            ))}
          </select>
        )
      ) : null}
    </div>
  );
}
