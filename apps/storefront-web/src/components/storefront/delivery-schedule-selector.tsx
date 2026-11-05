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
        <label
          className={`relative flex items-center gap-3.5 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
            mode === 'asap'
              ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(254,179,0,0.15)] text-white'
              : 'bg-[#0e111a]/90 border-white/[0.08] hover:border-white/[0.15] text-neutral-300'
          }`}
        >
          <input
            className="accent-amber-400 w-4 h-4 shrink-0 cursor-pointer"
            type="radio"
            name="delivery_time"
            checked={mode === 'asap'}
            onChange={() => onMode('asap')}
          />
          <div className="flex flex-col">
            <span className="font-anton text-sm uppercase text-white flex items-center gap-2 tracking-wide">
              Hemen (En Hızlı)
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950 font-anton text-[10px] tracking-wider uppercase font-bold shadow-sm">
                Popüler
              </span>
            </span>
            <span className="font-sans text-xs text-amber-400 font-semibold mt-1">
              {etaLabel}
            </span>
          </div>
        </label>
        <label
          className={`relative flex items-center gap-3.5 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
            mode === 'scheduled'
              ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(254,179,0,0.15)] text-white'
              : 'bg-[#0e111a]/90 border-white/[0.08] hover:border-white/[0.15] text-neutral-300'
          }`}
        >
          <input
            className="accent-amber-400 w-4 h-4 shrink-0 cursor-pointer"
            type="radio"
            name="delivery_time"
            checked={mode === 'scheduled'}
            onChange={() => onMode('scheduled')}
          />
          <div className="flex flex-col">
            <span className="font-anton text-sm uppercase text-white tracking-wide">
              İleri Bir Saate Planla
            </span>
            <span className="font-sans text-xs text-neutral-400 mt-1">
              Şube saatlerine göre uygun slot seçimi
            </span>
          </div>
        </label>
      </div>
      {mode === 'scheduled' ? (
        slots.length === 0 ? (
          <p className="font-sans text-sm text-rose-400 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            Şu an planlanabilir saat slotu bulunmuyor.
          </p>
        ) : (
          <select
            className="w-full bg-[#141824] border border-white/[0.1] text-white font-sans text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all cursor-pointer"
            value={scheduledFor ?? ''}
            onChange={(event) => onScheduledFor(event.target.value)}
            data-ff-schedule-slot
          >
            <option value="" className="bg-[#141824] text-neutral-400">
              Teslimat saati seçin
            </option>
            {slots.map((slot) => (
              <option key={slot.startAt} value={slot.startAt} className="bg-[#141824] text-white">
                {slot.label}
              </option>
            ))}
          </select>
        )
      ) : null}
    </div>
  );
}
